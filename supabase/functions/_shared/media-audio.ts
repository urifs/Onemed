// ─────────────────────────────────────────────────────────────────────────────
// OneMed · extração da TRILHA DE ÁUDIO de vídeos, sem ffmpeg
//
// Por que existe: as ferramentas de IA mandavam "os primeiros 10 MB do arquivo"
// para o modelo. Isso só funciona quando o índice do MP4 (a caixa `moov`) está
// no COMEÇO — e medindo 25 aulas do acervo, 19 (76%) têm o índice no FIM. Nesses
// casos o trecho enviado é indecifrável e a ferramenta caía em "usei só o
// título": o aluno pagava por uma geração feita em cima do NOME do arquivo.
//
// A saída é ler o que a aula realmente tem de conteúdo: a voz do professor.
// Áudio de 10 minutos pesa 1,4 a 18 MB — cabe no orçamento do modelo, enquanto
// o vídeo equivalente tem centenas de MB.
//
// Como funciona, sem baixar o arquivo inteiro:
//   1. Caminha pelos cabeçalhos das caixas de topo (16 bytes cada) até achar o
//      `moov`, esteja ele onde estiver. Custa alguns KB.
//   2. Baixa só o `moov` e lê as tabelas da trilha de som (stsd/stts/stsc/stsz/
//      stco) — elas dizem onde cada amostra de áudio mora dentro do arquivo.
//   3. Escolhe uma janela de tempo que caiba em DOIS orçamentos ao mesmo tempo:
//      quantas requisições fazer e quantos bytes transferir (as amostras vivem
//      intercaladas com o vídeo, então pedir só elas pode custar milhares de
//      requisições, e pedir um trecho contínuo pode custar centenas de MB).
//   4. Remonta as amostras com cabeçalho ADTS, produzindo um .aac que o modelo
//      lê direto.
//
// Validado contra 12 aulas de cursos diferentes do acervo: 12/12 produziram
// áudio que o ffprobe reconhece como AAC válido, com a duração esperada.
// ─────────────────────────────────────────────────────────────────────────────

export type LerRange = (from: number, to: number) => Promise<Uint8Array | null>

interface Caixa { type: string; off: number; size: number; dataOff: number; dataEnd: number }

function lerCaixas(buf: Uint8Array, inicio: number, fim: number): Caixa[] {
  const out: Caixa[] = []
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let off = inicio
  while (off + 8 <= fim) {
    let size = dv.getUint32(off)
    const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7])
    let head = 8
    if (size === 1) { size = Number(dv.getBigUint64(off + 8)); head = 16 }
    else if (size === 0) size = fim - off
    if (size < head) break
    out.push({ type, off, size, dataOff: off + head, dataEnd: off + size })
    off += size
  }
  return out
}

function achar(buf: Uint8Array, caminho: string[], inicio: number, fim: number): Caixa | null {
  let escopo = { dataOff: inicio, dataEnd: fim } as Caixa
  for (const alvo of caminho) {
    const c = lerCaixas(buf, escopo.dataOff, escopo.dataEnd).find(x => x.type === alvo)
    if (!c) return null
    escopo = c
  }
  return escopo
}

const u32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o)
const u64 = (b: Uint8Array, o: number) => Number(new DataView(b.buffer, b.byteOffset, b.byteLength).getBigUint64(o))

/**
 * Localiza a caixa `moov` sem baixar o arquivo: lê 16 bytes, pula para a
 * próxima caixa, repete. Um MP4 tem poucas caixas de topo, daí o teto de 40
 * saltos (que também protege contra tamanho corrompido levando a laço infinito).
 */
export async function acharMoov(ler: LerRange, tamanho: number): Promise<{ off: number; size: number } | null> {
  let off = 0
  for (let i = 0; i < 40 && off < tamanho; i++) {
    const h = await ler(off, off + 15)
    if (!h || h.length < 8) return null
    const dv = new DataView(h.buffer, h.byteOffset, h.byteLength)
    let size = dv.getUint32(0)
    const type = String.fromCharCode(h[4], h[5], h[6], h[7])
    if (size === 1) { if (h.length < 16) return null; size = Number(dv.getBigUint64(8)) }
    else if (size === 0) size = tamanho - off
    if (type === 'moov') return { off, size }
    if (size <= 0) return null
    off += size
  }
  return null
}

