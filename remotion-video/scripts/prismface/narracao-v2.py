# -*- coding: utf-8 -*-
# Narração única do vídeo prism.face (pt-BR).
import asyncio, json, os, re, subprocess, sys
import edge_tts, imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
FRA = 'pt-BR-FranciscaNeural'

TEXTO = (
    "Toda pele conta uma história. "
    "A prism.face é uma leitura completa do seu rosto — feita pelo seu celular, em menos de um minuto. "
    "O método cabe em quatro passos: a leitura, a avaliação, o ritual e a evolução. "
    "Você entra no seu espaço: sua leitura, seu cronograma e sua jornada, num lugar só. "
    "Antes da câmera, um minuto de preparo. "
    "As cinco poses aparecem desenhadas — o nariz diz para onde virar. "
    "Aí é só seguir a voz. Frente, lados, cima e baixo. "
    "Um aviso sonoro confirma cada foto: você nem precisa olhar para a tela. "
    "Nenhum vídeo é gravado — só as fotos de cada pose. "
    "Em segundos, sua leitura fica pronta. "
    "Ela abre com o seu rosto, e os pontos do que foi encontrado. "
    "Toque num ponto e veja o achado ali. "
    "E se quiser, o mapa em três dimensões gira com o seu dedo. "
    "Cada achado é uma linha: o que é, onde está, e a intensidade. "
    "Um toque abre o detalhe — de onde vem, e como cuidar. "
    "Sem jargão: leve, moderada, intensa. "
    "Do achado nasce o ritual. "
    "Manhã e noite, uma linha por passo, com produtos reais vendidos no Brasil. "
    "A quantidade, o modo de uso e o tempo de espera ficam a um toque. "
    "E a evolução vem em cartões de semana, com o que esperar, e quando. "
    "Começou o cronograma, a plataforma acompanha o seu dia: "
    "ritual da manhã, ritual da noite, lembretes na hora que você escolheu — "
    "e o que ficou para trás continua contando. "
    "A cada semana, uma nova leitura mostra o que mudou. "
    "Sua jornada guarda tudo: dias de ritual, sequência, e o antes e agora do seu rosto. "
    "Suas fotos são dado biométrico: consentimento próprio, área privada, "
    "e você apaga tudo quando quiser. "
    "prism.face. Sua pele, lida com o cuidado que ela merece."
)

async def main():
    mp3dir, jsondir = sys.argv[1], sys.argv[2]
    os.makedirs(mp3dir, exist_ok=True); os.makedirs(jsondir, exist_ok=True)
    esperado = len(TEXTO.split())
    for tent in range(6):
        tts = edge_tts.Communicate(TEXTO, FRA, rate='-3%', boundary='WordBoundary')
        words, raw = [], os.path.join(mp3dir, 'pf_raw.mp3')
        with open(raw, 'wb') as f:
            async for ch in tts.stream():
                if ch['type'] == 'audio': f.write(ch['data'])
                elif ch['type'] == 'WordBoundary':
                    t = ch['offset'] / 1e7
                    words.append({'w': ch['text'], 't': round(t, 3), 'end': round(t + ch['duration']/1e7, 3)})
        if len(words) >= esperado * 0.9: break
        print(f'  truncado ({len(words)}/{esperado}), tentativa {tent+2}')
    final = os.path.join(mp3dir, 'pf.mp3')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', raw,
        '-af', 'acompressor=ratio=3.5:threshold=-21dB:attack=8:release=180:makeup=3dB,'
               'loudnorm=I=-13:TP=-1.5:LRA=11',
        '-c:a', 'libmp3lame', '-q:a', '2', final], check=True)
    os.remove(raw)
    dur = words[-1]['end'] if words else 0
    json.dump({'voice': FRA, 'duration': round(dur, 3), 'words': words},
              open(os.path.join(jsondir, 'pf.json'), 'w'), ensure_ascii=False)
    print('narração', f'{dur:.1f}s', f'{len(words)}w')

asyncio.run(main())
