# OneMed — Guia Completo do Projeto

> **INSTRUÇÃO OBRIGATÓRIA:** Leia este arquivo COMPLETO antes de qualquer ação em qualquer sessão.
> Este arquivo é carregado automaticamente pelo Claude Code em toda sessão.

---

## O Que É o OneMed

**OneMed** é uma plataforma SaaS de cursos médicos que vende acesso a um acervo de materiais hospedado no Google Drive. O modelo de negócio é simples: o usuário faz um trial gratuito de 30 minutos para conhecer o conteúdo e, ao final, pode comprar um plano para ter acesso permanente.

**Site em produção:** https://onemedcursos.com.br
**Repositório:** https://github.com/urifs/Onemed
**Branch principal:** `main`

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Banco de dados | Supabase PostgreSQL com RLS |
| Pagamentos | Mercado Pago (Checkout Pro) |
| Conteúdo | Google Drive (pasta compartilhada por email) |
| Emails transacionais | Resend API |
| Hospedagem frontend | Vercel |
| Autenticação admin | Supabase Auth |

---

## Credenciais e Tokens (uso direto pelo Claude)

> Use diretamente sem solicitar ao usuário. Todos os tokens abaixo estão ativos.

### Tokens de Acesso às APIs

| Serviço | Token / Valor |
|---------|--------------|
| **Supabase Management API** | `sbp_0e4b7bf71a6909b65e1d928af78863a35e811ee8` |
| **Vercel API Token** | `vcp_20YyrugF3ObL0f1W9bMxIOCgwWOduJ0euny7PuYBfC3HMeY4lV0K9wOb` |
| **Cloudflare API Token** | `cfut_U6GR6uJmiuON1dNVvBCra46fNVpy4H2d4OO6dq4Mb9b7ed40` |

### IDs e Referências dos Projetos

| Serviço | Variável | Valor |
|---------|----------|-------|
| Supabase Project Ref | `SUPABASE_PROJECT_REF` | `jrrybiohwqabsdurqudc` |
| Supabase URL | `SUPABASE_URL` | `https://jrrybiohwqabsdurqudc.supabase.co` |
| Supabase Anon Key | `VITE_SUPABASE_PUBLISHABLE_KEY` | ver `.env.example` |
| Vercel Project ID | `VERCEL_PROJECT_ID` | `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt` |
| Vercel Project Name | — | `onemed` |
| Cloudflare Account ID | — | `35d2b284ad198776e07ad0b4e7aa2e47` |
| Cloudflare Worker | — | `onemed-stream-lesson` (há também `medbrasil-stream-lesson`, de outro projeto — **não mexer**) |

> ⚠️ A API de secrets do Supabase devolve o **SHA-256** do valor, não o valor. Conferido comparando
> com o `SUPABASE_URL`, cujo valor real se conhece. Ou seja: os secrets guardados lá não podem ser
> recuperados por aqui, só sobrescritos — é por isso que o token do Cloudflare está nesta tabela.

### Secrets Configurados no Supabase (Edge Functions)

| Variável | Status | Descrição |
|----------|--------|-----------|
| `MP_ACCESS_TOKEN_PROD` | ✅ Ativo | Token de produção do Mercado Pago |
| `MP_ACCESS_TOKEN_TEST` | ✅ Ativo | Token de teste do MP |
| `GOOGLE_CLIENT_SECRET` | ✅ Ativo | Secret OAuth do Google Drive |
| `RESEND_API_KEY` | ✅ Ativo | API key do Resend para emails |
| `VERCEL_TOKEN` | ✅ Ativo | Token Vercel (armazenado, não usado nas funções) |
| `VERCEL_PROJECT_ID` | ✅ Ativo | ID do projeto Vercel (armazenado) |
| `MP_WEBHOOK_SECRET` | ⏳ Pendente | Secret HMAC do webhook MP — pegar no dashboard MP |
| `CRON_SECRET` | ⏳ Pendente | Autenticar cron jobs — gerar: `openssl rand -hex 32` |

---

## Comandos Essenciais

```bash
# Autenticar Supabase CLI
export SUPABASE_ACCESS_TOKEN="sbp_0e4b7bf71a6909b65e1d928af78863a35e811ee8"

# Deploy de uma Edge Function específica
supabase functions deploy <nome> --project-ref jrrybiohwqabsdurqudc --use-api

# Deploy de todas as Edge Functions de uma vez
for fn in create-trial-access drive-list-folders drive-oauth-callback drive-revoke-access drive-save-folder drive-share-folder mp-create-payment mp-webhook send-access-email send-followup-emails; do
  supabase functions deploy $fn --project-ref jrrybiohwqabsdurqudc --use-api
done

# Deploy do frontend (push para main — Vercel detecta automaticamente)
git add -A && git commit -m "feat: ..." && git push origin main
```

### Deploy do Worker do Cloudflare (`cloudflare/stream-lesson/worker.js`)

Não sobe junto com o frontend nem com as Edge Functions — é um deploy separado, à mão.

```bash
export CF=cfut_U6GR6uJmiuON1dNVvBCra46fNVpy4H2d4OO6dq4Mb9b7ed40
export ACC=35d2b284ad198776e07ad0b4e7aa2e47

# `keep_bindings` é OBRIGATÓRIO: sem ele o upload APAGA os secrets do worker
# (LESSON_STREAM_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) e o
# streaming cai para todos os alunos. A API não devolve o valor deles, então
# não há como recolocá-los depois — só o dono reconfigurando à mão.
echo '{"main_module":"worker.js","compatibility_date":"2024-09-23","keep_bindings":["secret_text"]}' > /tmp/meta.json

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/onemed-stream-lesson" \
  -H "Authorization: Bearer $CF" \
  -F "metadata=@/tmp/meta.json;type=application/json" \
  -F "worker.js=@cloudflare/stream-lesson/worker.js;type=application/javascript+module"
```

**Antes de subir**, baixe o que está no ar e compare com o repo — a resposta vem embrulhada em
multipart, o conteúdo fica depois de `name="worker.js"`:

```bash
curl -s ".../workers/scripts/onemed-stream-lesson" -H "Authorization: Bearer $CF"
```

**Depois de subir**, confira as duas coisas:

```bash
# 1. os 3 bindings continuam lá
curl -s ".../workers/scripts/onemed-stream-lesson/settings" -H "Authorization: Bearer $CF"
# 2. o worker sobe (500 no OPTIONS = BOOT_ERROR, igual às Edge Functions)
curl -o /dev/null -w "%{http_code}\n" -X OPTIONS "https://onemed-stream-lesson.onemed-stream.workers.dev/"
```

---

## Planos e Preços (sempre calculados no servidor)

```
lifetime:  R$ 299,90  — acesso permanente
annual:    R$ 199,00  — acesso por 12 meses
upsell:    R$  19,90  — complemento 1
upsell2:   R$   9,90  — complemento 2
```

---

## Banco de Dados — Tabelas

| Tabela | Descrição | Campos principais |
|--------|-----------|-------------------|
| `accesses` | Todos os acessos (trial e pago) | `email`, `access_type` (trial/paid/lifetime/annual), `status` (active/expired/revoked), `expires_at`, `drive_permission_id` |
| `buyers` | Compradores com dados do pagamento | `email`, `plan`, `amount`, `status` (pending/approved/cancelled), `external_reference`, `access_granted`, `payment_id` |
| `coupons` | Cupons de desconto | `code`, `discount_percent`, `active`, `max_uses`, `times_used`, `expires_at` |
| `visits` | Analytics de visitas na landing | `page`, `created_at` |
| `drive_config` | Tokens OAuth do Google Drive | `folder_id`, `folder_name`, `connected`, `access_token`, `refresh_token`, `token_expiry` |
| `email_followups` | Controle de deduplicação de follow-ups | `email`, `type` (followup_1d/7d/30d) |
| `user_roles` | Autorização admin | `user_id`, `role` ('admin') |
| `rate_limits` | Contadores de rate limiting | `identifier`, `action`, `attempts`, `window_start` |

**RLS:** Ativo em todas as tabelas. Admins têm acesso total via função `has_role('admin')`.

---

## Rotas do Frontend

| Rota | Componente | Tipo | Finalidade |
|------|-----------|------|------------|
| `/` | `Index.tsx` | Público | Landing page + solicitação de trial |
| `/checkout` | `CheckoutPage.tsx` | Público | Wizard de compra em 4 etapas |
| `/payment/success` | `PaymentSuccessPage.tsx` | Público | Pós-pagamento aprovado |
| `/payment/error` | `PaymentErrorPage.tsx` | Público | Pagamento recusado |
| `/payment/pending` | `PaymentPendingPage.tsx` | Público | Pagamento em análise |
| `/claim-access` | `ClaimAccessPage.tsx` | Público | Reivindicar acesso (pagamento pendente) |
| `/termos` | `TermsPage.tsx` | Público | Termos de uso |
| `/privacidade` | `PrivacyPage.tsx` | Público | Política de privacidade |
| `/admin/login` | `LoginPage.tsx` | Público | Login admin |
| `/admin/register` | `RegisterPage.tsx` | Público | Cadastro admin |
| `/admin` | `Dashboard.tsx` | Protegido | Métricas diárias |
| `/admin/access` | `AccessManagement.tsx` | Protegido | Gerenciar acessos (fluxo antigo de trial/Drive) |
| `/admin/membros` | `MembersPage.tsx` | Protegido | Gerenciar acesso à área de membros (cursos) |
| `/admin/buyers` | `BuyersPage.tsx` | Protegido | Gerenciar compradores |
| `/admin/trials` | `TrialUsersPage.tsx` | Protegido | Ver usuários trial (exclui convertidos) |
| `/admin/coupons` | `CouponsPage.tsx` | Protegido | CRUD de cupons |
| `/admin/drive` | `DriveSettings.tsx` | Protegido | Configurar Google Drive |
| `/admin/database` | `DatabasePage.tsx` | Protegido | Visualizador do banco |

---

## Edge Functions