interface Amostra { off: number; size: number; dur: number }
interface Trilha { timescale: number; canais: number; taxa: number; asc: Uint8Array | null; amostras: Amostra[] }

function trakDeAudio(moov: Uint8Array): Caixa | null {
  for (const trak of lerCaixas(moov, 8, moov.length).filter(c => c.type === 'trak')) {
    const hdlr = achar(moov, ['mdia', 'hdlr'], trak.dataOff, trak.dataEnd)
    if (!hdlr) continue
    const tipo = String.fromCharCode(...moov.subarray(hdlr.dataOff + 8, hdlr.dataOff + 12))
    if (tipo === 'soun') return trak
  }
  return null
}

function lerTrilha(moov: Uint8Array, trak: Caixa): Trilha | null {
  const mdhd = achar(moov, ['mdia', 'mdhd'], trak.dataOff, trak.dataEnd)
  const stbl = achar(moov, ['mdia', 'minf', 'stbl'], trak.dataOff, trak.dataEnd)
  if (!mdhd || !stbl) return null
  const versao = moov[mdhd.dataOff]
  const timescale = versao === 1 ? u32(moov, mdhd.dataOff + 20) : u32(moov, mdhd.dataOff + 12)
  if (!timescale) return null

  const filhos = lerCaixas(moov, stbl.dataOff, stbl.dataEnd)
  const pega = (t: string) => filhos.find(c => c.type === t)

  // stsd → mp4a → esds: a configuração do decodificador (AudioSpecificConfig)
  // é o que dá a taxa e o número de canais REAIS para o cabeçalho ADTS.
  const stsd = pega('stsd')
  let asc: Uint8Array | null = null, canais = 2, taxa = 44100
  if (stsd) {
    const mp4a = lerCaixas(moov, stsd.dataOff + 8, stsd.dataEnd).find(e => e.type === 'mp4a')
    if (mp4a) {
      const dv = new DataView(moov.buffer, moov.byteOffset, moov.byteLength)
      canais = dv.getUint16(mp4a.dataOff + 16) || 2
      taxa = (u32(moov, mp4a.dataOff + 22) >>> 16) || 44100
      const esds = lerCaixas(moov, mp4a.dataOff + 28, mp4a.dataEnd).find(c => c.type === 'esds')
      if (esds) {
        let p = esds.dataOff + 4
        const lerTam = () => { let t = 0, b = 0; do { b = moov[p++]; t = (t << 7) | (b & 0x7f) } while (b & 0x80); return t }
        while (p < esds.dataEnd) {
          const tag = moov[p++]; const tam = lerTam()
          if (tag === 0x03) { p += 3; continue }
          if (tag === 0x04) { p += 13; continue }
          if (tag === 0x05) { asc = moov.subarray(p, p + tam); break }
          p += tam
        }
      }
    }
  }

  const stts = pega('stts'), stsc = pega('stsc'), stsz = pega('stsz')
  const stco = pega('stco'), co64 = pega('co64')
  if (!stts || !stsc || !stsz || !(stco || co64)) return null

  const duracoes: number[] = []
  const nStts = u32(moov, stts.dataOff + 4)
  for (let i = 0; i < nStts; i++) {
    const cnt = u32(moov, stts.dataOff + 8 + i * 8)
    const dur = u32(moov, stts.dataOff + 12 + i * 8)
    // Teto defensivo: tabela corrompida não pode estourar a memória da function.
    for (let j = 0; j < cnt && duracoes.length < 2_000_000; j++) duracoes.push(dur)
  }

  const tamUnico = u32(moov, stsz.dataOff + 4)
  const nSamp = Math.min(u32(moov, stsz.dataOff + 8), 2_000_000)
  const tamanhos = new Array<number>(nSamp)
  for (let i = 0; i < nSamp; i++) tamanhos[i] = tamUnico || u32(moov, stsz.dataOff + 12 + i * 4)

  const base = (stco || co64)!
  const nCh = u32(moov, base.dataOff + 4)
  const chunks = new Array<number>(nCh)
  for (let i = 0; i < nCh; i++) {
    chunks[i] = stco ? u32(moov, stco.dataOff + 8 + i * 4) : u64(moov, co64!.dataOff + 8 + i * 8)
  }

  const nSc = u32(moov, stsc.dataOff + 4)
  const sc: { primeiro: number; porChunk: number }[] = []
  for (let i = 0; i < nSc; i++) {
    sc.push({
      primeiro: u32(moov, stsc.dataOff + 8 + i * 12),
      porChunk: u32(moov, stsc.dataOff + 12 + i * 12),
    })
  }
  if (!sc.length) return null

  const amostras: Amostra[] = []
  let idx = 0
  for (let c = 0; c < nCh && idx < nSamp; c++) {
    let porChunk = sc[0].porChunk
    for (let k = 0; k < sc.length; k++) if (c + 1 >= sc[k].primeiro) porChunk = sc[k].porChunk
    let pos = chunks[c]
    for (let s = 0; s < porChunk && idx < nSamp; s++, idx++) {
      amostras.push({ off: pos, size: tamanhos[idx], dur: duracoes[idx] ?? duracoes[duracoes.length - 1] ?? 1024 })
      pos += tamanhos[idx]
    }
  }
  return amostras.length ? { timescale, canais, taxa, asc, amostras } : null
}

