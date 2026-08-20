# prism.face — como o filme de demonstração foi gravado

O vídeo `PF01-Prismface` usa telas reais da plataforma, gravadas em um celular
virtual (Playwright, viewport 430×932). Nada do rosto ou do nome do dono da conta
aparece: a identidade é substituída **só na exibição**, nunca nos dados.

## 1. Rosto fictício na câmera

`camera-ficticia.py` monta um vídeo Y4M retrato (480×1040) a partir de um retrato
de pessoa inexistente e o entrega ao Chromium como câmera falsa.

```bash
python3 camera-ficticia.py <yaw> <pitch> <R> <Rv> /tmp/cam.y4m <ciclos>
python3 camera-ficticia.py 34 20 0.86 1.05 /tmp/cam.y4m 7   # ~112 s
```

O giro é um cilindro suave com **recentragem parcial** (`KX`/`KY`): a cabeça gira
no lugar em vez de deslizar para a borda. Acima de ~40° de yaw a imagem começa a
esticar — foi por isso que o ângulo ficou nessa faixa. O arquivo precisa estar em
caminho curto (`/tmp/...`): caminho longo faz o Chromium responder `NotFoundError`,
e MJPEG é recusado.

```bash
chromium --use-fake-device-for-media-stream \
         --use-fake-ui-for-media-stream \
         --use-file-for-fake-video-capture=/tmp/cam.y4m
```

## 2. Identidade mascarada nas telas logadas

`gravar-telas.js` grava as telas com duas proteções:

- **nome**: um `addInitScript` troca o primeiro nome por um fictício em todo texto
  renderizado (inclusive no texto já gerado pela IA e guardado na leitura);
- **fotos**: as requisições a `/storage/v1/object/sign/scans/**` são respondidas com
  um retrato fictício, então o mapa 3D do rosto e o comparador “antes e agora”
  aparecem com esse rosto.

`trocar-nome.js` troca o nome do perfil antes da gravação e o restaura depois.
`conferir-identidade.js` abre cada página com e sem a máscara e conta ocorrências
do nome/e-mail reais — o esperado é **0 com máscara**.

Nenhum script guarda identidade: tudo vem de variáveis de ambiente.

```bash
export PF_NOME_REAL="Fulano" PF_NOME_FALSO="Marina"
export PF_IDENTIDADE="Fulano|fulano@exemplo.com"
export PF_PLANO="<id do cronograma>" PF_LEITURA="<id da leitura>"
node gravar-telas.js            # todas as telas
node gravar-telas.js t_leitura  # só uma
node conferir-identidade.js     # precisa dar 0 com máscara
```

## 3. Conferência do resultado

Depois de renderizar, vale extrair um quadro por segundo e olhar todos:

```bash
ffmpeg -i out/prismface-demo.mp4 -vf "fps=1,scale=150:-1" /tmp/q/f%03d.jpg
```

Detector de rosto automático ajuda, mas **erra por omissão** (não pegou o mapa 3D
nem as miniaturas do comparador). A conferência que vale é olhar os quadros.

---

## Versão 2 — a plataforma redesenhada (PF02)

O redesenho deixou a leitura curta e tocável: a tela mostra o essencial e o
detalhe abre numa folha que sobe do rodapé. O filme passou a mostrar isso
acontecendo, então a gravação **interage** em vez de só rolar a página:

| take | o que é gravado |
|---|---|
| `t_leitura` | a leitura abre com a foto e os pontos; um ponto é tocado e a folha abre |
| `t_mapa3d` | "Ver o mapa em três dimensões" e o rosto girando com o dedo |
| `t_achados` | as linhas de achado e a folha com o detalhe região por região |
| `t_ritual` | as abas Manhã/Noite e a folha de um passo |
| `t_evolucao` | os cartões de semana |
| `t_jornada` | o comparador "antes e agora" deslizando |

`gravar-telas-v2.js` faz tudo isso. Três detalhes que custaram tempo:

1. **POST precisa do corpo.** A interceptação de rede tem que repassar
   `method`, `headers` e `postData` — sem isso qualquer ação do app (inclusive
   `/api/analyze`) falha com "Failed to fetch" e a tela mostra erro.
2. **Arrastar pinta seleção azul.** Um `user-select: none` global entra por
   init script; sem ele o comparador fica com meia tela azul no vídeo.
3. **A leitura tem teto de 3 por 24 h.** Se `/api/analyze` responder 429, não é
   falha: é o limite do produto.

### Leitura com o rosto fictício

Vale insistir para a captura fechar com 3 poses válidas — aí a leitura inteira
(foto, mapa 3D, comparador) nasce com o rosto fictício e nada precisa ser
substituído depois. O que destravou isso foi o **encurtamento**: além do giro,
a largura do quadro cai com `cos(yaw)` e a altura com `cos(pitch)`, que é o
sinal geométrico que o detector de pose usa. É escala global — nenhum traço do
rosto deforma.

```bash
python3 camera-ficticia.py 34 26 0.86 1.05 /tmp/cam.y4m 7
```

Com 3 de 5 poses o app oferece "Seguir com as fotos que já temos".
