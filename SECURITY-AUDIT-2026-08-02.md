# Auditoria de Segurança — OneMed

> **Documento sensível.** Descreve vulnerabilidades exploráveis e onde elas estão. Mantenha no
> repositório privado. Não contém valores de segredos (apenas referências a onde estão).
>
> Data: 2026-08-02 · Escopo: frontend (React/Vite), Supabase (Postgres+RLS, 33 Edge Functions),
> Cloudflare Worker de streaming, integrações (Mercado Pago, Google Drive, Resend, WhatsApp/Evolution, Meta).
> Método: revisão por dimensão de ataque (9 frentes) com verificação adversarial de cada achado.
> Resultado: **46 achados — 11 críticos, 10 altos, 11 médios, 14 baixos**. Nenhum falso positivo.

---

## ⚠️ AÇÃO IMEDIATA (faça hoje, nesta ordem)

Estes três pontos, juntos, significam que **hoje qualquer pessoa que saiba um e‑mail de admin entra no
painel `/admin` como você**, qualquer pessoa acessa todo o acervo pago de graça, e qualquer pessoa que
obtenha o repositório controla todo o backend. Não são teóricos — o caminho de exploração foi traçado no código.

1. **Rotacionar TODOS os tokens que estão no `CLAUDE.md`** (Supabase Management `sbp_`, Vercel `vcp_`,
   Cloudflare `cfut_`) e os secrets que eles alcançam (service_role, `MP_ACCESS_TOKEN_PROD`, `RESEND_API_KEY`,
   `GOOGLE_CLIENT_SECRET`, `LESSON_STREAM_SECRET`). Eles estão versionados e no histórico do git — considere‑os
   vazados. **Pare de colar tokens em texto** (chat, docs, commits). → Crítico #7
2. **Corrigir o login sem prova de posse** (`member-auth-request` e `create-trial-access` devolvem a sessão
   da conta a quem só informa o e‑mail). Enquanto isso existir, a plataforma efetivamente **não tem
   autenticação de membros nem de admin**. → Crítico #1
3. **Remover a policy pública de INSERT em `accesses`** e fechar `drive-share-folder`/`drive-oauth-callback`/
   `drive-save-folder` (chamáveis sem credencial). → Críticos #2, #3 e Altos #3, #4

Config pendente que abre portas (do próprio `CLAUDE.md`): `MP_WEBHOOK_SECRET` e `CRON_SECRET` **não estão
configurados** — várias funções ficam "fail‑open" (liberam sem auth quando o segredo falta). Configure os dois.

---

## O que está BOM (para não mexer no que já funciona)

- RLS habilitado em todas as tabelas; `has_role`/`is_member` como funções `SECURITY DEFINER` (padrão correto).
- Preço do checkout é **recalculado no servidor** (`mp-create-payment`) — o cliente não define o valor cobrado.
- `buyers.access_granted` **não** pode ser setado por insert público (o migration de correção fechou isso).
- Comentários da comunidade são renderizados como **texto React escapado** — sem XSS armazenado.
- `member-account-info` e `member-capture-location` derivam a identidade do **JWT verificado** — sem IDOR entre contas.
- O webhook do MP **reconsulta** o pagamento na API do Mercado Pago (não confia no status do corpo) e tem guarda de idempotência.
- `ClaimAccessPage` e `RegisterPage` (self‑grant de admin) **são bloqueados pela RLS** hoje — o `CLAUDE.md`
  descrevia o `ClaimAccessPage` como explorável; na prática o RLS já barra (ver Baixos).

---

## CRÍTICOS

### C1 — Login sem prova de posse: takeover de qualquer membro **ou admin** só com o e‑mail
`supabase/functions/member-auth-request/index.ts:121-184` · `create-trial-access/index.ts:161-327` · **verificado ✓**

O "login passwordless" gera um magic link (`auth.admin.generateLink`) e **resgata o link no próprio servidor**
(`GET /auth/v1/verify`), lendo `access_token`/`refresh_token` do header `Location` e **devolvendo-os no corpo da
resposta HTTP** para quem chamou. O único gate é o e‑mail ser membro/comprador/admin — nenhuma prova de que quem
chama controla a caixa de entrada. Como o e‑mail **não é segredo**, ele vira a credencial única. A função é
alcançável por qualquer um com a anon key pública (que está no bundle do site).