| Função | Acionado por | Descrição |
|--------|-------------|-----------|
| `create-trial-access` | Frontend (landing) | Cria trial de 30min de acesso à área de membros + login instantâneo (sem Drive) + envia email |
| `mp-create-payment` | Frontend (checkout) | Valida plano, calcula preço, gera preferência MP |
| `mp-webhook` | Mercado Pago (HTTP) | Processa pagamento aprovado → libera acesso permanente |
| `drive-share-folder` | Interna (service-to-service) | Compartilha pasta Drive com email via Google API |
| `drive-revoke-access` | Cron (*/5 min) | Revoga trials expirados, remove permissão do Drive |
| `drive-oauth-callback` | Frontend (OAuth flow) | Troca authorization code por tokens Google |
| `drive-list-folders` | Admin panel | Lista pastas disponíveis no Drive |
| `drive-save-folder` | Admin panel | Salva a pasta configurada para compartilhamento |
| `send-access-email` | Interna | Envia email de boas-vindas (trial ou compra) |
| `send-followup-emails` | Cron (13h UTC diário) | Envia follow-ups 1d/7d/30d para trials expirados |

---

## Fluxos Detalhados

### Fluxo 1 — Trial Gratuito

**Objetivo:** Dar ao usuário 30 minutos de acesso direto à área de membros (`/membros`).

> Reescrito em 2026-07-19 — **não compartilha mais pasta do Google Drive.** O trial
> antigo (que dava acesso a uma pasta do Drive) foi substituído por acesso real à
> plataforma de cursos nova, igual a um comprador, só que por tempo limitado.

```
Usuário acessa / (landing)
  → visita registrada na tabela visits
  → usuário preenche email + WhatsApp + país
  → frontend chama create-trial-access
      ├── valida formato de email (regex)
      ├── verifica rate limit (5 tentativas / 15min por IP)
      ├── verifica se já é comprador aprovado → 409
      ├── verifica se já tem trial ativo → devolve sessão (login instantâneo) + tempo restante
      ├── verifica se já usou trial (expirado) → 409
      ├── cria registro em accesses (access_type='trial', expires_at=now+30min)
      ├── gera sessão instantânea (mesmo truque de magiclink/signup do member-auth-request)
      │     e chama enforce_session_limit (máx. 2 dispositivos simultâneos por conta)
      └── chama send-access-email tipo 'trial_access' (fire-and-forget) — aponta pra /login
  → frontend faz supabase.auth.setSession() com os tokens recebidos e redireciona pra /membros
  → TrialCountdownBar (widget flutuante) mostra o tempo restante + botão "Adquirir Acesso"
  → ao expirar, redireciona pra /checkout
```

**Tabelas afetadas:** `accesses` (insert), `rate_limits` (update), `visits` (insert)

---

### Fluxo 2 — Checkout e Pagamento

**Objetivo:** Processar o pagamento e registrar o comprador.

```
Usuário clica em comprar
  → redireciona para /checkout
  → Step 1: seleciona plano (Annual R$199 ou Lifetime R$299,90)
  → Step 2: seleciona upsells opcionais (R$19,90 e R$9,90)
  → Step 3: preenche nome, email, WhatsApp, país
      ├── frontend gera externalReference (UUID)
      ├── insere registro em buyers (status='pending', access_granted=false)
      └── chama mp-create-payment
            ├── valida rate limit (10 tentativas / hora por email)
            ├── valida plano (só 'lifetime' ou 'annual')
            ├── valida cupom se informado (ativo, dentro do limite, não expirado)
            ├── calcula preço FINAL no servidor (base + desconto + upsells)
            ├── cria preferência no Mercado Pago com:
            │     external_reference, notification_url, back_urls
            ├── atualiza buyers com payment_id e amount calculado
            └── retorna init_point (URL do checkout MP)
  → frontend redireciona para init_point (Mercado Pago)
  → usuário completa pagamento no MP
  → MP redireciona para /payment/success?payment_id=...&external_reference=...
```

**Tabelas afetadas:** `buyers` (insert + update), `coupons` (increment times_used), `rate_limits` (update)

---

### Fluxo 3 — Webhook do Mercado Pago

**Objetivo:** Confirmar o pagamento e liberar o acesso permanente.

```
Mercado Pago envia POST para mp-webhook
  → verifica assinatura HMAC (se MP_WEBHOOK_SECRET configurado)
  → extrai payment_id do body (formato V2 ou IPN)
  → consulta pagamento na API do MP
  → extrai external_reference e status
  → busca buyer em buyers por external_reference
  → atualiza buyers.status e buyers.payment_id

  SE status === 'approved':
    ├── verifica se access_granted já é true → ignora (idempotência)
    ├── atualiza buyers.access_granted = true
    ├── insere em accesses (access_type='paid', status='active')
    ├── chama drive-share-folder (fire-and-forget)
    └── chama send-access-email tipo 'payment_approved' (fire-and-forget)
```

**Tabelas afetadas:** `buyers` (update), `accesses` (insert)

---

### Fluxo 4 — Compartilhamento do Google Drive

**Objetivo:** Dar ao usuário permissão de leitura na pasta configurada.

```
drive-share-folder recebe { email, accessId? }
  → autentica via bearer token (service role key, constant-time compare)
  → busca drive_config no banco (folder_id, access_token, refresh_token)
  → verifica se token expirou → chama token refresh no Google
  → POST na Google Drive API: files/{folderId}/permissions
      body: { role: 'reader', type: 'user', emailAddress: email }
  → se accessId fornecido: atualiza accesses.drive_permission_id com o ID retornado
  → retorna { success: true, permissionId }
```

**Tabelas afetadas:** `drive_config` (update token se renovado), `accesses` (update drive_permission_id)

---

### Fluxo 5 — Revogação Automática de Trials (Cron)

**Objetivo:** Remover acesso de trials expirados do Google Drive.

```
Cron job roda a cada 5 minutos → POST em drive-revoke-access
  → verifica x-cron-secret
  → busca accesses onde access_type='trial' E expires_at <= now E status='active'

  Para registros SEM drive_permission_id:
    → apenas marca status='expired'

  Para registros COM drive_permission_id:
    ├── busca drive_config (refresh token se necessário)
    ├── DELETE na Google Drive API: files/{folderId}/permissions/{permissionId}
    ├── marca status='expired'
    └── limpa drive_permission_id

  → retorna { revoked, markedExpired, errors }
```

**Tabelas afetadas:** `accesses` (update status)

---

### Fluxo 6 — Emails de Follow-up (Cron)

**Objetivo:** Reengajar usuários que fizeram trial e não compraram.

```
Cron job roda diariamente às 13h UTC → POST em send-followup-emails
  → verifica x-cron-secret

  Para cada sequência (1d, 7d, 30d):
    ├── busca accesses onde:
    │     access_type='trial' E status='expired'
    │     E expires_at está no janela de ±2h do alvo
    ├── exclui quem já recebeu esse tipo (email_followups)
    ├── exclui compradores aprovados (buyers.status='approved')
    ├── envia email via Resend com cupom exclusivo
    └── registra em email_followups para evitar reenvio

Sequências:
  1d  → "Sentimos sua falta!" → cupom ONEMED10 (10% off)
  7d  → "Uma semana se passou..." → cupom ONEMED20 (20% off)
  30d → "Última chance!" → cupom ONEMED30 (30% off)
```

**Tabelas afetadas:** `email_followups` (insert)

---

### Fluxo 7 — OAuth do Google Drive

**Objetivo:** Conectar a conta Google do Drive ao sistema.

```
Admin acessa /admin/drive
  → clica em "Conectar Google Drive"
  → frontend redireciona para accounts.google.com/o/oauth2/v2/auth
      params: client_id, redirect_uri=/admin/drive, scope=drive, access_type=offline

  Google redireciona de volta para /admin/drive?code=AUTH_CODE
    → frontend extrai code
    → chama drive-oauth-callback com { code, redirect_uri }
        ├── POST em oauth2.googleapis.com/token (troca code por tokens)
        ├── recebe access_token, refresh_token, expires_in
        └── upsert em drive_config: connected=true, tokens, expiry

  Admin lista pastas disponíveis (drive-list-folders)
  Admin seleciona pasta (drive-save-folder → atualiza drive_config.folder_id)
```

**Tabelas afetadas:** `drive_config` (upsert)

---

### Fluxo 8 — Autenticação Admin

**Objetivo:** Proteger o painel administrativo.

```
Acesso a qualquer rota /admin/*
  → ProtectedRoute verifica AuthContext
  → se sem sessão → redireciona para /admin/login

Login:
  → supabase.auth.signInWithPassword(email, password)
  → verifica role admin via RPC has_role(user_id, 'admin')
  → se não for admin → logout + erro

Registro:
  → supabase.auth.signUp(email, password)
  → insere em user_roles: { user_id, role: 'admin' }
```

---

### Fluxo 9 — Painel Admin (operações manuais)

**AccessManagement `/admin/access`:**
- Lista todos os acessos (trial + pago) com filtros
- Criar acesso manual: chama `drive-share-folder` automaticamente
- Ações: renovar (+30 min), revogar, excluir

**BuyersPage `/admin/buyers`:**
- Lista compradores aprovados com receita diária
- Criar comprador manual (para acessos administrativos)
- Excluir comprador

**TrialUsersPage `/admin/trials`:**
- Lista trials **excluindo** quem já converteu para comprador aprovado
- Filtra por status (ativo/expirado)
- Link direto para WhatsApp de cada usuário

**CouponsPage `/admin/coupons`:**
- CRUD completo de cupons
- Controle de `max_uses`, `times_used`, `expires_at`
- Toggle ativo/inativo

---

## Estrutura de Arquivos