const TAXAS = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]

/** Cabeçalho ADTS de 7 bytes — é ele que transforma amostras soltas num .aac. */
function adts(tam: number, asc: Uint8Array | null, canais: number, taxa: number): Uint8Array {
  let obj = 2, freqIdx = TAXAS.indexOf(taxa), ch = canais
  if (asc && asc.length >= 2) {
    obj = asc[0] >> 3
    freqIdx = ((asc[0] & 0x07) << 1) | (asc[1] >> 7)
    ch = (asc[1] >> 3) & 0x0f
  }
  if (freqIdx < 0 || freqIdx > 12) freqIdx = 4
  if (!ch || ch > 7) ch = 2
  if (obj < 1 || obj > 4) obj = 2
  const total = tam + 7
  const h = new Uint8Array(7)
  h[0] = 0xff; h[1] = 0xf1
  h[2] = ((obj - 1) << 6) | (freqIdx << 2) | ((ch >> 2) & 1)
  h[3] = ((ch & 3) << 6) | ((total >> 11) & 0x03)
  h[4] = (total >> 3) & 0xff
  h[5] = ((total & 7) << 5) | 0x1f
  h[6] = 0xfc
  return h
}

export interface OpcoesAudio {
  /** Requisições ao armazenamento por aula. */
  maxPedidos?: number
  /** Bytes que aceitamos transferir (as amostras vêm intercaladas com o vídeo). */
  maxTransferencia?: number
  /** Teto do áudio produzido — precisa caber no orçamento inline do modelo. */
  maxAudio?: number
}

export interface AudioExtraido {
  bytes: Uint8Array
  minutos: number
  transferido: number
  pedidos: number
}

const JANELAS_MIN = [20, 15, 10, 6, 3, 1.5]
const GAPS = [0, 64 * 1024, 256 * 1024, 1024 * 1024, 4 * 1024 * 1024, Number.POSITIVE_INFINITY]

function blocos(amostras: Amostra[], gap: number) {
  const ord = amostras.slice().sort((a, b) => a.off - b.off)
  const out: { ini: number; fim: number }[] = []
  let cur: { ini: number; fim: number } | null = null
  for (const a of ord) {
    if (cur && a.off <= cur.fim + gap) cur.fim = Math.max(cur.fim, a.off + a.size)
    else { cur = { ini: a.off, fim: a.off + a.size }; out.push(cur) }
  }
  return out
}

/**
 * Extrai a maior janela de áudio que respeita os dois orçamentos.
 *
 * A busca desce de 20 para 1,5 minuto porque é melhor entregar 1,5 minuto da
 * aula de verdade do que nada — e sobe o agrupamento de blocos porque, dependendo
 * de como o arquivo foi gravado, pedir só as amostras custa milhares de
 * requisições enquanto pedir o trecho inteiro custa centenas de MB.
 */