**Exploração:** `POST /functions/v1/member-auth-request` com `{"email":"admin@…"}` → resposta traz
`{access_token, refresh_token}` da conta daquele e‑mail → `supabase.auth.setSession(...)` → atacante está logado
como o admin, com `has_role('admin')` real, liberando `/admin` inteiro (buyers, cupons, `drive_config`, backup do
banco). `generateLink` cria o usuário na hora, então funciona até para comprador que nunca logou.

**Correção:** nunca resgatar o link no servidor nem devolver tokens ao chamador. Enviar o magic link/OTP para o
e‑mail (o Resend já está configurado) e só o dono do inbox conclui; ou validar um código (OTP) que o usuário
digita de volta, com expiração curta e tentativas limitadas. No trial, idem — não emitir sessão para e‑mail não comprovado.

### C2 — Acesso vitalício grátis: INSERT público em `accesses` + gates ignoram `expires_at`
`supabase/migrations/20260323163104_…sql:6` + `20260718160000_is_member_admin_bypass.sql` · **verificado ✓**

A policy `Public can insert trial access` só exige `WITH CHECK (access_type='trial' AND status='active')` — **não
restringe `email` nem `expires_at`**. E `is_member()`, o gate de login (`member-auth-request:117`) e o de streaming
(`member-lesson-token:92`) checam **só `status='active'`, nunca `expires_at`**. O cron `drive-revoke-access` só
expira linhas com `expires_at <= now()`; com `expires_at` nulo/futuro, a linha **nunca** é revogada.

**Exploração:** com a anon key pública, `supabase.from('accesses').insert({email:'x@x', access_type:'trial',
status:'active'})` (sem `expires_at`) → `is_member()` vira `true` para sempre → acesso permanente e gratuito a
todo o acervo (404 cursos / ~207 mil aulas / ~12 TB), sem pagar e sem o limite de 30 min do trial.

**Correção:** remover a policy pública de INSERT em `accesses` (o trial já é criado pela Edge Function
`create-trial-access` com service role, que ignora RLS). Fazer `is_member()`/`member-lesson-token`/
`member-auth-request` exigirem `status='active' AND (access_type <> 'trial' OR expires_at > now())`. Ajustar o
cron para cobrir `expires_at` nulo.

### C3 — `drive-share-folder`: requisição SEM `Authorization` é tratada como autorizada
`supabase/functions/drive-share-folder/index.ts:64` · `config.toml` (`verify_jwt=false`) · **verificado ✓ (adversarial)**

`verify_jwt=false` deixa a função 100% anônima no gateway. Na lógica interna, só o caso `Bearer` é tratado;
**qualquer requisição sem header cai no `else` que define `isAuthorized = true`** ("chamada interna"). Ou seja,
ausência de credencial = autorizado. Em seguida compartilha `config.folder_id` (a pasta‑raiz de TODO o acervo)
como `reader` com o e‑mail arbitrário do corpo.

**Exploração:** `curl -X POST …/drive-share-folder -d '{"email":"atacante@gmail.com"}'` (sem `Authorization`) →
atacante vira leitor da pasta‑raiz no Google Drive e baixa o acervo inteiro, direto pelo Drive, permanentemente.
(Bônus: a comparação da service key na linha 49 usa `===`, não tempo‑constante — ver Baixo.)

**Correção:** eliminar o ramo `else { isAuthorized = true }`. Exigir sempre service_role key (comparada em tempo
constante) **ou** JWT de admin verificado (`getUser` + `has_role`). Chamadas internas devem passar a service key explicitamente.

### C4 — Um trial (ou qualquer sessão) exfiltra a biblioteca paga inteira
`supabase/functions/member-lesson-token/index.ts:90-121` · `cloudflare/stream-lesson/worker.js:74-81` · **verificado ✓**