```
onemed/
├── src/
│   ├── pages/
│   │   ├── Index.tsx                # Landing page + trial signup
│   │   ├── CheckoutPage.tsx         # Checkout 4 etapas
│   │   ├── PaymentSuccessPage.tsx   # Pós-pagamento
│   │   ├── PaymentErrorPage.tsx
│   │   ├── PaymentPendingPage.tsx
│   │   ├── ClaimAccessPage.tsx      # Reivindicar acesso pendente
│   │   ├── Dashboard.tsx            # Admin: métricas diárias
│   │   ├── AccessManagement.tsx     # Admin: gerenciar acessos
│   │   ├── BuyersPage.tsx           # Admin: compradores
│   │   ├── TrialUsersPage.tsx       # Admin: trials (sem convertidos)
│   │   ├── CouponsPage.tsx          # Admin: cupons
│   │   ├── DriveSettings.tsx        # Admin: Google Drive OAuth
│   │   ├── DatabasePage.tsx         # Admin: visualizador DB
│   │   ├── LoginPage.tsx            # Admin: login
│   │   └── RegisterPage.tsx         # Admin: registro
│   ├── components/
│   │   ├── AdminLayout.tsx          # Layout + monta PWA head
│   │   └── AdminPWAHead.tsx         # Meta tags PWA para /admin
│   ├── context/
│   │   └── AuthContext.tsx          # Sessão + verificação de role admin
│   ├── integrations/supabase/
│   │   ├── client.ts                # Cliente Supabase
│   │   └── types.ts                 # Tipos gerados do DB
│   ├── lib/
│   │   └── utils.ts                 # formatDateTimeSP, todayStartISO, etc.
│   └── App.tsx                      # Roteamento + ProtectedRoute
├── supabase/
│   ├── config.toml                  # project_id: jrrybiohwqabsdurqudc
│   ├── functions/
│   │   ├── create-trial-access/index.ts
│   │   ├── mp-create-payment/index.ts
│   │   ├── mp-webhook/index.ts
│   │   ├── drive-share-folder/index.ts
│   │   ├── drive-revoke-access/index.ts
│   │   ├── drive-oauth-callback/index.ts
│   │   ├── drive-list-folders/index.ts
│   │   ├── drive-save-folder/index.ts
│   │   ├── send-access-email/index.ts
│   │   └── send-followup-emails/index.ts
│   └── migrations/
│       ├── 20260323163043_*.sql     # Schema inicial, RLS, policies
│       ├── 20260323163104_*.sql     # Policy fixes
│       ├── 20260324002232_*.sql     # drive_permission_id
│       ├── 20260324002357_*.sql     # pg_cron setup
│       ├── 20260324034623_*.sql     # email_followups table
│       ├── 20260324203337_cron_jobs.sql  # Cron jobs (token hardcoded)
│       ├── 20260326000001_rate_limits.sql  # ⏳ Aplicar: tabela rate_limits
│       └── 20260326000002_fix_cron_jobs.sql  # ⏳ Aplicar: cron sem hardcode
├── public/
│   ├── admin-manifest.json          # PWA manifest (scope /admin)
│   ├── admin-sw.js                  # Service Worker para /admin
│   └── icons/
│       ├── admin-icon.svg
│       ├── admin-icon-192.png
│       └── admin-icon-512.png
├── .env.example                     # Chaves públicas do Supabase
├── vercel.json                      # SPA rewrite: /* → /index.html
└── CLAUDE.md                        # Este arquivo
```

---

## Segurança

### Implementado e Ativo ✅
- **CORS restrito:** todas as 10 funções aceitam apenas `onemedcursos.com.br`
- **HMAC webhook MP:** verificação de assinatura via `x-signature` (ativo quando `MP_WEBHOOK_SECRET` configurado)
- **Rate limiting:** `create-trial-access` (5/15min por IP) e `mp-create-payment` (10/hora por email)
- **Constant-time compare:** `drive-share-folder` usa HMAC para comparar service key
- **Validação de email:** regex em `create-trial-access`
- **Preços server-side:** nunca confia em valor enviado pelo cliente
- **RLS:** ativo em todas as tabelas
- **CRON_SECRET:** `drive-revoke-access` e `send-followup-emails` verificam header `x-cron-secret`

### Pendente de Configuração Manual ⏳
1. Adicionar `MP_WEBHOOK_SECRET` nos Supabase Secrets (pegar no dashboard MP → Webhooks)
2. Gerar `CRON_SECRET`: `openssl rand -hex 32` → adicionar em Secrets e no Vault
3. Aplicar migrations: `20260326000001_rate_limits.sql` e `20260326000002_fix_cron_jobs.sql`

### Problemas Conhecidos

**Alta prioridade:**
- `MP_WEBHOOK_SECRET` não configurado → webhook aceita qualquer requisição
- `CRON_SECRET` não configurado → cron jobs sem autenticação
- Migrations `rate_limits` e `fix_cron_jobs` não aplicadas

**Média prioridade:**
- `ClaimAccessPage` escreve direto no banco pelo frontend — usuário com `external_reference` válido pode se auto-conceder acesso

**Baixa prioridade:**
- `access_type` inconsistente: webhook salva `'paid'`, ClaimAccessPage salva `'lifetime'`/`'annual'`
- Preços nos emails de follow-up são strings hardcoded
- Tabela `rate_limits` sem limpeza automática
- Comparação do `CRON_SECRET` não usa constant-time

---

## Histórico de Mudanças

### 2026-03-26 (sessão local)
- Projeto sincronizado com GitHub para acesso via Claude Code mobile
- 6 vulnerabilidades corrigidas: HMAC webhook, token hardcoded no SQL, rate limiting, constant-time compare, CORS `*`, validação de email
- 2 migrations criadas: `rate_limits` e `fix_cron_jobs`
- 10 Edge Functions deployadas e testadas em produção

### 2026-03-26 (sessão remota)
- Secrets verificados e configurados no Supabase
- `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` adicionados ao Supabase Secrets
- PWA exclusiva para o painel admin implementada
- `.claude/settings.json` criado com `"defaultMode": "bypassPermissions"`

### 2026-03-28 (sessão remota)
- `TrialUsersPage`: lista de trials agora exclui usuários que compraram (busca buyers aprovados em paralelo e filtra por email)
- CLAUDE.md reescrito com documentação completa de todos os fluxos e credenciais

### 2026-05-15 (sessão remota — Meta Ads + CAPI) — PR #2

**Problema:** Pixel client-side perdia atribuição de compras após redirect do Mercado Pago.
Causa: iOS Safari e bloqueadores destroem o cookie `_fbp` durante o redirect externo.
Solução: Meta Conversions API (CAPI) server-side disparado diretamente no `mp-webhook`.

**Arquivos alterados:**

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/mp-webhook/index.ts` | Adicionada `sendMetaCAPIEvent()` — dispara evento `Purchase` server-side para ambos os pixels quando `status === 'approved'` |
| `src/pages/CheckoutPage.tsx` | Captura cookies `_fbp` e `_fbc` no insert da tabela `buyers` via `getCookie()` |
| `src/pages/PaymentSuccessPage.tsx` | Passa `eventID: "purchase_${paymentId}"` ao pixel client-side para deduplicação |
| `src/lib/pixel.ts` | Parâmetro `eventId?` adicionado em `trackPurchase()` |
| `supabase/migrations/20260515000001_buyers_meta_capi.sql` | Colunas `fbp TEXT` e `fbc TEXT` adicionadas à tabela `buyers` |

**Fluxo CAPI implementado:**
```
Checkout → captura _fbp/_fbc → salva em buyers.fbp / buyers.fbc
Compra aprovada MP → mp-webhook → status === 'approved'
  → sendMetaCAPIEvent()
    → SHA-256(email) + SHA-256(phone) + SHA-256(first/last name)
    → fbp e fbc passados sem hash (são IDs de browser, não PII)
    → POST para ambos os pixels via Graph API v19.0
    → event_id: "purchase_{paymentId}" ← deduplica com pixel client-side
```

**Secret necessário no Supabase:**

| Variável | Status | Descrição |
|----------|--------|-----------|
| `META_CAPI_ACCESS_TOKEN` | ✅ Configurado | Long-lived token 60d, vence **2026-07-14** |

---

### 2026-07-18 (sessão remota) — acesso de admin à área de membros

**Problema relatado:** "menu hamburguer com as categorias não aparece no mobile" em `/membros`.

**Investigação:** o componente `CategorySidebar` e o build de CSS/Tailwind foram auditados e
reproduzidos localmente (build idêntico ao bundle de produção, byte a byte) — ambos corretos,
o `md:hidden`/`md:block` geram media queries normalmente. O sintoma real era outro: o dono da
conta (admin, sem nunca ter feito trial ou comprado um plano) não conseguia sequer entrar em
`/membros`, porque `member-auth-request` (o gate do login por magic link) só liberava o link
para emails com linha ativa em `accesses` ou `buyers` — `is_member()` já tinha bypass de admin
(migration `20260718160000_is_member_admin_bypass.sql`), mas esse bypass nunca era alcançado
porque o login era bloqueado antes.

**Correção:**

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/20260718200000_member_auth_admin_bypass.sql` | Nova função `is_admin_email(_email)` — checa se o email pertence a um usuário com role `admin` |
| `supabase/functions/member-auth-request/index.ts` | Gate do magic link agora libera também quando `is_admin_email` é true, sem exigir trial/compra |
| `src/pages/MembersPage.tsx` (novo, rota `/admin/membros`) | Página dedicada de gerenciamento da área de membros: lista de membros (grants manuais + compradores), diálogo "Conceder Acesso" (Vitalício/Anual, sem acoplar com Drive), stats de cursos/categorias, botão "Abrir Área de Membros" |
| `src/components/AdminLayout.tsx` | Novo item de navegação "Área de Membros" → aponta para `/admin/membros` (dentro do painel, não mais um link externo cru) |

`AccessManagement.tsx` (`/admin/access`) é do fluxo antigo de trial via Google Drive
(duração em minutos, compartilhamento automático de pasta) — não serve para conceder acesso
à plataforma de cursos nova. `MembersPage` insere direto em `accesses` com `access_type`
`lifetime`/`annual` e `status='active'`, sem chamar `drive-share-folder`.

---

### 2026-07-19/20 (sessão remota) — trial sem Drive, limite de dispositivos, correções na área de membros

**Trial gratuito reescrito** (ver Fluxo 1 acima): `create-trial-access` parou de compartilhar
pasta do Google Drive e passou a dar acesso direto à área de membros por 30 min, com login
instantâneo (mesmo redeem de magiclink/signup do `member-auth-request`). `TrialCountdownBar.tsx`
(novo) é o widget flutuante com o tempo restante + botão "Adquirir Acesso" (`→ /checkout`),
montado no `MemberHeader`. `TrialSuccessSection.tsx` (tela antiga de instruções do Drive) foi
removida. Email de boas-vindas do trial (`send-access-email`) aponta pra `/login` em vez do Drive.

**Bug encontrado e corrigido:** `member-account-info` excluía explicitamente
`access_type='trial'` da busca (resquício de quando só existia pra compradores) — todo usuário em
trial recebia `plan: null`, então o contador flutuante nunca aparecia e o menu de conta
(`AccountMenu.tsx`) mostrava Plano/Acesso em branco. Corrigido pra incluir trial quando não há
plano pago/vitalício ativo; `AccountMenu` agora mostra "Teste Grátis (30 min)" com contagem
regressiva em mm:ss ao vivo e troca "Renovar Assinatura" por "Adquirir Acesso Completo" pra quem
está em trial.