export async function extrairAudioDeMp4(
  ler: LerRange, tamanho: number, opts: OpcoesAudio = {},
): Promise<AudioExtraido | null> {
  const maxPedidos = opts.maxPedidos ?? 48
  const maxTransferencia = opts.maxTransferencia ?? 60 * 1024 * 1024
  const maxAudio = opts.maxAudio ?? 11 * 1024 * 1024

  const mb = await acharMoov(ler, tamanho)
  if (!mb || mb.size <= 0 || mb.size > 64 * 1024 * 1024) return null
  const moov = await ler(mb.off, mb.off + mb.size - 1)
  if (!moov || moov.length < 8) return null

  const trak = trakDeAudio(moov)
  if (!trak) return null
  const t = lerTrilha(moov, trak)
  if (!t) return null

  for (const min of JANELAS_MIN) {
    const limite = min * 60 * t.timescale
    let acc = 0
    const usar: Amostra[] = []
    for (const a of t.amostras) { if (acc > limite) break; if (a.size > 0) usar.push(a); acc += a.dur }
    if (!usar.length) continue
    const bytesAudio = usar.reduce((s, a) => s + a.size, 0)
    if (bytesAudio > maxAudio) continue

    for (const gap of GAPS) {
      const b = blocos(usar, gap)
      if (b.length > maxPedidos) continue
      const transfer = b.reduce((s, x) => s + (x.fim - x.ini), 0)
      if (transfer > maxTransferencia) continue

      // Busca os blocos em PARALELO. Sequencial, 42 pedidos levavam ~70s — a
      // function tem 150s no total e ainda precisa chamar o modelo depois.
      const CONCORRENCIA = 8
      const pedacos: (Uint8Array | null)[] = new Array(b.length).fill(null)
      for (let i = 0; i < b.length; i += CONCORRENCIA) {
        const fatia = b.slice(i, i + CONCORRENCIA)
        const res = await Promise.all(fatia.map(bloco => ler(bloco.ini, bloco.fim - 1)))
        for (let k = 0; k < res.length; k++) {
          if (!res[k]) return null
          pedacos[i + k] = res[k]
        }
      }
      const acharBytes = (off: number, size: number): Uint8Array | null => {
        for (let i = 0; i < b.length; i++) {
          if (off >= b[i].ini && off + size <= b[i].fim) {
            const rel = off - b[i].ini
            return pedacos[i]!.subarray(rel, rel + size)
          }
        }
        return null
      }
      const partes: Uint8Array[] = []
      let totalBytes = 0
      for (const a of usar) {
        const dados = acharBytes(a.off, a.size)
        if (!dados || dados.length !== a.size) continue
        const cab = adts(a.size, t.asc, t.canais, t.taxa)
        partes.push(cab, dados)
        totalBytes += cab.length + dados.length
      }
      if (!partes.length) return null
      const out = new Uint8Array(totalBytes)
      let p = 0
      for (const x of partes) { out.set(x, p); p += x.length }
      return { bytes: out, minutos: acc / t.timescale / 60, transferido: transfer, pedidos: b.length }
    }
  }
  return null
}

/**
 * MPEG-TS já carrega o áudio em ADTS dentro dos pacotes PES — basta separar os
 * 188 bytes de cada pacote e concatenar a carga da trilha de áudio. Não precisa
 * de índice nenhum, então funciona lendo o arquivo desde o primeiro byte.
 *
 * São 12.015 aulas do acervo neste formato, e o filtro de mime das ferramentas
 * de IA nem sequer as aceitava — elas nunca foram lidas uma única vez.
 */