O entitlement é checado **uma vez**, ao assinar a URL, e o token vale **2h**. A checagem só testa "tem algum
acesso ativo" (não há entitlement por curso), e um trial satisfaz isso. Como `is_member()` libera `SELECT` em
`lessons` (toda a tabela), uma conta de teste enumera todos os `lesson_id` e pede uma URL de download para cada
aula. O Worker honra a URL só validando `exp` + HMAC — **nunca revalida o acesso**.

**Exploração:** trial de 10 min → `select id from lessons` (RLS libera) → loop em `member-lesson-token` (sem rate
limit) gerando milhares de URLs de 2h → baixa tudo, e as URLs continuam válidas por 2h **mesmo depois do trial
expirar**. Mitigante parcial: a cota por arquivo do Drive (429) estrangula um grab literal de 12 TB de uma vez;
aulas em Storage não têm essa cota.

**Correção:** revalidar entitlement **no momento de servir os bytes** (o `member-stream-file` já foi projetado
para isso, mas está morto — nada o chama); reduzir o TTL para minutos; vincular a assinatura ao `user_id`;
aplicar rate limit por usuário em `member-lesson-token`; restringir o que um trial pode assinar.

### C5 — `send-access-email`: open relay não autenticado + injeção de HTML (phishing com o domínio da marca)
`supabase/functions/send-access-email/index.ts:201` · `config.toml` (`verify_jwt=false`)

Sem nenhuma verificação de auth. Destinatário vem do corpo (`to`/`email`) e campos (`name`, `plan`) são
interpolados no HTML **sem escaping**. O e‑mail sai de `contato@onemedcursos.com.br` com SPF/DKIM válidos.

**Exploração:** `POST …/send-access-email` com `name` = `<a href="site-falso">Confirme seu pagamento</a>` →
vítima recebe "Pagamento aprovado — Bem‑vindo" do **domínio legítimo**, caindo na inbox, com links do atacante.
Em massa: phishing ilimitado com a marca + esgotamento da cota do Resend.

**Correção:** exigir auth de serviço/admin (padrão do `send-custom-email`: `getUser` + `has_role`, ou compare
tempo‑constante com a service key para chamadas internas). Escapar TODOS os campos dinâmicos. Validar o e‑mail do destinatário.

### C6 — `whatsapp-manager`: função de administração totalmente SEM autenticação
`supabase/functions/whatsapp-manager/index.ts:39`

O comentário diz "requer admin", mas o handler não checa nada. Modos expostos: `get-config` (devolve
`whatsapp_config` inteiro, **incluindo `evolution_api_key` e a URL**), `get-messages` (dump de conversas reais de
leads — telefone + texto, **PII/LGPD**), `save-config` (sobrescreve URL/chave/auto‑reply), `create-instance`/`disconnect`.

**Exploração:** `{"mode":"get-config"}` vaza a chave da Evolution API; `{"mode":"get-messages"}` vaza PII de leads;
`{"mode":"save-config","evolution_api_url":"http://169.254.169.254/latest/meta-data/"}` + `get-status` →
**SSRF** para metadata interno; ou troca o auto‑reply por phishing enviado a todos os leads.

**Correção:** gate de admin obrigatório no início (`getUser` + role, ou `secureCompare` com a service key). Nunca
retornar `evolution_api_key`. Allowlist de host em `evolution_api_url` (bloquear IP privado/link‑local/metadata).

### C7 — Tokens de produção versionados no repositório (`CLAUDE.md`) + histórico do git
`CLAUDE.md:41-43, 80, 99` (valores omitidos aqui)

Em texto puro e versionado (repo `urifs/Onemed`, e no histórico do git): **Supabase Management API** (`sbp_…`, o
token de MAIOR poder — SQL arbitrário, leitura/reescrita de todos os secrets, redeploy de funções, banco inteiro),
**Vercel** (`vcp_…` — troca env vars, promove deploy malicioso, injeta skimmer no `/checkout`), **Cloudflare**
(`cfut_…` — reescreve/apaga o Worker de streaming, exfiltra a service_role dos bindings). O próprio arquivo
registra que o token Supabase **já foi rotacionado e re‑commitado** antes — exposição recorrente. Também há um JWT
`anon` hardcoded numa migration (baixo, porque anon é pública).