**Limite de 2 dispositivos simultâneos por conta:** nova função `enforce_session_limit(user_id,
max_sessions=2)` (migration `20260719210000_enforce_session_device_limit.sql`) apaga as sessões
mais antigas de `auth.sessions` além do limite — como `auth.refresh_tokens` referencia a sessão,
isso invalida o refresh token do dispositivo mais antigo. Chamada logo após todo login na área de
membros (`member-auth-request` e `create-trial-access`). `AuthContext` agora distingue um
`SIGNED_OUT` manual de um forçado (refresh token morto) e dispara `KickedOutModal.tsx` (novo,
montado no root do `App.tsx`) explicando que a conta já está em outros 2 dispositivos e que um
novo login derrubou esta sessão, com botão de WhatsApp pro suporte caso não tenha sido o próprio
usuário.

**Outros ajustes:** captcha simples ("Não sou um robô", 3s de trava) em `/login`; botão "Entrar"
no header da landing (`LandingHeader.tsx`) linkando pra `/login`; resultado da importação em
massa de emails em `/admin/membros` (que já ignorava emails que já tinham acesso, sem duplicar)
ganhou destaque visual com ícones/cores por categoria (concedidos/já tinham acesso/inválidos).

---

### 2026-07-27 (sessão remota) — incidente de deploy, limpeza de duplicatas, upgrade sem desconto, threads de comentários, detalhes do plano

**Incidente em produção:** deploy via `PATCH .../functions/{slug}` (raw, sem multipart) corrompeu
silenciosamente 6-7 Edge Functions (`BOOT_ERROR` em produção por ~8h, function aparecia "ACTIVE"
na API mas falhava ao subir). Corrigido redeployando todas via multipart
`POST .../functions/deploy?slug={slug}`, que é o único método de deploy confiável neste ambiente
(CLI `supabase functions deploy` falha com `TransportError` pelo proxy). Nenhum pagamento
aprovado foi perdido no incidente — todos os `buyers` afetados estavam `status:'pending'` sem
`payment_id`.

**3 novos planos:** `monthly` (R$49,90/30 dias), `lifetime_plus` (R$599 — vitalício + backup no
Drive do usuário + 4 telas), `lifetime_pro` (R$997 — tudo do Plus + IA Meduf + download em massa
na plataforma). Preços/labels/features centralizados em `src/lib/plans.ts`; `mp-create-payment` e
`mp-webhook` reescritos com lookups por tabela (`PLAN_PRICES`, `LIFETIME_TIER_RANK`) em vez de
ternários binários lifetime/annual.

**Bug sistêmico de linhas duplicadas em `accesses`:** `MembersPage.tsx` sempre fazia `insert()` ao
conceder acesso, nunca verificando se já existia uma linha ativa — 448 emails com múltiplas linhas
`active` simultâneas (a mais antiga desde março/2026). Corrigido: `grantAccess()` agora
UPDATE-ou-INSERT; `member-account-info`/`member-auth-request` passaram a resolver por
maior-tier-entre-todas-as-linhas em vez de "a primeira que a query retornar"; 464 linhas antigas
revogadas (não deletadas) em produção, autorizado explicitamente pelo usuário.

**Upgrade de plano sempre mostrando preço cheio:** contas com acesso concedido manualmente (sem
linha em `buyers`) tinham `amountPaid = 0`, então o cálculo de desconto do upgrade sempre dava o
preço cheio. Corrigido em `member-account-info` e `mp-create-payment`: quando não há valor real
pago, usa o preço de tabela do plano atual como "já investido" — upgrade sempre mostra só a
diferença, pago ou concedido manualmente.

**Threads aninhadas de comentários:** `community_replies`/`course_comments_feed` reescritas com
`WITH RECURSIVE` (coluna `parent_id`, contagem recursiva de `reply_count`); novo componente
compartilhado `CommentThread.tsx` (usado em `CommunityPage.tsx` e `CommunityTab.tsx`) permite
responder qualquer resposta, não só o comentário raiz.

**Tela de Detalhes do Plano:** botão "Detalhes do Plano" no `AccountMenu.tsx` abre
`PlanDetailsModal.tsx` — mostra plano, benefícios, valor pago, vencimento, telas simultâneas, data
de concessão, e-mail e WhatsApp. `member-account-info` passou a retornar `whatsapp`/`grantedAt`.

**Outros:** card duplicado "Online agora" removido de `/admin/membros` (já existe versão em tempo
real — Realtime Presence — no Dashboard `/admin`); pin de tópicos na comunidade (só admin) e edição
de comentário próprio; favoritar aulas/arquivos individualmente (aba Favoritos separada por
cursos/aulas/arquivos); limite de 4 telas simultâneas pra Vitalício Plus/Pro (era 2).

**Token do Supabase Management API rotacionado** nesta sessão (o anterior passou a retornar 401
em qualquer endpoint) — valor atual já refletido na tabela de credenciais no topo deste arquivo.

**Tela de Detalhes do Plano:** botão "Detalhes do Plano" no `AccountMenu.tsx` abre
`PlanDetailsModal.tsx` — plano, benefícios, valor pago, vencimento, telas simultâneas, data de
concessão, e-mail e WhatsApp. `member-account-info` retorna `whatsapp`/`grantedAt`.

**Vitalício Pro passa a ter 6 telas simultâneas** (era 4, igual ao Plus). `PLAN_DEVICE_LIMITS` em
`plans.ts`/`member-auth-request` substituiu o `PREMIUM_DEVICE_PLANS` (Set binário) por um mapa
plano→limite.

**Correções pontuais:** categoria "Favoritos" em `/membros` agora sempre aparece na sidebar (antes
só aparecia com cursos favoritados, escondendo a opção de quem só tinha aulas/arquivos
favoritados); botão "Adquirir Acesso Completo" na landing virou um botão de verdade (antes era só
um link de texto discreto abaixo do CTA de trial).

**Mapa de usuários no dashboard admin:** novo card `MemberLocationsMap.tsx`, abaixo de "Quem está
online", com Leaflet + tiles CARTO (dark/light conforme o tema). Online mostra qualquer tipo de
acesso, inclusive trial; offline só assinantes com plano pago ativo — trial que saiu do ar some do
mapa. Localização aproximada por IP, capturada a cada login bem-sucedido (`member-auth-request` e
`create-trial-access`) via `ipwho.is` (testado — `ipapi.co` retorna 429 rate-limited quase sempre
a partir de IPs de datacenter/serverless compartilhados) e gravada em `member_locations` (nova
tabela). Nova RPC `get_member_locations_map` (admin-only) cruza essa tabela com `auth.sessions`
(online/offline) e `accesses` (trial vs assinante). De quebra, corrigido bug preexistente em
`member-auth-request`: a extração de IP não tinha fallback pra `x-real-ip` quando
`x-forwarded-for` vinha vazio — o rate limit por IP nunca pegava o IP real.

**Bug crítico na sincronização — 24 cursos nunca importados:** usuário reportou que um curso
existente no Drive (link de uma subpasta) não aparecia na plataforma. Investigação achou a causa
raiz em `member-sync-library`: quando duas pastas de nível superior no Drive têm exatamente o
mesmo nome (ex: duas turmas diferentes ambas chamadas "Medcof 2024"), a função gerava o mesmo
slug pras duas e, ao ver que o slug já existia, **pulava a segunda pasta pra sempre** como
"duplicata" — mesmo sendo conteúdo completamente diferente. Comparando a lista completa de pastas
de nível superior do Drive (404 pastas) contra `courses.drive_folder_id`, todas as 24 pastas
faltantes bateram exatamente nesse bug (slug colidindo com curso já existente). Corrigido:
quando o slug colide, desambigua com os últimos 6 caracteres do ID da pasta (estável, único) em
vez de descartar o curso — deployado em produção. Os 24 cursos faltantes foram importados
manualmente nesta sessão (207.689 lições/arquivos, 15.078 módulos no total após a importação,
404 cursos no total = paridade completa com as 404 pastas de nível superior do Drive). Uma
próxima "Sincronizar biblioteca" pelo painel admin já vai funcionar normalmente para casos
futuros com nomes repetidos, sem precisar de intervenção manual.

**Bug crítico — 1418 aulas .ts nunca tocavam:** clientes relatando que aulas com nome terminando
em "#Aprenda.ts" nunca abriam. Causa: `mime_type` real dessas aulas é `video/mp2t` (MPEG Transport
Stream) — nenhum navegador toca esse container num `<video src>` nativo, mesmo os codecs internos
(H.264/AAC) sendo suportados normalmente num `.mp4`. Corrigido em `LessonPlayer.tsx` com
`mpegts.js` (novo pacote), que remuxa TS → fragmented MP4 no próprio navegador via MediaSource
Extensions, reaproveitando a mesma URL autenticada do `stream-lesson` Worker (Cloudflare) sem
precisar reprocessar nada no servidor/Drive — biblioteca carregada sob demanda (import dinâmico,
chunk separado de ~64KB gzip) só quando uma aula `.ts` é aberta de fato.

---

### 2026-07-29 (sessão remota) — benefícios de upgrade, planos redefinidos, badges/anéis de plano na comunidade

**Modal de upgrade mostrando só a diferença:** cliente não via o que ganhava a mais em cada opção
de upgrade, só preço com desconto. `UpgradePlanModal.tsx` agora calcula `newFeatures` (diferença
de conjunto entre `PLAN_FEATURES[currentPlan]` e `PLAN_FEATURES[targetPlan]`) e lista só os
benefícios novos sob "O que você ganha a mais", por opção de upgrade.

**Benefícios por plano redefinidos** em `src/lib/plans.ts` (`PLAN_FEATURES`) e espelhados nos
cards do `CheckoutPage.tsx`, usando os mesmos textos literais entre planos vizinhos de propósito
(pra o diff acima funcionar): Mensal (1 tela, acesso 1 mês), Anual (2 telas, atualizações mensais,
acesso 1 ano), Vitalício (2 telas, atualizações mensais, acesso vitalício), Vitalício Plus (4
telas, atualizações mensais, backup no Drive próprio, downloads liberados), Vitalício Pro (6
telas, atualizações mensais + semanais, backup no Drive próprio, downloads liberados em massa,
acesso a todas as atualizações sem depender de nenhuma colaboração, IA de diagnósticos Meduf).

