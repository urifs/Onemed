// Varre uma pasta do Google Drive INTEIRA (pasta dentro de pasta, atalhos
// resolvidos) e grava a árvore num JSON, para depois comparar/importar com
// scripts/importar-pasta-em-curso.mjs.
//
// Só LÊ — não escreve nada no banco nem no Drive.
//
//   SUPABASE_SECRET_KEY=... node scripts/varrer-pasta-drive.mjs <folderId> [saida.json]
//
// Usa o token da conta de CONTEÚDO (drive-access-token). Se a pasta for de
// outra conta (ex: o Drive de armazenamento), ela precisa estar compartilhada
// com a conta de conteúdo — é essa conta que o Worker de streaming usa para
// servir os bytes, então sem o compartilhamento a aula importa mas não toca.
import fs from 'node:fs'

const RAIZ = process.argv[2]
const SAIDA = process.argv[3] || 'arvore-drive.json'
if (!RAIZ) {
  console.error('uso: node scripts/varrer-pasta-drive.mjs <folderId> [saida.json]')
  process.exit(1)
}

const SB = process.env.SUPABASE_URL || 'https://jrrybiohwqabsdurqudc.supabase.co'
const tk = await (await fetch(`${SB}/functions/v1/drive-access-token`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}` },
})).json()
const TOKEN = tk.accessToken
if (!TOKEN) { console.error('sem token do Drive:', JSON.stringify(tk).slice(0, 200)); process.exit(1) }

async function listar(folderId) {
  const itens = []
  let pageToken = null
  do {
    const p = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, shortcutDetails)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?${p}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
    const j = await r.json()
    itens.push(...(j.files || []))
    pageToken = j.nextPageToken
  } while (pageToken)
  return itens
}

const PASTA = 'application/vnd.google-apps.folder'
const saida = []
let erros = 0

async function andar(folderId, caminho, nivel) {
  let itens
  try {
    itens = await listar(folderId)
  } catch (e) {
    // Pasta que o Drive recusa listar NUNCA pode ser engolida em silêncio: foi
    // exatamente esse `catch` vazio que deixou 913 arquivos de fora em 07/2026
    // com o curso ainda marcado como "Concluído".
    console.error(`!! ERRO ao listar "${caminho}": ${String(e).slice(0, 160)}`)
    erros++
    return
  }
  for (const it of itens) {
    const alvoId = it.shortcutDetails?.targetId || it.id
    const alvoMime = it.shortcutDetails?.targetMimeType || it.mimeType
    const sub = caminho ? `${caminho}/${it.name}` : it.name
    if (alvoMime === PASTA) {
      saida.push({ tipo: 'pasta', id: alvoId, nome: it.name, caminho: sub, nivel })
      await andar(alvoId, sub, nivel + 1)
    } else {
      saida.push({
        tipo: 'arquivo', id: alvoId, nome: it.name, caminho: sub, nivel,
        mime: alvoMime || '', size: it.size ? Number(it.size) : null,
      })
    }
  }
}

await andar(RAIZ, '', 1)

const arquivos = saida.filter(s => s.tipo === 'arquivo')
const pastas = saida.filter(s => s.tipo === 'pasta')
const bytes = arquivos.reduce((a, b) => a + (b.size || 0), 0)
console.log(`pastas: ${pastas.length} | arquivos: ${arquivos.length} | ${(bytes / 1e9).toFixed(2)} GB | erros de listagem: ${erros}`)
if (erros) console.log('⚠️  com erro de listagem a árvore está INCOMPLETA — não use para marcar aula como sumida.')

fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 1))
console.log(`árvore salva em ${SAIDA}`)