**Exploração:** quem obtiver o repo (colaborador, fork, clone vazado, ou se algum dia virar público) extrai o
`sbp_…` e roda `POST /v1/projects/{ref}/database/query` → `SELECT * FROM buyers, accesses, member_locations`
exfiltrando e‑mail/WhatsApp/país/IP/histórico de pagamento de todos os alunos; ou sobrescreve secrets e injeta
código via redeploy. Sem outro obstáculo.

**Correção:** **rotacionar todos** agora. Remover TODO segredo vivo do `CLAUDE.md` e de qualquer arquivo
versionado — ler só de variáveis de ambiente/gerenciador de secrets. **Purgar o histórico** (`git filter-repo`/BFG),
pois o valor persiste em commits antigos. Tratar como incidente: auditar logs de acesso do período.

---

## ALTOS

### A1 — Substituição de plano: paga o barato, recebe o caro
`supabase/functions/mp-webhook/index.ts:434`

O webhook concede o plano lido de `buyers.plan` — coluna **gravada pelo cliente** (policy pública) e que o
`mp-create-payment` nunca reconcilia com o plano que ele precificou. Insira `buyers` com `plan='lifetime_pro'`,
pague uma preferência de `plan='monthly'` (R$49), e o webhook concede o vitalício de R$997. **Correção:** derivar
o plano concedido do valor efetivamente pago/precificado pelo servidor (metadata do pagamento), ou validar
`transaction_amount == PLAN_PRICES[plan]` antes de conceder.

### A2 — `create-trial-access` emite sessão para e‑mail arbitrário (pré‑sequestro de conta)
`supabase/functions/create-trial-access/index.ts:161-200` — mesma classe do C1: devolve `access_token`/`refresh_token`
para um e‑mail sem prova de posse. Fresh email → sessão guardada aguardando a vítima usar aquele e‑mail; trial
ativo → qualquer chamador que informe o e‑mail recebe a sessão do usuário. **Correção:** ver C1.

### A3 — `drive-oauth-callback` sem auth: sequestro da conexão do Google Drive
`supabase/functions/drive-oauth-callback/index.ts:26` · `verify_jwt=false` · **verificado ✓**

Troca o `code` OAuth por tokens e sobrescreve `drive_config` sem checar admin. O atacante completa o consent com a
**própria** conta Google (o `client_id` e o `redirect_uri` são públicos), pega o `code` e faz POST anônimo →
`drive_config` passa a guardar os tokens dele → reaponta o acervo ou derruba o streaming de todos (DoS).
**Correção:** gate de admin antes da troca + parâmetro `state` anti‑CSRF.

### A4 — `drive-save-folder` gravável com a anon key pública
`supabase/functions/drive-save-folder/index.ts:40` · **verificado ✓**

Sem checagem de role — a anon key (pública) satisfaz o `verify_jwt=true`. Qualquer visitante reaponta
`drive_config.folder_id` → a próxima sincronização varre a pasta errada, `drive-share-folder` compartilha a errada
(corrupção/DoS do acervo). **Correção:** gate de admin (`getUser` + `has_role`) ou service key em tempo constante.

### A5 — Enumeração de clientes: `404` vs `200` revela quem é assinante
`supabase/functions/member-auth-request/index.ts:117-118` · **verificado ✓**

E‑mail não‑membro → `404`; membro → `200` (com sessão) e latência muito maior. Oráculo direto da base de clientes
pagantes (dado sensível de uma plataforma médica), e cada `200` já **é** um takeover (C1). **Correção:** resposta
genérica uniforme + mover a emissão de sessão para trás de um passo que não distingue membro no tempo (mandar
e‑mail sempre). Some junto com a correção do C1.

### A6 — Worker de streaming não revalida acesso; URL de 2h é um "bearer" compartilhável
`cloudflare/stream-lesson/worker.js:74-81` · **verificado ✓**