**Rótulo + anel de plano na comunidade:** nova migration `20260729010000_community_plan_badges.sql`
com `member_plan_tier(_user_id)` (mesmo critério de "maior tier entre linhas ativas" já usado em
`get_member_locations_map`, só que resolvendo por `user_id` via `profiles.email → accesses.email`
em vez de email direto) — `community_feed`, `community_replies` e `course_comments_feed` passaram
a devolver `plan` junto com `is_admin`. Novo `src/components/member/PlanBadge.tsx` exporta
`<PlanAvatarRing>` (anel ao redor do avatar) e `<PlanBadge>` (pill com o nome do plano), plugados
em `CommunityPage.tsx`, `CommunityTab.tsx` e `CommentThread.tsx`. Mensal fica sem anel; Anual
ganha anel vermelho claro (`ring-primary/40`); Vitalício ganha anel vermelho cheio (`ring-primary`);
Vitalício Plus ganha anel laranja; Vitalício Pro ganha um anel dourado girando (conic-gradient +
nova animação Tailwind `spin-slow`, já que o `ring` do Tailwind não anima cor/rotação — só planos
Pro pagam esse custo extra de DOM/CSS). Admin sempre mantém só o badge "Equipe OneMed" (sem anel
de plano, mesmo que tenha um acesso concedido).

---

### 2026-07-31 (sessão remota) — 58 aulas .wmv migradas do Drive pro Supabase Storage

**Problema relatado:** cliente mandou print de "No video with supported format and MIME type
found" — o erro nativo do `<video>` do Chrome quando o container/codec não é suportado por nenhum
navegador. Diferente do bug do `.ts` (mpegts.js só resolveu porque o codec ali, H.264/AAC, já era
nativo do navegador — só o container MPEG-TS precisava de remux). `.wmv` usa WMV3/VC-1, que não
tem NENHUM decoder nativo em navegador nem equivalente ao truque do mpegts.js — precisa
retranscodificar de verdade.

**Achadas 58 aulas** com `mime_type = 'video/x-ms-wmv'` (curso "Eletrocardiograma - InCor",
duplicado como duas entradas de curso — 29 aulas em cada). ffmpeg foi instalado neste ambiente
(`apt-get install ffmpeg`, tem decoders wmv1/2/3 e vc1) e usado para transcodificar cada aula pra
mp4 (h264/aac, `-crf 28 -maxrate 250k -bufsize 500k -b:a 64k`, tunado pro conteúdo de baixa
resolução — câmera + slides).

**Bloqueio real: a conta do Google Drive conectada está acima da cota de armazenamento** (18,9GB
usados de 15GB). Confirmado com um teste isolado: PATCH de metadado no arquivo (sem trocar
conteúdo) → 200 OK; PATCH com o conteúdo do vídeo mp4 (mesmo sendo menor que o wmv original) →
`403 Forbidden`. O Google recusa qualquer upload de mídia nova na conta, independente do arquivo
final ficar menor. Sem espaço liberado na conta, os arquivos corrigidos não podem voltar pro Drive.

**Solução: bucket próprio no Supabase Storage** (`lesson-media`, privado) em vez do Drive pra essas
58 aulas especificamente. Nova coluna `lessons.storage_path` (migration
`20260730230000_lesson_storage_path.sql`) — quando preenchida, `member-lesson-token` assina uma URL
do Storage em vez de gerar o link pro Worker/Drive (zero mudança no frontend, `LessonPlayer` só
consome a URL que vier). Também precisou subir o limite de tamanho de arquivo do Storage — o padrão
do projeto era 50MB (tanto a config global do projeto quanto o bucket têm esse limite
independentemente), baixo demais pros vídeos de aula (~50-150MB); subido pra 500MB via Management
API (`PATCH /v1/projects/{ref}/config/storage` + `PUT /storage/v1/bucket/lesson-media`).

**Processamento em lote:** rodado neste ambiente (baixa do Drive com o `access_token` já salvo em
`drive_config`, transcodifica, sobe pro Storage, atualiza `lessons.mime_type`/`storage_path`) — 58
arquivos, ~5,72GB originais → ~3,00GB finais (~47% menor, cabe folgado mesmo se algum dia migrar de
volta). Durante o lote, duas quedas transitórias breves (~1-2s) da API de management do Supabase
causaram 9 falhas em cascata (`get_access_token()`/atualização do banco batendo 502 no meio da
volta) — identificadas e corrigidas manualmente uma a uma (alguns já tinham o upload feito, só
faltava o UPDATE; outros foram reprocessados do zero). Resultado final: 58/58 aulas com
`mime_type='video/mp4'` e `storage_path` preenchido, zero `.wmv` restante, verificado por amostragem
(`ffprobe` confirma stream h264/aac no arquivo final).

`drive_file_id` continua salvo nas 58 linhas (não usado mais, só histórico) — o arquivo `.wmv`
original permanece intocado no Drive da conta (nunca foi tocado, só lido).

---

### 2026-07-31 (sessão remota) — varredura profunda e verificável da biblioteca

**Pedido:** uma sincronização que varra a pasta de cursos INTEIRA — pasta dentro de pasta dentro
de pasta, todos os arquivos — e que dê para conferir, somando tamanho por arquivo, que não faltou
nada. São alunos de medicina, não pode faltar conteúdo.

**Auditoria independente do Drive** (varredura completa própria, sem passar pela função antiga):
407 pastas de topo, **34.192 pastas**, **211.147 arquivos**, **12,038 TB**, zero pastas que
falharam, zero atalhos quebrados, zero arquivos soltos na raiz. Rodada duas vezes, com números
idênticas nas duas.

**O que estava errado (três buracos, todos silenciosos):**

1. `MAX_MODULE_DEPTH = 2` — só dois níveis de subpasta viravam módulo, e qualquer pasta abaixo do
   nível 10 era descartada de vez.
2. O `catch` em volta da listagem de pasta **engolia o erro**: quando o Drive recusava listar uma
   pasta (429/5xx/token), aquela subárvore inteira ficava de fora e o curso ainda era reportado
   como "Concluído". Não havia como saber depois que faltou conteúdo.
3. O estado da varredura vivia dentro do cursor HTTP — queda de aba/rede no meio perdia a posição,
   e o que ficou faltando nunca era recuperado.

**Resultado da comparação arquivo a arquivo (por ID do Drive):** faltavam **913 arquivos reais**
(802 vídeos `.mp4` + 111 PDFs, 11,08 GB) — todos em pastas de **nível 5** e todos no curso
`QUESTÕES COMENTADAS POR ESTADO／INSTITUIÇÃO MEDGRUP` (tinha 11.321 das 12.234 aulas do Drive).
Os outros 1.302 arquivos que apareciam como "faltando" eram `.html` soltos, ignorados de propósito
desde a migration `20260719200000_remove_html_lessons.sql`.

**Arquitetura nova — fila durável no Postgres.** `sync_folder_queue` (PK `course_id` +
`drive_folder_id`): cada pasta encontrada vira uma linha, a Edge Function consome pendências e
enfileira as filhas. Disso sai de graça: profundidade ilimitada (a fila não tem noção de nível),
proteção contra ciclo de atalho (a PK barra revisitar), retomada exata de qualquer dispositivo, e
a prova de cobertura — um curso só vira `sync_status='complete'` com **zero pastas pendentes e
zero pastas com erro**. Pasta que o Drive recusa a listar agora fica REGISTRADA (`state='error'`,
com a mensagem), e volta pra fila sozinha na sincronização seguinte.

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/20260731020000_deep_library_sync.sql` | `sync_folder_queue`; `course_modules.parent_module_id/depth/path`; `courses.total_size_bytes/folder_count/sync_status/sync_error/deep_synced_at`; `lessons.drive_path/last_seen_at/missing_since`; `recalc_course_totals()`; RPCs `get_library_sync_report()` e `get_library_totals()` |
| `supabase/functions/member-sync-library/index.ts` | Reescrita sobre a fila. Duas etapas: `discover` (pastas de topo → cursos) e `crawl` (drena pendências, 6 pastas em paralelo, janelas de 40s). Erro de pasta nunca mais é engolido |
| `src/pages/DriveSettings.tsx` | Novo card "Conferência da Biblioteca": cursos/pastas varridas/arquivos/tamanho total + lista dos cursos que não fecharam |
| `src/pages/CourseDetailPage.tsx` | Título do módulo agora é o caminho completo (`Módulo 2 › Aula 3 › Anexos`) — com vários níveis, dois módulos podem se chamar igual |
| `scripts/deep-library-sync.mjs` | Varredura/auditoria completa fora do runtime de borda (`audit` não escreve nada, `sync` grava). É o que permite conferir a biblioteca toda de uma vez, em minutos |

**Ordenação:** com profundidade ilimitada não dá pra numerar módulo durante a varredura (a fila não
percorre em ordem de árvore). `recalc_course_totals` ordena tudo de uma vez quando o curso fecha, por
`path` — como o caminho do filho começa com o do pai, ordenar por texto reproduz a ordem da árvore.

**Aulas que sumiram do Drive são MARCADAS (`missing_since`), nunca apagadas** — apagar levaria junto
o progresso do aluno pela FK CASCADE em `lesson_progress`. Só marca quando a varredura fechou 100%
limpa; com pasta que falhou, "não vi o arquivo" pode significar só que não deu pra olhar.

**Cuidado ao revarrer:** as 58 aulas migradas pro Supabase Storage (`storage_path` preenchido) não
podem ter o `mime_type` sobrescrito pelo do Drive — voltaria a `video/x-ms-wmv` e nenhum navegador
tocaria de novo. O script trata essas linhas à parte.

---

### 2026-07-31 (sessão remota) — auditoria do pixel: CAPI fora do ar há 17 dias

**Pedido:** verificar se o pixel `797374160058274` está funcionando e totalmente configurado.

**Achado principal — apagão silencioso da Conversions API.** O `META_CAPI_ACCESS_TOKEN`
**venceu em 14/07/2026 13:16 PDT** (erro 190, `Session has expired`). O `mp-webhook` seguiu
chamando a Graph API a cada compra e tomando recusa, mas o resultado só ia pra `console.error`
e a retenção de log deste projeto é de minutos — ninguém viu. Resultado em 7 dias:

| | |
|---|---|
| Vendas aprovadas no Mercado Pago | **44** |
| Eventos `Purchase` que chegaram ao pixel | **~11** (só os do navegador, de quem voltou pro `/payment/success`) |
| EMQ do Purchase | 6.1, **sem email nem telefone** (só ip/user-agent/fbp) |
| EMQ do Lead (comparação) | 8.7, email 100% |

O Purchase sem email é a assinatura do problema: o webhook manda email com hash, então se a
CAPI estivesse entregando, a cobertura apareceria. Não aparecia.

> ⚠️ **Renovar o token é ação manual** (precisa do client secret do app Meta, que não fica em
> nenhum secret do projeto). Enquanto não renovar, todo o resto abaixo está pronto mas o envio
> server-side continua parado. Procedimento no fim deste arquivo.

**Corrigido nesta sessão:**

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/20260731060000_capi_observability.sql` | Tabela `capi_events` (rastro de toda chamada à CAPI: pixel, status, erro, chaves enviadas); `buyers.client_ip` / `client_user_agent`; RPC `get_capi_health()` |
| `supabase/functions/admin-capi-health/index.ts` (novo) | Valida o token contra `/debug_token` e o acesso a cada pixel. Responde "o token venceu em X" em vez de deixar adivinhar. Só leitura, não injeta evento |
| `supabase/functions/admin-capi-backfill/index.ts` (novo) | Reenvia compras que a Meta nunca recebeu. Recusa rodar com token inválido; `event_time` = hora real da aprovação (senão a venda seria atribuída ao dia do reenvio). Simulação por padrão, grava só com `{"apply": true}`. **Janela de 7 dias** — é o limite da Meta, compra mais antiga é perda definitiva |
| `supabase/functions/mp-webhook/index.ts` | CAPI passa a gravar em `capi_events`, tentar 3× em falha passageira (e sair na hora em erro 190/200/10), e enviar `client_ip_address` + `client_user_agent` |
| `supabase/functions/mp-create-payment/index.ts` | Captura IP e user-agent do comprador. **No webhook não dá** — a requisição vem de um servidor do Mercado Pago, o IP de lá é do MP |
| `src/lib/pixel.ts` | `trackPageView`, `trackViewContent`, `trackAddToCart`, `setPixelUserData` (correspondência avançada manual); `trackInitiateCheckout`/`trackPurchase` aceitam dados do usuário |
| `src/App.tsx` | `<PixelPageViews>` dispara PageView a cada troca de rota (o do `index.html` roda uma vez só; numa SPA, `/` → `/checkout` não contava nada) |
| `src/pages/CheckoutPage.tsx` | Ao abrir vira `ViewContent`; escolher plano vira `AddToCart`; `InitiateCheckout` foi pro clique de pagar, com email/telefone/nome preenchidos |
| `src/pages/PaymentSuccessPage.tsx` | Purchase leva o email do comprador |
| `src/components/admin/MetaPixelHealthCard.tsx` (novo) | Card no `/admin`: vendas × enviadas à Meta, último erro, cobertura das chaves, botão de reenvio |