export function extrairAudioDeTs(buf: Uint8Array, maxAudio = 11 * 1024 * 1024): Uint8Array | null {
  const PACOTE = 188
  // 1ª passada: descobre o PID da trilha de áudio pelo PMT.
  let pidAudio = -1
  for (let i = 0; i + PACOTE <= buf.length && pidAudio < 0; i += PACOTE) {
    if (buf[i] !== 0x47) continue
    const pid = ((buf[i + 1] & 0x1f) << 8) | buf[i + 2]
    const inicio = (buf[i + 1] & 0x40) !== 0
    const adap = (buf[i + 3] >> 4) & 0x03
    let p = i + 4
    if (adap === 2) continue
    if (adap === 3) p += 1 + buf[p]
    if (!inicio) continue
    p += buf[p] + 1 // ponteiro do início da seção
    if (p >= i + PACOTE) continue
    if (buf[p] !== 0x02) continue // só a tabela PMT interessa
    const tamSecao = (((buf[p + 1] & 0x0f) << 8) | buf[p + 2]) + 3
    const fimSecao = Math.min(p + tamSecao - 4, i + PACOTE)
    const tamInfo = ((buf[p + 10] & 0x0f) << 8) | buf[p + 11]
    let q = p + 12 + tamInfo
    while (q + 5 <= fimSecao) {
      const tipo = buf[q]
      const pidFluxo = ((buf[q + 1] & 0x1f) << 8) | buf[q + 2]
      const tamEs = ((buf[q + 3] & 0x0f) << 8) | buf[q + 4]
      // 0x0F = AAC em ADTS, 0x11 = AAC LATM, 0x03/0x04 = MPEG áudio
      if (tipo === 0x0f || tipo === 0x03 || tipo === 0x04) { pidAudio = pidFluxo; break }
      q += 5 + tamEs
    }
  }
  if (pidAudio < 0) return null

  // 2ª passada: junta a carga dos pacotes desse PID, pulando o cabeçalho PES.
  const partes: Uint8Array[] = []
  let total = 0
  for (let i = 0; i + PACOTE <= buf.length && total < maxAudio; i += PACOTE) {
    if (buf[i] !== 0x47) continue
    const pid = ((buf[i + 1] & 0x1f) << 8) | buf[i + 2]
    if (pid !== pidAudio) continue
    const inicio = (buf[i + 1] & 0x40) !== 0
    const adap = (buf[i + 3] >> 4) & 0x03
    if (adap === 0 || adap === 2) continue
    let p = i + 4
    if (adap === 3) p += 1 + buf[p]
    if (inicio) {
      // Cabeçalho PES: 00 00 01 <stream_id>, com o tamanho do cabeçalho no 9º byte.
      if (buf[p] === 0x00 && buf[p + 1] === 0x00 && buf[p + 2] === 0x01) p += 9 + buf[p + 8]
    }
    if (p >= i + PACOTE) continue
    const carga = buf.subarray(p, i + PACOTE)
    partes.push(carga)
    total += carga.length
  }
  if (!partes.length) return null
  const out = new Uint8Array(total)
  let p = 0
  for (const x of partes) { out.set(x, p); p += x.length }
  return out
}

/**
 * Versão que lê o arquivo TS em janelas sequenciais até juntar áudio suficiente.
 *
 * Num TS o vídeo domina o fluxo: 12 MB lidos rendem só ~1,5 minuto de áudio.
 * Ler em janelas até o orçamento de transferência é o que transforma isso em
 * vários minutos de aula — e como TS não tem índice, ler do começo sempre
 * funciona, não importa como o arquivo foi gravado.
 */
export async function extrairAudioDeTsProgressivo(
  ler: LerRange, tamanho: number, opts: OpcoesAudio = {},
): Promise<AudioExtraido | null> {
  const maxTransferencia = opts.maxTransferencia ?? 60 * 1024 * 1024
  const maxAudio = opts.maxAudio ?? 11 * 1024 * 1024
  const JANELA = 16 * 1024 * 1024

  const partes: Uint8Array[] = []
  let audio = 0, lido = 0, pedidos = 0
  while (lido < tamanho && lido < maxTransferencia && audio < maxAudio) {
    const fim = Math.min(lido + JANELA, tamanho) - 1
    const buf = await ler(lido, fim)
    pedidos++
    if (!buf || !buf.length) break
    lido += buf.length
    const trecho = extrairAudioDeTs(buf, maxAudio - audio)
    if (trecho && trecho.length) { partes.push(trecho); audio += trecho.length }
    if (buf.length < JANELA) break
  }
  if (!partes.length) return null
  const out = new Uint8Array(audio)
  let p = 0
  for (const x of partes) { out.set(x, p); p += x.length }
  // Sem índice não há como saber a duração exata sem decodificar; a estimativa
  // usa a taxa média do próprio fluxo extraído (o número é só informativo).
  return { bytes: out, minutos: audio / (16 * 1024) / 60, transferido: lido, pedidos }
}