A URL assinada não vincula usuário nem IP — só `exp`+HMAC(arquivo). É transferível por 2h. Conta revogada/expirada
com URL pré‑obtida continua baixando; um assinante cola URLs num grupo e qualquer um sem conta baixa o material.
O `member-stream-file` (que revalidaria por request) está **morto**. **Correção:** revalidar entitlement por
request, TTL de minutos, vincular ao `user_id`/IP.

### A7 — Gate ignora `expires_at` e planos pagos nunca expiram ("paga um mês, usa para sempre")
`supabase/functions/member-lesson-token/index.ts:92` · `member-stream-file:86` · **verificado ✓**

Nenhuma rotina vira o `status` de plano pago para `expired` (o cron só trata `trial`). O gate só olha
`status='active'`. Um assinante **mensal (R$49,90/30d)** mantém acesso pleno indefinidamente após vencer.
**Correção:** exigir `status='active' AND (expires_at IS NULL OR expires_at > now())` no gate; cron/rotina que
expira planos pagos vencidos; centralizar em uma função `has_active_entitlement(email)` usada por todos os caminhos.

### A8 — `send-followup-emails`: `test_email` vira open relay quando `CRON_SECRET` falta
`supabase/functions/send-followup-emails/index.ts:237` — a auth só roda dentro de `if (cronSecret)`. Sem o secret
(pendente), é fail‑open: `{"test_email":"vitima@…"}` dispara 3 e‑mails da marca (com cupons) para qualquer
endereço. **Correção:** fail‑closed (recusar se `CRON_SECRET` ausente); remover/proteger o modo de teste.

### A9 — `whatsapp-webhook`: auth burlável por omissão
`supabase/functions/whatsapp-webhook/index.ts:87` — as checagens de `apikey`/instância são condicionais ao dado que
o atacante envia (`if (body.apikey && …)`). Não enviar os campos pula ambas. Sem assinatura HMAC/verify token
obrigatório → forja de eventos, spam pelo WhatsApp oficial (risco de ban), poluição de `whatsapp_messages`.
**Correção:** validação obrigatória fail‑closed + assinatura/segredo compartilhado.

> Observação: o token Cloudflare `cfut_` (originalmente listado como Alto) está consolidado no **C7**.

---

## MÉDIOS

| # | Achado | Arquivo | Correção resumida |
|---|--------|---------|-------------------|
| M1 | HMAC do webhook MP é opcional (pulado se `MP_WEBHOOK_SECRET` ausente) | `mp-webhook/index.ts:292-314` | Fail‑closed; configurar o secret (pendente) |
| M2 | Contagem de cupom não‑atômica e **antes** do pagamento (over‑redemption / esgotamento) | `mp-create-payment/index.ts:312-323` | `UPDATE … times_used+1 WHERE times_used<max_uses`; incrementar só na aprovação |
| M3 | INSERT público em `buyers` forja vendas (alimenta A1 e polui relatórios) | `20260323163104_…sql:11` | Criar `buyers` só via Edge Function; restringir campos |
| M4 | `drive-list-folders` enumera a árvore do Drive com a anon key | `drive-list-folders/index.ts:42` · **✓** | Gate de admin |
| M5 | Rate limit burlável por spoof de `X-Forwarded-For` | `member-auth-request:95` (+`create-trial-access`, `member-capture-location`) · **✓** | Usar IP real do gateway; limitar também por e‑mail‑alvo |
| M6 | `member-lesson-token` sem rate limit (multiplica C4) | `member-lesson-token/index.ts:82-96` · **✓** | Rate limit por usuário/IP; alertar volume anômalo |
| M7 | `run-email-campaign`/`run-sms-job` fail‑open sem `CRON_SECRET` | `run-email-campaign:242` · `run-sms-job:91` | Fail‑closed; remover `else if(!cronSecret) authed=true` |
| M8 | `.claude/settings.json` versionado com `bypassPermissions` | `.claude/settings.json:3` | Tirar do git (ou só em `settings.local.json`); modo padrão |
| M9 | `vercel.json` sem headers de segurança (CSP, HSTS, X‑Frame‑Options…) | `vercel.json` | Bloco `headers`: CSP, `X-Frame-Options: DENY` no `/admin`, HSTS, `nosniff`, Referrer‑Policy |
| M10 | `OfficeViewer` envia a URL assinada da aula para a Microsoft (terceiro) | `src/components/member/OfficeViewer.tsx:13` | Renderizar Office no cliente (converter p/ PDF no Worker), não usar `officeapps.live.com` |
| M11 | Enumeração de todos os cupons ativos por qualquer anon | `20260323163043_…sql:125` | Remover SELECT público; validar cupom via RPC por código exato |