**Por que o InitiateCheckout estava errado:** disparava ao abrir `/checkout`. Eram ~565 eventos
para 203 checkouts reais, com email em 1% (o formulário só é preenchido três passos depois) —
a campanha otimizava para quem *abre a página*, não para quem quer comprar.

**Incidente nesta sessão (4 min de webhook fora do ar):** ao reescrever a função da CAPI eu
substituí um trecho grande demais do `mp-webhook` e apaguei junto `shareBackupFolder`,
`getCorsHeaders` e `verifyMPSignature` — a função parou de subir (`OPTIONS` respondendo 500).
Restaurada via `git checkout` + redeploy, depois refeita substituindo apenas as linhas da
função alvo. **Lição:** antes de publicar qualquer Edge Function, rodar
`npx esbuild <arquivo> --outfile=/dev/null` (pega erro de sintaxe) e, depois de publicar,
conferir `OPTIONS` — 500 ali é BOOT_ERROR, não erro de aplicação.

---

### 2026-07-31 (sessão remota) — anotação nos PDFs, conclusão manual, curtidas

**Anotação por cima dos PDFs.** Cliente relatou que os alunos baixavam a apostila e o app de
terceiro recusava grifar. Investiguei baixando 4 amostras do Drive (Casalmed Combo Exclusive
2026 e EstratégiaMed 2026 Apostilas): **todas criptografadas em AES-256 com senha de
proprietário e `P=2580`** — imprimir e copiar permitidos, **anotar e modificar bloqueados**. A
restrição está no arquivo original, aplicada pelas editoras; a plataforma só entrega os bytes.
Remover isso seria quebrar medida técnica de proteção em obra de terceiros, então a saída foi
o aluno anotar dentro da plataforma.

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/20260731140000_lesson_annotations.sql` | Tabela `lesson_annotations` (traços por aluno/aula) + RPC `my_annotated_lessons()`. RLS: só o próprio aluno lê e escreve — nem admin |
| `src/lib/annotations.ts` | Motor de desenho: caneta, marca-texto (composição `multiply`, grifa sem cobrir a palavra), borracha e simplificação de traço |
| `src/components/member/PdfViewer.tsx` | Canvas de anotação por cima de cada página, barra de ferramentas, autosave (1,2s + `pagehide`) |
| `src/pages/MemberDashboardPage.tsx` | Aba **"Minhas anotações"** na barra lateral, do lado de Favoritos |
| `src/test/annotations.test.ts` | 7 testes do motor |

**Pontos gravados NORMALIZADOS (0..1 sobre a página), nunca em pixels** — é o que faz o grifo
cair sobre a mesma palavra no celular, no desktop e em qualquer zoom. Sem ferramenta ativa o
overlay não captura ponteiro, então rolagem e seleção de texto seguem normais.

**Não foi feito de propósito:** exportar um PDF novo com os traços embutidos. Isso exigiria
descriptografar a apostila da editora e gerar arquivo sem as restrições — a mesma quebra de
proteção recusada acima.

**Caixa de "concluída"** (`CourseDetailPage` + `LessonPlayer`): o check verde na lista já
existia, mas só vídeo chegava nele (inferido de 92% de reprodução). PDF, apostila, imagem e
planilha não tinham como ser marcados. Agora há caixa na lista e no cabeçalho do player, para
qualquer tipo. Desmarcar zera o progresso junto.

**Curtidas na comunidade** (`20260731170000_community_likes.sql`): tabela `community_likes` com
PK (user_id, comment_id) — a chave já impede curtir duas vezes. `toggle_comment_like()` curte/
descurte numa ida só; `community_feed`, `community_replies` e `course_comments_feed` passaram a
devolver `like_count` e `liked_by_me`. Contagem pública, **quem curtiu é privado**. A ordenação
"Mais relevantes" passou a somar curtidas com respostas. `<LikeButton>` compartilhado entre o
feed geral, a aba do curso e as respostas aninhadas.

**Download com a extensão certa** (`downloadFilenameFor` em `src/lib/utils.ts`): o `.colpkg` do
Anki baixava sem extensão utilizável, mesmo problema já visto no `.apkg`. O Drive reporta esses
baralhos ora como `application/octetstream`, ora como `application/x-zip` — nenhuma tabela de
mime cobre todos. Agora o nome do download é o título verbatim (que é o nome do arquivo no
Drive) e a extensão derivada do mime é só rede de segurança para os 1.268 arquivos sem extensão
no nome. 7 testes cobrindo os casos reais da biblioteca.

---

### 2026-07-31 (sessão remota) — vídeos que o navegador não toca: varredura por codec real

**Regra que orientou tudo:** container ≠ codec, e o nome do arquivo mente. A decisão tem que
vir do `ffprobe`, arquivo a arquivo — `scripts/fix-unplayable-videos.mjs` escolhe a operação
mais barata que ainda entrega um MP4 tocável:

| codec de vídeo | codec de áudio | operação |
|---|---|---|
| h264 | aac (ou sem áudio) | **remux** (`-c copy`) — troca só o container, instantâneo, sem perda |
| h264 | outro | copia o vídeo, recodifica só o áudio |
| qualquer outro | — | **transcodifica** para h264/aac |

Resultado vai pro bucket `lesson-media` e a aula passa a apontar pra lá (`lessons.storage_path`),
igual às 58 `.wmv`. O arquivo original no Drive nunca é tocado.

**Situação por extensão:**

| ext | total | convertidas | pendentes | observação |
|---|---|---|---|---|
| `.mpg` | 80 | 80 | 0 | MPEG-1 → h264. 1043 MB → 240 MB |
| `.mkv` | 63 | 63 | 0 | 61 só remux + 2 transcode |
| `.wmv` | 58 | 58 | 0 | migradas na sessão anterior |
| `.mov` | 81 | 35 | **46** | bloqueadas pela cota do Drive (abaixo) |
| `.avi` | 2 | 2 | 0 | |
| `.flv` | 62 | — | **0** | **não precisam de conversão** |

**Os 62 `.flv` não são FLV.** Conferido pelos bytes mágicos: começam com `0x47`, o sync byte do
MPEG-TS, e por dentro são h264/aac. Já caem no caminho do `mpegts.js` no `LessonPlayer` (o
`mime_type` gravado é `video/mp2t`, que casa com `isTsVideo`) e tocam normalmente. Converter
seria trabalho e perda de qualidade à toa.

**Os 46 `.mov` restantes: cota de download do Google, não bug nosso.** O Drive responde
`403 downloadQuotaExceeded` — limite de bytes baixados **daquele arquivo específico** em 24h.
Não é da conta: o resto do acervo continua baixando normalmente na mesma hora, com o mesmo
token. Reseta sozinho.

**A cota é por BYTES, não por número de downloads** — medido em 31/07 comparando arquivos da
mesma conta de origem (`medbrasil31@gmail.com`):

| arquivo | tamanho | resultado |
|---|---|---|
| `INTRODUÇÃO.MOV` | 1,57 GB | 403 cota |
| `SINDROME NEFRÍTICA.MOV` | 2,11 GB | 403 cota |
| `ATUALIZAÇÕES ATLS 11ª ED.MOV` | 3,17 GB | 403 cota |
| `Questões.pdf` (mesma conta) | 1 MB | **206 normal** |

Ou seja: a conta de origem não está bloqueada, o que estoura é o **volume de bytes por
arquivo**. Um arquivo de 3 GB gasta a franquia dele em UM download; um de 1 MB nunca chega
perto. Por isso as 46 (0,41 a 5,33 GB, 93 GB no total) praticamente não saem por tentativa
repetida: baixar o arquivo é exatamente o que esgota a cota dele de novo.

> Consequência para o aluno: essas 46 aulas também não abrem na plataforma, pelo mesmo motivo —
> e uma única pessoa assistindo uma aula de 3 GB esgota a cota dela para todo mundo naquele dia.

**Saída definitiva bloqueada por espaço:** `files.copy` tornaria a conta DONA do arquivo, e dono
não tem cota de download no próprio arquivo. Mas `onemedcursos@gmail.com` está com **18,91 GB
usados de 16,11 GB** (2,8 GB acima do limite) e as 46 somam 93 GB. Sem ampliar o plano do Google
One, não há como copiar.

> ⚠️ Duas causas erradas foram perseguidas antes de achar essa, porque o corpo da resposta do
> Google — que diz o motivo — era descartado: primeiro pelo ffmpeg (só mostra
> `Server returned 403`), depois pelo `curl --fail`. **Ao investigar um 403 do Drive, leia o
> corpo.** O script agora faz isso e separa "bloqueada por cota" de "falha" no relatório.

Um range pequeno (1 MB) passa mesmo com a cota estourada — só o pedido do arquivo inteiro é
recusado. Então **teste de disponibilidade tem que usar `Range: bytes=0-`**, senão dá falso
positivo. Foi o que invalidou a primeira sondagem que fiz.

Enquanto a cota não reseta, essas 46 aulas também não abrem para os alunos: o worker
`cloudflare/stream-lesson` usa exatamente o mesmo `alt=media`. Ele passou a devolver **429 com
o motivo** em vez de um 502 genérico, e o `LessonPlayer` refaz a requisição ao falhar para ler
esse status (o evento `error` do `<video>` é igual para qualquer causa) — nesse caso para de
tentar de novo, porque insistir não resolve.

> ⚠️ **Nenhuma mensagem exibida ao ALUNO pode citar o Google Drive.** Para quem assina, a OneMed
> é a plataforma inteira; onde o arquivo está guardado por trás é infraestrutura nossa. O texto
> em produção é "Esta aula atingiu o limite de acessos de hoje. Ela volta a abrir
> automaticamente em algumas horas — as demais aulas seguem normais." As mensagens de
> `member-sync-library` continuam podendo citar o Drive: são do painel admin, onde o Drive é o
> assunto da tela.

Conferido em produção com uma conta de teste temporária (criada e apagada na mesma sessão):
aula normal devolve `206` com bytes de MP4 de verdade (streaming intacto), aula bloqueada
devolve a mensagem nova. Detalhe: a bloqueada responde `206` normalmente para um range pequeno
— só o `bytes=0-` que o navegador manda é recusado.

### RESOLVIDO — aula sem franquia cai no player oficial do Google

Depois de medir de verdade, o modelo anterior estava errado em dois pontos.

**1. O limite não é do tamanho nem da conta — é POR ARQUIVO**, e depende de quanto aquele
arquivo específico foi baixado nas últimas ~24h. Medido na MESMA conta (`medbrasil31`) e nos
MESMOS cursos:

| tamanho | resultado |
|---|---|
| 2173 MB | 206 abre |
| 1580 MB | 206 abre |
| 682 MB | 206 abre |
| 2573 MB | 403 |
| 1473 MB | 403 |
| 487 MB | 403 |

Um de 2,1 GB abre e um de 487 MB não. Amostra de 20 vídeos >200 MB do acervo inteiro: 20/20
abriram — **o problema é concentrado, não sistêmico**.

**2. Existem DUAS vias no Google, e só uma tem teto.** `alt=media` (download) tem a cota; o
pipeline de PRÉ-VISUALIZAÇÃO não. É por isso que o vídeo toca ao abrir no Drive e falhava na
plataforma — não é contradição, são caminhos diferentes.

**A solução:** quando o worker responde 429, o `LessonPlayer` embute
`drive.google.com/file/d/<id>/preview?rm=minimal`. É o embed OFICIAL do Google, não raspagem de
endpoint interno. Os arquivos já são compartilhados como "qualquer pessoa com o link" na origem
(conferido nas permissões), então o embed abre sem login e nada foi afrouxado. Quando a franquia
volta, o player normal assume sozinho.

> Custo assumido: no player do Google não há registro de progresso, velocidade nem download.
> É pior que o player próprio e melhor que a aula não abrir.

**Correção adicional no worker:** o Drive recusa o pedido ABERTO (`bytes=0-`) que o navegador
manda, mesmo havendo franquia — `bytes=0-` dava 403 e `bytes=0-100MB` dava 206 no MESMO arquivo,
no MESMO instante. O worker passou a pôr um teto de 24 MB quando o pedido vem aberto.

> ⚠️ **NÃO baixe esses arquivos para "verificar" se destravaram.** Cada download completo renova
> o bloqueio daquele arquivo. Boa parte das 46 ficou bloqueada exatamente assim, por tentativas
> de diagnóstico. A verificação barata é rodar o lote: arquivo bloqueado responde 403 em 295
> bytes, sem consumir nada.

**Tentativas que NÃO funcionam** (todas medidas, não supostas): download fatiado (consome a mesma
franquia e trava no meio); `files.copy` para conta própria (mesmo teto, reportado como
`userRateLimitExceeded`, inclusive a partir da conta de conteúdo no projeto antigo); trocar de
conta ou de projeto Google.

**Saída definitiva, se a cota voltar a incomodar:** o dono não tem cota no próprio arquivo —
comprovado, cópia nossa baixa com 200 sem limite. Exige transferência de propriedade a partir de
`medbrasil31@gmail.com`, ou Google Workspace com Drive Compartilhado.

---

**Retomar quando a cota resetar** (idempotente, filtra por `storage_path IS NULL`):

```bash
SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... SUPABASE_SERVICE_JWT=... \
  CONCURRENCY=2 node scripts/fix-unplayable-videos.mjs --ext=mov
