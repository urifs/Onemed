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
| **Supabase Management API** | `sbp_978755d6124e8183400830a25f8b5f8df3fff407` |
| **Vercel API Token** | `vcp_6m85MdQjg3YEmboL3Bg4x0fHzqTfXiuhQQubBmzGE3tjjqhdDt0JF7SY` |

### IDs e Referências dos Projetos

| Serviço | Variável | Valor |
|---------|----------|-------|
| Supabase Project Ref | `SUPABASE_PROJECT_REF` | `jrrybiohwqabsdurqudc` |
| Supabase URL | `SUPABASE_URL` | `https://jrrybiohwqabsdurqudc.supabase.co` |
| Supabase Anon Key | `VITE_SUPABASE_PUBLISHABLE_KEY` | ver `.env.example` |
| Vercel Project ID | `VERCEL_PROJECT_ID` | `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt` |
| Vercel Project Name | — | `onemed` |

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
export SUPABASE_ACCESS_TOKEN="sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec"

# Deploy de uma Edge Function específica
supabase functions deploy <nome> --project-ref jrrybiohwqabsdurqudc --use-api

# Deploy de todas as Edge Functions de uma vez
for fn in create-trial-access drive-list-folders drive-oauth-callback drive-revoke-access drive-save-folder drive-share-folder mp-create-payment mp-webhook send-access-email send-followup-emails; do
  supabase functions deploy $fn --project-ref jrrybiohwqabsdurqudc --use-api
done

# Deploy do frontend (push para main — Vercel detecta automaticamente)
git add -A && git commit -m "feat: ..." && git push origin main
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
| `/admin/access` | `AccessManagement.tsx` | Protegido | Gerenciar todos os acessos |
| `/admin/buyers` | `BuyersPage.tsx` | Protegido | Gerenciar compradores |
| `/admin/trials` | `TrialUsersPage.tsx` | Protegido | Ver usuários trial (exclui convertidos) |
| `/admin/coupons` | `CouponsPage.tsx` | Protegido | CRUD de cupons |
| `/admin/drive` | `DriveSettings.tsx` | Protegido | Configurar Google Drive |
| `/admin/database` | `DatabasePage.tsx` | Protegido | Visualizador do banco |

---

## Edge Functions

| Função | Acionado por | Descrição |
|--------|-------------|-----------|
| `create-trial-access` | Frontend (landing) | Cria trial de 30min + compartilha Drive + envia email |
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

**Objetivo:** Dar ao usuário 30 minutos de acesso ao conteúdo no Google Drive.

```
Usuário acessa / (landing)
  → visita registrada na tabela visits
  → usuário preenche email + WhatsApp + país
  → frontend chama create-trial-access
      ├── valida formato de email (regex)
      ├── verifica rate limit (5 tentativas / 15min por IP)
      ├── verifica se já é comprador aprovado → 409
      ├── verifica se já tem trial ativo → retorna tempo restante
      ├── verifica se já usou trial (expirado) → 409
      ├── cria registro em accesses (access_type='trial', expires_at=now+30min)
      ├── chama drive-share-folder (fire-and-forget)
      └── chama send-access-email tipo 'trial_access' (fire-and-forget)
  → frontend exibe countdown de 30 minutos em tempo real
  → ao expirar, mostra tela de "acesso encerrado"
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

**⚠️ Renovar em: 2026-07-09** (5 dias antes do vencimento em 2026-07-14)

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
```