## BAIXOS (resumo)

| # | Achado | Arquivo | Nota |
|---|--------|---------|------|
| B1 | `ClaimAccessPage` escreve no banco pelo cliente — **RLS bloqueia**, não explorável | `src/pages/ClaimAccessPage.tsx:24-66` | Corrige suposição do `CLAUDE.md`; migrar p/ Edge Function |
| B2 | `drive-share-folder` compara service key com `===` (não tempo‑constante) | `drive-share-folder/index.ts:49` · **✓** | Usar `secureCompare` |
| B3 | `member-capture-location` aceita IP arbitrário (forja o próprio pin no mapa) | `member-capture-location/index.ts:47` · **✓** | IP real; sem IDOR (identidade vem do JWT) |
| B4 | `coupons`: anon lê todos os cupons ativos (códigos/descontos) | `20260323163043_…sql:125` | Igual M11 |
| B5 | `member_plan_tier(uuid)` `SECURITY DEFINER` com EXECUTE p/ anon, sem gate | `20260729010000_…sql:137` | Gate interno + `REVOKE` de anon |
| B6 | `admin_schema_snapshot()` sem gate e EXECUTE default p/ PUBLIC | `20260721140000_…sql:7` | `REVOKE … FROM PUBLIC`; só service_role |
| B7 | INSERT anon em `buyers` polui a tabela / sequestra `external_reference` | `20260323163104_…sql:11` | Igual M3 |
| B8 | `RegisterPage` tenta self‑grant de admin pelo cliente — **RLS bloqueia** | `src/pages/RegisterPage.tsx:31` | Remover self‑grant; proteger `/admin/register`; não engolir erro |
| B9 | `dangerouslySetInnerHTML` no `chart.tsx` (shadcn) — sem input de usuário hoje | `src/components/ui/chart.tsx:70` | Latente; allowlist se virar dinâmico |
| B10 | JWT `anon` hardcoded na migration de cron (anon é pública) | `20260324203337_cron_jobs.sql:8,21` | Higiene; já superseded por Vault |
| B11 | Membro edita `profiles.email` (sem `WITH CHECK`) → forja badge de plano / autor na moderação | `20260323163043_…sql:49` | `WITH CHECK`; `email` read‑only p/ o dono |
| B12 | Nome de exibição sem validação → impersonar "Equipe OneMed"/suporte | `src/hooks/useRequireName.ts:32` | Validar no servidor; barrar termos reservados |
| B13 | Comentários/respostas sem limite de tamanho nem rate limit | `20260801150000_…sql:57` | `CHECK` de tamanho; rate limit; validar `parent_id` |

---

## Recomendações transversais (padrões, não pontos isolados)

1. **Autenticação de membro precisa de um fator de posse.** Todo o modelo hoje trata o e‑mail (identificador
   público) como credencial. Enquanto `member-auth-request`/`create-trial-access` resgatarem o link no servidor,
   nenhuma outra correção de acesso importa. Prioridade máxima.
2. **A anon key é PÚBLICA.** Tudo que ela alcança (RLS de SELECT/INSERT, funções sem gate de role, RPCs com
   EXECUTE para anon) é efetivamente público. Toda Edge Function "de admin" precisa de `getUser` + `has_role`
   **no código** — `verify_jwt` sozinho não basta.
3. **Fail‑closed em segredos ausentes.** Vários endpoints liberam quando `CRON_SECRET`/`MP_WEBHOOK_SECRET` faltam.
   Inverter: sem segredo configurado → recusar. E configurar os dois (estão pendentes).