```

> `SUPABASE_SERVICE_JWT` é a `service_role` **legada** (`eyJ...`): o Storage recusa a chave nova
> `sb_secret_...` com "Invalid Compact JWS", enquanto as Edge Functions exigem justamente a nova.
> Duas chaves diferentes para dois serviços do mesmo projeto.

---

### 2026-08-04 (sessão remota) — "nenhuma aula abre": curso inteiro em TS disfarçado + RLS por linha

**Curso novo importado:** "MED 2026" (pasta compartilhada por `ufgravity@gmail.com`, atalho já
existia na raiz da biblioteca) — 61 aulas reais em vídeo (8 GB), 35 módulos, paridade total
arquivo a arquivo. 6 "aulas" e 11 "apostilas" da pasta eram stubs falsos de 55.855 bytes (um SVG
com nome de `.mp4`/`.html`) — as 6 foram removidas, junto com 2 stubs idênticos que já estavam no
`medreview-2026` (uma delas com 2 alunos que tentaram assistir).

**Causa 1 do "nenhuma aula abre" — o maior curso da plataforma era 100% TS disfarçado:**
os 10.532 vídeos do `questoes-comentadas-por-estado-instituicao-medgrup` são MPEG-TS gravados com
nome e mime de `.mp4` (sondados um a um pela API do Drive, `Range: bytes=0-188`, sync byte 0x47
nos offsets 0 e 188 — 10.532/10.532, zero mp4 verdadeiro, codecs internos h264/aac confirmados
por ffprobe). O `<video>` nativo não toca o container TS → exatamente o print do cliente.
Corrigido dos dois lados: `mime_type` trocado para `video/mp2t` no banco (o player já roteia esse
mime pro mpegts.js) e `LessonPlayer.sondarFalha()` agora fareja os primeiros bytes na primeira
falha do vídeo e vira `forceTs` sozinho — cobre qualquer arquivo futuro com rótulo mentiroso, sem
depender do banco. Amostra de 3 vídeos/curso no resto da biblioteca: nenhum outro curso afetado.

**Causa 2 — o mesmo curso aparecia VAZIO ("O curso está sendo sincronizado"):** as políticas RLS
chamavam `is_member()` CRU, e o Postgres reavaliava a função POR LINHA (12.234 aulas × consulta
interna = 99 mil buffers, 1,5s por página de 1.000; o app pagina o curso todo e estourava o
timeout de 30s; sob paralelismo, 500). Migration `20260804040000_rls_initplan_member_checks.sql`:
`(SELECT is_member())` vira InitPlan (1× por consulta) em `lessons`, `course_modules`, `courses`,
`course_comments` e `community_likes`. Página caiu de 1,5s para 0,9s e as 11 páginas em paralelo
fecham em 2,3s sem erro. **Regra pra qualquer policy nova: função de checagem SEMPRE dentro de
`(SELECT ...)`.**

> Teste de reprodução no navegador: o Chromium do Playwright deste ambiente NÃO tem decoder
> H.264/AAC (só VP9) — nenhum vídeo da plataforma decodifica nele, mesmo os sãos. Dá pra validar
> login/lista/player abrindo, mas a decodificação em si só por protocolo (bytes + ffprobe).
> E o Chromium só atravessa o proxy TLS deste ambiente com as requisições interceptadas pelo lado
> Node do Playwright (`context.route` + `route.fetch`) — o handshake direto leva RESET.

---

### 2026-08-04 (sessão remota) — sino editável no admin + reorganização real das categorias

**Sino de notificações editável:** a lista "Cursos em processo de atualização" era hardcoded em
`NotificationsBell.tsx`. Virou a tabela `notification_items` (label, done, sort_order — migration
`20260804100000_notification_items.sql`) + `announcement_settings.notifications_heading` (título
da seção). A página Avisos (`/admin/announcements`) ganhou abas **Aviso | Notificações** — a nova
aba adiciona/renomeia/reordena/exclui itens e alterna a bolinha (verde = `done`, atualizado;
vermelha = em atualização). Seed com a lista antiga + **MED 2026 verde no topo**. RLS: membro lê,
trial não (mesma regra da loja), admin gerencia — checagens dentro de `(SELECT ...)`.

**Categorias auditadas curso a curso (408):** 28 cursos estavam com categoria CRUA
(`CURSO`/`QUESTAO`/`LIVRO`) do categorizador primitivo — o aluno via um chip "LIVRO" com 1 curso
enquanto "Livros (Todos os 5.000)" morava em "Resumos, Cards & Livros". Correções:
- Nova categoria **"Livros & Apostilas"** (ícone Library, slug SEO novo `livros-apostilas` com
  página própria no silo): as 10 bibliotecas/coleções de apostilas, incluindo a de 5.000 livros.
- "Resumos, Cards & Livros" → **"Resumos, Cards & Mapas Mentais"** (o slug SEO
  `resumos-cards-livros` NÃO muda — o mapa `CATEGORY_SLUGS` é explícito exatamente pra rename não
  mexer em URL indexada). `course_comments.category` atualizado junto.
- Cursos com nome duplicado (turmas gêmeas da leva de colisão de slug) caíram na categoria do
  irmão; misfits reais corrigidos (PROGEB estava em Carreira; Neuroanatomia em Especialidades;
  Médico na Prática em Outros).
- `categoryOf()` da `member-sync-library` e do `scripts/deep-library-sync.mjs` reescrito para
  classificar direto na taxonomia real (sinal mais específico primeiro; default "Outros cursos") —
  categoria crua não volta a existir em import futuro.

**5 cursos sem NENHUM arquivo no Drive** (esqueleto de pastas vazias, varredura completa e sem
erros: check-list-medcof, med-questoes-apostilas, med-banco-de-questoes-e-respostas,
semiologia-clinica-usp, conduzindo-as-emergencias-cardiologicas) → `active=false`. Se o dono
preencher as pastas um dia, a sincronização importa o conteúdo mas o curso continua oculto até
reativar à mão no banco/painel.

**CourseDetailPage:** busca de aulas paralelizada (COUNT primeiro, 6 páginas de 1.000 por vez,
ordenação com desempate estável `sort_order, id` — sem o desempate, paginação paralela por offset
pode duplicar/perder linha). Os megacursos de questões chegam a 31.612 aulas; sequencial estourava
o timeout de 30s mesmo depois da correção de RLS.

---

### 2026-08-04 (sessão remota) — programa de afiliados

**Fluxo completo:** cadastro próprio (email+senha, separado de assinante) em `/afiliado/registro`
via Edge Function `affiliate-register` (cria usuário já confirmado no Auth + linha em `affiliates`
+ cupom inicial de 10% + e-mail de boas-vindas via Resend); login em `/afiliado/login`
(`signInWithPassword` + exigência de linha em `affiliates` — sem ela, signOut na hora); painel em
`/afiliado`. Card "Seja um afiliado" no fim da landing (após FAQ) com benefícios e botão de login.

**Atribuição de venda: cupom OU referência do link.** O link de divulgação leva pra LANDING
(`/?ref=CUPOM`) — o indicado pode fazer o trial e comprar dias depois. `captureAffiliateRefFromUrl`
(App.tsx, roda em toda navegação) guarda o código 30 dias no localStorage (`om_affiliate_ref`,
último clique vence); o CheckoutPage auto-aplica o cupom guardado EM SILÊNCIO (se o afiliado
desativou o cupom, o comprador não vê erro nenhum) e grava `buyers.affiliate_ref` no insert.
`mp-create-payment` grava `buyers.coupon_code` (código efetivamente usado) e o `mp-webhook`, no
bloco de aprovação, chama `processAffiliateSale()` — resolve o afiliado por `coupon_code` e, na
falta, por `affiliate_ref`; grava `affiliate_sales` (UNIQUE em `external_reference` segura webhook
duplicado), envia e-mail "você fez uma venda" com a comissão, e na 5ª venda concede conta
`lifetime_pro` ao e-mail do afiliado (sem rebaixar tier superior). Comissões:
monthly 15% · annual/lifetime 20% · lifetime_plus 25% · lifetime_pro 30% (sobre o valor pago).

**Painel do afiliado:** link `/?ref=CODIGO` (landing, não checkout),
gerador/troca de cupom via `affiliate-coupon` (valida formato, colisão e reserva prefixo ONEMED;
trocar desativa o cupom antigo), material de divulgação (pasta pública do Drive
`1N0ZYuF7yts5l_ZtfQR17PqY5DefAMN5O`), badges hoje/7 dias/total, comissão pendente × recebida,
extrato com o ganho por venda, e "Receber comissão" (salva chave PIX/nome/banco e abre o WhatsApp
do suporte com a mensagem pronta).

**Admin `/admin/afiliados`:** resumo geral, card "afiliados com comissão a pagar" (mostra a chave
PIX de cada um) com botão **"Já quitado"** (marca todas as vendas pendentes do afiliado como
`paid`), e lista completa com extrato expandível por afiliado.

**Segurança:** e-mail já existente no Auth → 409 (impede tomar conta de assinante magic-link
definindo senha); `REVOKE UPDATE` + `GRANT UPDATE (pix_key, pix_name, pix_bank)` — afiliado só
edita os campos de PIX direto no banco (cupom só pela função; testado: PATCH de coupon_code → 403);
vendas só via service role; rotas `/afiliado` em `NOINDEX_PREFIXES`.

---

### 2026-08-04 (sessão remota) — Acervo Público (materiais compartilhados entre assinantes)

**Página `/membros/acervo`** ("Acervo Público" no menu da sidebar, oculto pra trial): assinantes
sobem arquivos ou pastas completas de material de estudo pros outros assinantes. Feed com
Recentes / Mais acessados / Mais curtidos / Meus uploads, chips com TODAS as categorias da
plataforma, busca própria; card mostra "Upload feito por «nome»" (sem nome → `NameRequiredModal`
via `useRequireName`); detalhe tem like, comentários PRÓPRIOS do acervo (tabelas
`archive_likes`/`archive_comments` — nada aparece na comunidade), contador de acessos
(`archive_register_view`), abrir/baixar, e pro dono: editar, público↔privado, excluir. Busca
geral do dashboard ganhou a seção "Acervo da comunidade", renderizada POR ÚLTIMO.

**Upload sem limite de tamanho, sem expor credencial:** Edge Function `archive-manage`
(`init`/`finalize`/`delete`/`file_token`) cria item + pasta no Drive + arquivo só-de-metadados e
abre uma SESSÃO RETOMÁVEL; o navegador manda os bytes DIRETO pro Google via a URI da sessão (XHR
com progresso; o header `Origin` na abertura da sessão é o que libera o CORS). `finalize` confere
o tamanho na API do Drive antes de publicar — cliente não vê token nem forja conteúdo. Pasta-raiz
**"Acervo Público - OneMed"** fica FORA da biblioteca de cursos (a sync transformaria em curso);
id salvo em `drive_config.acervo_folder_id`. Excluir apaga a pasta do item no Drive junto.
`file_token` assina URL do worker de streaming (mesmo HMAC do member-lesson-token).

**Migration `20260804200000_public_archive.sql`:** `archive_items`/`archive_files`/`archive_likes`
/`archive_comments`; RPCs `archive_feed` (sort/categoria/busca/_item_id), `archive_my_items`,
`toggle_archive_like`, `archive_register_view`, `archive_comments_feed` — todos SECURITY DEFINER
com gate `assert_archive_access()` (assinante-nunca-trial ou admin). RLS nas tabelas com o padrão
`(SELECT ...)`. Escrita de itens/arquivos só via service role. Atenção: `sum(size_bytes)` devolve
numeric — precisa de `::bigint` pra casar com o RETURNS TABLE (deu erro 42804 em produção antes
do cast).

> ⚠️ **Uploads bloqueados até liberar espaço no Drive:** a conta `onemedcursos@gmail.com` está
> com 18,91 GB usados de 16,11 GB — o Google recusa QUALQUER upload novo. O `init` já detecta
> (checa `about.storageQuota` antes de criar qualquer coisa) e devolve "armazenamento lotado".
> Basta liberar espaço ou ampliar o Google One que o acervo passa a aceitar uploads sem deploy.

---

## Meta Ads — Contexto Geral

> Documentação completa em: https://github.com/urifs/onemedcursos-ads-management

| Campo | Valor |
|-------|-------|
| Ad Account | `act_1663353514467679` |
| Pixel 1 | `797374160058274` ("Site onemed") |
| Pixel 2 | `2400702203708115` ("Onemed SIte BM2") |
| App Meta | `973460608407204` ("Tokenonemed") |

### Campanha ativa (criada 2026-05-15)

- Objetivo: `OUTCOME_SALES` → `PURCHASE`
- Budget: R$ 700/dia (CBO)
- Bid: `LOWEST_COST_WITHOUT_CAP`
- Audience: Advantage+ · Brasil · 22+ anos
- Status: ACTIVE — **não alterar até 22/05/2026** (fase de aprendizado)

### Renovação do META_CAPI_ACCESS_TOKEN

> **🔴 VENCIDO desde 2026-07-14 13:16 PDT** (erro 190, confirmado em 31/07/2026 pela
> função `admin-capi-health`). Enquanto não for renovado, NENHUMA compra chega à Meta
> pelo servidor — só o disparo do navegador em `/payment/success`, que a maior parte
> dos compradores nunca vê. Depois de renovar, rodar o reenvio em `/admin` →
> card "Rastreamento Meta" → "Reenviar compras não enviadas" (a Meta só aceita
> eventos de até **7 dias** atrás; o que passou disso é perda definitiva).

**Caminho mais curto (não precisa do client_secret):**
Events Manager → pixel "Site onemed" (`797374160058274`) → Configurações →
seção Conversions API → **Gerar token de acesso**. Depois é só o passo 3 abaixo.

**Caminho pelo Graph API Explorer** (exige o client_secret do app, que NÃO está
guardado em nenhum secret deste projeto — pegar em developers.facebook.com →
app Tokenonemed → Configurações → Básico):

```bash
# 1. Gere um novo short-lived token em:
#    developers.facebook.com/tools/explorer (app Tokenonemed)
#    Permissões: ads_management, ads_read, business_management

# 2. Exchange para 60 dias (substitua SHORT_LIVED_TOKEN):
curl "https://graph.facebook.com/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=973460608407204\
&client_secret=****\
&fb_exchange_token=SHORT_LIVED_TOKEN"

# 3. Salvar no Supabase (substitua LONG_TOKEN e MGMT_KEY):
curl -X POST "https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/secrets" \
  -H "Authorization: Bearer MGMT_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"name":"META_CAPI_ACCESS_TOKEN","value":"LONG_TOKEN"}]'

# 4. Conferir que valeu (responde "ok": true quando o token está bom):
curl -X POST "https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/admin-capi-health" \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY"
```