4. **Uma única fonte de verdade para "acesso vigente".** Criar `has_active_entitlement(email)` que já considere
   `status` **e** `expires_at`, e usá‑la em `is_member`, no gate de login e no de streaming. Hoje cada caminho
   reimplementa a checagem e todos esquecem `expires_at`.
5. **Escrita sensível não sai do cliente.** `accesses`/`buyers` deveriam ser criados só por Edge Functions com
   service role a partir de dados validados; remover as policies públicas de INSERT.
6. **Higiene de segredos.** Nada vivo no repo; rotação após exposição; purga de histórico; parar de colar tokens
   em texto. Reavaliar `bypassPermissions` versionado.

---

## Privacidade do domínio (WHOIS) — `onemedcursos.com.br`

**Estado atual do WHOIS/RDAP (consultado em 2026-08-02):** titular **nome completo da pessoa física** + **CNPJ** +
**e‑mail** aparecem publicamente; endereço e telefone já vêm ocultos (só "Brazil"). O domínio já está sob CNPJ.

**Fato central:** domínios `.br` **não aceitam serviço de privacidade/proxy de WHOIS** (ao contrário de `.com`/`.net`).
O Registro.br exige que o titular seja a pessoa/entidade real — não existe "WhoisGuard" para `.br`. Então
"terceirizar o titular" não é uma opção legítima. O que dá para fazer é **reduzir os dados pessoais exibidos**:

1. **Trocar o e‑mail do WHOIS** (ganho rápido, faça já): no painel do Registro.br, troque o e‑mail do titular/
   contatos de `ur1fs@proton.me` para um endereço não‑pessoal, ex. `contato@onemedcursos.com.br` ou `dpo@…`. Isso
   tira seu e‑mail pessoal da vista de spammers/scrapers sem violar nada.
2. **O nome é a parte difícil.** Ele aparece porque, muito provavelmente, o CNPJ é um **MEI** cuja razão social é o
   seu próprio nome. Opções:
   - Abrir uma **SLU/LTDA** com razão social de negócio (ex.: "OneMed Cursos LTDA") e **transferir o domínio para
     esse CNPJ** → o WHOIS passa a mostrar o nome da empresa, não o seu. **Porém:** os sócios de qualquer CNPJ são
     **públicos** na Receita Federal / consultas de CNPJ — quem realmente procurar ainda chega em você. Isso
     **eleva a barreira** (um WHOIS casual não mostra seu nome), mas não anonimiza por completo.
   - **Pedido via LGPD** ao Registro.br para retificar/ocultar dado pessoal: tem base legal, mas para titular
     **CNPJ** eles tendem a manter nome/e‑mail, porque dado de registro empresarial é público por natureza.
     Alavancagem limitada aqui.
3. **DNS/hospedagem já não vazam** dado pessoal (você usa nameservers da Vercel) — esse lado está ok.
4. **Não faça:** registrar com dados falsos (viola os termos do Registro.br → risco de perder o domínio) nem tentar
   proxy offshore (não suportado para `.br`). Não vale o risco de perder o domínio de produção.

**Resumo prático:** (a) troque o e‑mail do WHOIS agora; (b) se ocultar o **nome** importa, mova o domínio para um
CNPJ com razão social de empresa — aceitando que o vínculo CNPJ→sócio continua público. Para `.br`, essa é a
privacidade máxima possível dentro das regras.

---

## Ordem sugerida de remediação

1. Rotacionar segredos (C7) + configurar `MP_WEBHOOK_SECRET` e `CRON_SECRET`.
2. Corrigir o login (C1, A2) e a enumeração (A5) — juntos.
3. Fechar `accesses`/gates de `expires_at` (C2, A7) e as funções `drive-*` abertas (C3, A3, A4, M4).
4. `send-access-email`/`whatsapp-manager`/`whatsapp-webhook`/followups (C5, C6, A8, A9).
5. Streaming: revalidação por request + rate limit + TTL curto (C4, A6, M6).
6. Integridade de pagamento (A1, M1, M2, M3) e headers/config (M8, M9).
7. Restante (médios/baixos) + higiene (bypassPermissions, histórico do git, cupons, community).
