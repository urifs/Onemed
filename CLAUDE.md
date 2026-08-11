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
| **Supabase Management API** | `sbp_d4e0be5b7dd285b557fb136fdb2ab65045ef74a1` |
| **Vercel API Token** | `vcp_1flOV1BNzH45cGJZWrbWBntxpTiKK7a9OEq7BbNwpqcHH4fAmX16x8u1` |
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
export SUPABASE_ACCESS_TOKEN="sbp_d4e0be5b7dd285b557fb136fdb2ab65045ef74a1"

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

> Atualizados em 10/08/2026 (Mensal já tinha subido para R$99 em ~06/08).

```
monthly:        R$    99,00  — acesso por 1 mês
annual:         R$   299,00  — acesso por 12 meses
lifetime:       R$   499,00  — acesso permanente
lifetime_plus:  R$   798,00  — vitalício + backup Drive + 4 telas
lifetime_pro:   R$ 1.497,00  — tudo do Plus + IA Meduf + download de aulas
upsell:         R$    19,90  — complemento 1
upsell2:        R$     9,90  — complemento 2
```

⚠️ Preço vive em 4 fontes que precisam andar JUNTAS (`src/lib/plans.ts` ·
`CheckoutPage` display · `mp-create-payment`, quem cobra · `member-account-info`)
+ prompt do `member-assistant` e rótulos de `/admin/cupons`. Mudar preço exige
redeploy das 3 functions e conferir o valor no eszip da função NO AR.

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

**3 novos planos:** `monthly` (R$99/30 dias — era R$49,90 no lançamento, subiu para R$49 e depois R$99 em 05/08), `lifetime_plus` (R$599 — vitalício + backup no
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

**Mesmo e-mail de assinante/admin PODE virar afiliado, SEM código** (decisão do dono). Três
caminhos no `affiliate-register`: e-mail livre → usuário novo direto; e-mail existente COM sessão
do próprio e-mail (assinante logado vindo do menu) → a sessão é a prova de posse, afiliado nasce
no MESMO user_id e a senha passa a valer; e-mail existente SEM sessão → afiliado nasce num
usuário-ALIAS interno (`afiliado-<rand>@alias.onemedcursos.com.br`), sem tocar na conta do
assinante — definir senha em conta alheia é que seria roubo de conta (testado: a senha do
"atacante" NÃO abre a conta do assinante, invalid_credentials). O login é `action=login` na mesma
função: resolve e-mail real → user_id do afiliado → e-mail de login (real ou alias) → grant de
senha no GoTrue server-side → devolve a sessão (rate limit 12/h por IP+e-mail). Trade-off aceito:
sem verificação, alguém pode "ocupar" um e-mail alheio no programa (squatting) — mas nunca acessar
a conta. Atalho no menu da área de membros ("Programa de Afiliados" → `/afiliado`); registro
prefila o e-mail da sessão; painel redireciona logado-sem-afiliado pro cadastro. Demais travas:
`REVOKE UPDATE` + `GRANT UPDATE (pix_key, pix_name, pix_bank)` (cupom só pela função); vendas só
via service role; e-mails escapam HTML nos nomes interpolados; rotas `/afiliado` em
`NOINDEX_PREFIXES`.

**Auditoria de segurança 2026-08-04 (pré-lançamento), 21 sondas em produção, todas aprovadas:**
acervo — privado invisível pra terceiros (feed/tabela/arquivos/file_token), edição/exclusão só
dono ou admin, INSERT direto bloqueado, comentário com user_id forjado bloqueado, trial e anon
zerados, views deduplicadas por usuário (`archive_views`), init em item alheio 404; afiliados —
alias não vaza conta, isolamento entre afiliados, vendas só admin marca pagas, login de
não-afiliado negado. Bug corrigido na auditoria: `ensureName` é callback-style e era aguardado
como boolean — o botão "Publicar no acervo" morria em TypeError silencioso pra quem já tinha nome.
Limitação do harness de teste: Playwright+route.fetch não encaminha corpo binário de XHR (PUT do
upload chega com 0 bytes ao Google → 308) — o mesmo PUT feito direto responde 200; navegador real
não passa pela interceptação.

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

**Onde os bytes moram:** na CONTA DE ARMAZENAMENTO (`drive_storage_accounts` —
`ufgravity@gmail.com`, 5 TB), nunca na conta de conteúdo (sem espaço). A pasta-raiz "Acervo
Público - OneMed" é criada na conta de armazenamento (`acervo_folder_id` na tabela) e
COMPARTILHADA como leitura com a conta de conteúdo — é com o token da conta de conteúdo que o
worker de streaming serve os arquivos, e a permissão herdada na pasta é o que faz isso funcionar.
Cada item guarda `storage_account_id` (finalize/delete usam o token da conta certa). Client OAuth
das contas de armazenamento: `GOOGLE_STORAGE_CLIENT_ID`/`GOOGLE_STORAGE_CLIENT_SECRET` (fallback
no client de conteúdo). Ciclo completo TESTADO em produção: init → PUT direto no Google (200) →
finalize (1 ready) → feed → streaming via worker (bytes exatos) → like → comentário → delete
(some do Drive junto). Detalhe do teste: o `X-Upload-Content-Length` declarado no init PRECISA
bater com os bytes enviados — divergência dá 400 no PUT.

---

### 2026-08-04 (sessão remota) — banco de questões: importar banco EXISTENTE de um PDF

No modal do gerador de banco de questões há agora a seção "Origem das questões", com duas opções
mutuamente exclusivas: **"Gerar questões a partir do material"** (padrão — o fluxo de sempre) e
**"Usar banco de questões já existente"**. Na importação, `generate-flashcards` recebe
`importExisting: true` e TRANSCREVE o PDF em vez de criar: quantidade de questões = a do
documento (dificuldade e quantidade somem da UI), alternativas na MESMA ordem/texto, `correct` =
gabarito do próprio documento, e as explicações (back/why) só são geradas quando o PDF não as
traz. Sem Fisher-Yates no modo importação — o gabarito do PDF é lei. Extração em LOTES de 20
(multi-passada, teto 120; temperature 0.1) porque banco grande não cabe numa resposta só; lote de
fronteira é deduplicado por `front`; falha de LLM no meio entrega o que já foi transcrito com
aviso. Pós-processamento tira os prefixos do documento ("Questão 3.", "A)") que duplicariam a
numeração da interface — sem mexer na ordem. Testado em produção com PDF de gabarito conhecido:
2/2 questões, letras preservadas, gabarito exato, explicações geradas.

---

### 2026-08-04 (sessão remota) — acervo: upload robusto, player da plataforma, "não carrega"

**"Não foi possível carregar acervo" — duas causas.** (1) O bug de `bigint` (42804) no
`archive_feed`, corrigido no mesmo dia (cast `::bigint` no `sum(size_bytes)`). (2) "Carregar" =
UPLOAD: o loop de upload do cliente ABORTAVA a pasta inteira se UM arquivo falhava no PUT — o
`finalize` nunca era chamado e o item ficava preso em `pending` (some do feed, que só mostra
`ready`). Um cliente real (`andrelins.med`) teve um upload de pasta preso assim; recuperado
rodando `finalize` (3 arquivos com bytes viraram `ready`; o de 0 byte foi descartado).

**Upload blindado:** cada arquivo tenta 2×; o `finalize` roda SEMPRE que ≥1 arquivo subiu (com
retry), publicando o que deu certo e avisando quantos falharam ("Publicado com X de Y"). Feed com
retry único em falha de rede/timeout antes de avisar.

**Acervo usa o MESMO LessonPlayer das aulas** (pedido do dono): abrir um arquivo do acervo
reproduz/visualiza DENTRO da plataforma (vídeo com remux TS, PDF com zoom + anotações, Office,
imagem, áudio, velocidade) em vez de abrir aba crua. `LessonPlayer` ganhou props opcionais
`resolveUrl` (link vem do `archive-manage` `file_token` em vez do `member-lesson-token`) e
`bypassDownloadGate` (acervo é conteúdo entre assinantes, sem trava de plano); `fileToLesson()`
monta uma aula sintética a partir do `archive_file` (sem `drive_file_id`/`storage_path`, então o
fallback de cota/embed — específico da conta de conteúdo — não dispara). O player vai num
`createPortal(document.body)` pra ficar acima do diálogo de detalhe (que também é portalizado).
Fluxo de aulas normais intacto. Verificado em produção: PDF do acervo renderiza no visualizador
da plataforma, streaming via worker 200.

---

### 2026-08-04 (sessão remota) — gerador de cronograma de estudos com IA

**Página `/membros/cronograma`** ("Cronograma de Estudos" no menu da sidebar, exclusivo de
assinante; monthly bloqueado como os outros geradores de IA): o aluno descreve o OBJETIVO (prova,
prazo, horas/semana, pontos fracos) e a IA (Emergent + gemini-2.5-flash) monta um cronograma
DETALHADO — semanas com temas e tarefas, marcos, dicas e um MAPA MENTAL em árvore do conteúdo.
Fica salvo em `study_plans`; cada tarefa tem id e vira item de CHECKLIST com progresso persistido
(barra por cronograma e por semana). Editar título/excluir do próprio dono.

**Edge Function `generate-study-plan`** (migration `20260804230000_study_plans.sql`): rate limit
10/dia, monthly 403, parser tolerante + 1 retry, ids únicos por tarefa. Normaliza tips (o modelo
às vezes devolve `{label, description}` em vez de string), milestones e rótulos do mapa mental
para texto — renderizar objeto cru estoura o React (#31). `MindMap.tsx` (componente reutilizável,
árvore horizontal recolhível) coage o rótulo a texto defensivamente.

**Admin `/admin/cronogramas`:** RPC `admin_study_plans_overview` (admin-only) lista todos os
cronogramas dos alunos com nome/e-mail e progresso (feitas/total); expandível pra ver mapa mental,
semanas/tarefas e dicas.

**Segurança:** RLS dono-ou-admin; `REVOKE UPDATE` + `GRANT UPDATE (completed_tasks, title,
updated_at)` — o cliente só mexe no checklist e no título, não na estrutura do plano (testado:
PATCH de `objective` → 403); INSERT só via Edge Function (service role); overview só admin
(testado: não-admin → "Apenas administradores"). Verificado em produção: geração (~35s, por isso
`generate-study-plan` no TIMEOUT_EXEMPT do client), mapa mental renderizado, checklist marca e
persiste (0/60 → 1/60).

---

### 2026-08-05 (sessão remota) — admin de questões e acervo, cupom no upgrade, modais cortados

**Admin vê os bancos de questões como já via os flashcards:** migration
`20260805000000_admin_question_banks.sql` com `admin_question_banks_overview()` /
`admin_question_banks(_user_id)` — espelho exato das RPCs de flashcards (SECURITY DEFINER +
gate `has_role` explícito; testado em produção: aluno recebe `Unauthorized`).
`FlashcardsAdminPage` virou a página de abas **Flashcards | Banco de Questões** (nav renomeada
pra "Flashcards & Questões") — a estrutura das duas abas é idêntica, então a página é
data-driven por um config `TABS` que só troca RPCs/rótulos e normaliza os campos pro mesmo shape.

**Gerenciamento do Acervo Público no admin** (`/admin/acervo`, novo item "Acervo Público" na
nav): lista TODOS os itens direto pela tabela (a política "Admin gerencia itens" já dava SELECT
total) — inclusive privados e uploads presos em `pending` (badge "incompleto"), que o feed dos
alunos nunca mostra. Por item: quem enviou (join client-side com `profiles`), categoria,
arquivos/tamanho, views/likes, alternar público↔privado (UPDATE direto, política de admin),
**excluir** (via `archive-manage` action `delete`, que já aceitava admin — apaga a pasta do
Drive junto) e expandir pra ver os arquivos com botão de abrir (URL assinada do worker;
`window.open` ANTES do await, senão o bloqueador de pop-up mata a aba).

**Cupom de desconto no upgrade:** `UpgradePlanModal` ganhou campo de cupom (mesma validação
client-side do checkout: ativo/expirado/esgotado/allowed_plans) e passa `couponCode` pro
`mp-create-payment` — que JÁ aplicava desconto em upgrades (a seção de cupom roda depois do
cálculo da diferença de tabela), só faltava a UI enviar. Preço exibido = mesma conta do
servidor (`round2(diff × (1-pct))`); cupom restrito a um plano só desconta (e só é enviado)
naquele alvo.

**Modal de upgrade cortado embaixo sem scroll:** faltava `max-h-[90vh] overflow-y-auto` no
`DialogContent` — adicionado.

**Busca geral acha ARQUIVOS do Acervo Público:** nova RPC `archive_search_files`
(migration `20260805010000_archive_search_files.sql`, gate `assert_archive_access`, visibilidade
público-ou-próprio) — a busca do dashboard, além dos itens (archive_feed), lista os arquivos
dentro de itens/pastas, rotulados "Acervo Público · em «item» · por «nome»". Clicar navega pra
`/membros/acervo?item=…&file=…` — o `DetailDialog` ganhou `initialFileId` e abre o item já
tocando/visualizando o arquivo buscado no player da plataforma (auto-abre uma vez só, ref).
`lessonTypeFromMime` exportado do ArchivePage pro ícone certo na lista de resultados.

**Menu sem contagens:** os itens de função da sidebar (Favoritos, Flashcards, Banco de Questões,
Acervo Público, Cronograma, Afiliados e "Minhas anotações") não mostram mais número — `count`
virou opcional no `CategorySidebar` e só categoria de curso conta.

**Tópico da comunidade com áreas do Menu:** o seletor de categoria do "Abrir um novo tópico"
ganhou o grupo "Menu" (as 6 áreas da plataforma) acima do grupo "Categorias" — o valor gravado é
o próprio rótulo, na mesma coluna `category` (o chip do feed exibe qualquer texto). Seletor de
curso desabilita quando a categoria escolhida não tem cursos.

**Modo claro — banners com "gradiente preto estranho" corrigidos:** os heróis do dashboard e da
página de curso fundiam a arte escura do `CourseCover` com `from-background` — perfeito no
escuro (fundo preto), mas no claro virava uma névoa cinza/rosa sobre a arte. Agora são banners
AUTOCONTIDOS estilo capa de álbum: overlay sempre `from-black/85 (dashboard) · from-black/75
(curso)`, título/textos brancos fixos, botão "Detalhes" branco-fantasma. No escuro fica
visualmente idêntico ao que era (conferido por screenshot nos dois temas); no claro o banner
vira um cartão escuro limpo com borda. Regra: arte de curso é sempre escura por design — nunca
fundir com o fundo da página, escurecer pro preto.

**Capa de curso SEM "gradiente pro preto" no modo claro (pedido do dono):** `CourseCover`
agora gera UMA arte por tema — escuro mantém o original (vermelho afundando em `hsl(0 0% 6%)`);
claro usa a mesma família de vermelhos indo pra um carmim profundo (`hsl(350 80% 25%)`), sem
preto, vibrante contra o branco (duas camadas absolutas, `dark:hidden`/`hidden dark:block`).
Todos os apoios pretos POR CIMA da arte acompanham com variantes `dark:` (senão o preto voltava):
overlays dos heróis do dashboard/curso (`from-red-950/* dark:from-black/*`), hover/chip "N
aulas"/botão play/trilha de progresso/estrela de favorito do `CourseCard`
(`bg-red-950/* dark:bg-black/*`). Varredura visual completa do modo claro feita por screenshot em
produção: landing (topo/meio/fim), checkout, /login, afiliado (login), dashboard, curso,
comunidade, acervo (feed + detalhe), cronograma, loja, favoritos, anotações, menu da conta, sino,
upgrade, mobile — só os banners estavam quebrados; o restante já era tokenizado. Escuro conferido
idêntico ao original após a mudança.

**🔴 Bug sistêmico: builder do supabase-js descartado com `void` NUNCA dispara.** O
PostgrestBuilder é lazy — só executa em `await`/`.then()`. Três chamadas em produção estavam
mortas desde o lançamento por causa disso: `archive_register_view` (contador de acessos do
acervo sempre 0), `flashcard_sessions` insert (nenhuma sessão de estudo gravada — por isso o
admin mostrava todo aluno "sem estudo") e `question_sessions` insert (nenhuma prova gravada).
Corrigidas com `.then()`. **Regra: nunca descartar chamada do supabase-js com `void` puro.**

**Visualizações do acervo por ABERTURA (pedido do dono):** `archive_register_view` reescrita
(migration `20260805020000_archive_view_per_open.sql`): +1 a CADA abertura de arquivo, por
qualquer cliente, sem dedupe (o dedupe por usuário anterior foi descartado junto com a
semântica antiga); devolve o total novo pra UI atualizar na hora. O cliente registra no
`openFile` (inclusive no auto-open via `?file=` da busca). Contadores zerados no lançamento da
semântica nova. Verificado em produção: abertura real de arquivo → RPC 200 devolvendo total
incrementado.

**Formulários de flashcards/questões cortados PRA DIREITA — bug era do Dialog base:** medido em
produção (Playwright): com `overflow-y-auto` no `DialogContent`, os filhos do grid saíam a 512px
dentro de um content-box de ~460px (`scrollWidth` 560 × `clientWidth` 510) — a coluna implícita
do grid é dimensionada pelo min-content dos filhos e estoura quando a barra de rolagem aparece.
Correção de UMA linha em `ui/dialog.tsx`: `[grid-template-columns:minmax(0,1fr)]` no
`DialogContent` (validado ao vivo: 560→510, zero overflow). Vale pra TODOS os modais com scroll
(gerador de flashcards, cronograma, acervo…) de uma vez.

---

### 2026-08-05 (sessão remota) — benefício de cronograma nos planos, pulo de 10s no player

**Benefício novo no Plus e Pro:** "Gerador de cronograma de estudos e mapa mental personalizados
para o seu interesse de estudo" adicionado a `PLAN_FEATURES` (plans.ts) e aos cards do checkout —
SÓ nesses dois planos (o dono vai restringir a função a eles futuramente; hoje o
`generate-study-plan` ainda bloqueia só o Mensal). Mesmo texto literal nos dois planos de
propósito (o diff do UpgradePlanModal esconde benefícios repetidos entre origem e destino).

**Pulo fixo de 10 segundos no player:** cliente reclamou que "adiantar/voltar pula tempo demais" —
não existiam botões próprios; só a barra nativa do `<video>`, que pula pro ponto clicado.
`LessonPlayer` ganhou botões laterais de −10s/+10s no vídeo (círculos com RotateCcw/RotateCw e o
rótulo "10"), botões equivalentes ao lado do `<audio>`, e as setas ← → do teclado fazem o mesmo
pulo (com `preventDefault` pra sobrepor o seek nativo de 5s; ignoradas dentro de
input/textarea/select). `skip()` trava em 0 e na duração. Verificado em produção: clique →
`currentTime` 0→10→0 exato.

**Cliente sem conseguir logar ("Failed to send a request to the Edge Function"):** o app era
servido INTEIRO também em `onemed-jade.vercel.app` (domínio automático da Vercel), mas as Edge
Functions só liberam `onemedcursos.com.br` no CORS — quem entrava pelo domínio da Vercel tinha
TODO chamado de função bloqueado pelo navegador, com esse erro cru no login (pro dono "funcionava"
porque ele testa no domínio oficial). Corrigido no `vercel.json`: redirect permanente por host —
qualquer `*.vercel.app` → `onemedcursos.com.br` preservando caminho e query (a raiz `/` precisa de
regra própria; `/:path*` sozinho não casa com ela). A tela de login também troca os erros de rede
(Failed to send/fetch/NetworkError) por mensagem em português com o que fazer. Verificado: `/`,
`/login`, `/membros` e `/checkout` no domínio vercel.app respondem 308 pro oficial.

**Gerador de flashcards/banco de questões com arquivos do Acervo Público:** cada arquivo no
detalhe do item ganhou a seta de dropdown com "Gerar flashcards deste arquivo" e "Gerar banco de
questões deste arquivo" (Popover; mesmo fluxo/viewers/salvamento das aulas, replicado no
`DetailDialog`; Mensal cai no AiUpsellModal). `generate-flashcards` aceita `archiveFileIds` junto
de `lessonIds` (teto conjunto de 8 fontes): a consulta dos arquivos roda com o JWT DO ALUNO — a
RLS do acervo decide acesso (testado: arquivo privado alheio → "não encontrado") — e os bytes
saem com o token da conta de conteúdo, que lê a pasta compartilhada do acervo (mesmo caminho do
worker de streaming). `FlashcardSource` ganhou `archive?: boolean` (chip com badge "Acervo
Público" no gerador; `selected` virou Map de objetos). Testado em produção de ponta a ponta:
geração real de questões a partir de PDF do acervo (~110s), fonte gravada como "«nome» (Acervo
Público)".

**Favoritar materiais do Acervo Público:** tabela `user_archive_favorites` (migration
`20260805030000_user_archive_favorites.sql`, mesmo padrão dos favoritos de curso/aula: RLS de
dono, toggle otimista direto na tabela, sem RPC). Estrela no canto dos cards do feed (irmã do
card — botão dentro de botão é HTML inválido) e botão "Favoritar" no detalhe do item; a aba
Favoritos da página inicial ganhou a seção "Acervo Público favoritado" (join com `archive_items`
passa pela RLS do acervo — item que virou privado some da lista sozinho; clicar navega pro item).
Verificado em produção: favoritar no card → badge no detalhe → seção na aba → navegação.

**Cupons de afiliados apagados — links dando "expirado" (04-05/08):** 18 dos 22 afiliados
estavam com `coupon_code` no cadastro mas SEM a linha em `coupons` (apagada da tabela — os
sobreviventes eram só os cadastrados depois de ~18h de 04/08 + um recriado à mão às 23:38).
Sintoma: todo indicado via `?ref=` ou digitando o cupom via "Cupom inválido ou expirado".
Cupons recriados em produção (10%, ativos) e fluxo E2E testado: link `?ref=` → landing guarda →
checkout auto-aplica em silêncio (R$ 269,91 no Vitalício) → `mp-create-payment` 200 → redirect
real pro Mercado Pago → `buyers` com `coupon_code` E `affiliate_ref`. Proteções: `/admin/cupons`
recusa excluir cupom que pertence a um afiliado (orienta desativar; confirmação nas demais
exclusões) e `affiliate-coupon` recria/reativa a linha se o afiliado re-salvar o próprio código.
Detalhe do fluxo: o checkout exige e-mail @gmail.com na etapa de dados (por design).

**Aulas .mov sem conversão abrem no player do Google (imediato) + lote de conversão retomado:**
cliente reportou "Não há nenhum vídeo com formato ou tipo MIME suportados" no medcof-2026 — era
uma das 46 aulas `.mov` (93 GB) que ficaram pendentes em 31/07 pela cota de download do Drive.
Solução imediata (pedido do dono): `LessonPlayer` ganhou `formatoSemSuporte` — vídeo com mime
quicktime/wmv/msvideo SEM `storage_path` vai DIRETO pro embed oficial do Drive (mesmo iframe do
fallback de cota; o Google transcodifica no servidor). Quando a conversão preenche `storage_path`,
o player próprio assume sozinho. Verificado em produção na aula exata do print (iframe carregou e
reproduz). Em paralelo, a cota resetou (sonda barata com Range aberto → 206) e o lote
`fix-unplayable-videos.mjs --ext=mov` foi relançado em produção (setsid/nohup + checagem agendada
via send_later) — idempotente, filtra `storage_path IS NULL`.

**Embed do Google promovido a solução DEFINITIVA para vídeo em formato sem suporte (decisão do
dono — lote de conversão dos 46 .mov encerrado):** a regra do `LessonPlayer` virou lista de
PERMITIDOS invertida — qualquer `video/*` fora de mp4/webm/ogg/mp2t, sem `storage_path` e com
`drive_file_id`, abre direto no player embutido do Drive; formato exótico futuro cai lá sozinho.
De quebra, a varredura achou **134 aulas com mime `text/texmacs`** (rótulo do Drive pra arquivos
`.ts`) que eram MPEG-TS disfarçado (sondagem por bytes 0x47 em 0/188): mime corrigido pra
`video/mp2t` no banco — essas tocam no player PRÓPRIO via mpegts.js, não no embed. Estado final
dos vídeos sem conversão: mp4 (99k, nativo), mp2t (12k, mpegts.js), quicktime (46, embed), webm
(3, nativo) — zero formatos sem tratamento. Áudios conferidos: só mpeg/ogg, todos nativos.

---

### 2026-08-05 (sessão remota) — auditoria completa de desempenho, segurança e UX (branch `claude/performance-audit-complete-7g5y9n`)

**Auditoria de ponta a ponta** (frontend, Edge Functions, SQL/RLS, build) com correções na
branch acima. **Nada foi deployado em produção nesta sessão** — deploy só depois do merge:
frontend sobe sozinho com o push na `main`; as ~10 Edge Functions alteradas precisam de
redeploy multipart; a migration `20260805120000_perf_indexes_rls_initplan.sql` precisa ser
aplicada. Detalhe no relatório da sessão. Destaques:

**Bundle:** `App.tsx` importava as ~40 páginas estaticamente — TODO visitante da landing
baixava 1.949 kB (537 kB gzip) com painel admin, Leaflet e player dentro. Rotas de
membro/admin/checkout/afiliado viraram `lazy()` (públicas prerenderizadas continuam
estáticas de propósito, senão o HTML do prerender piscava); `PdfViewer` (pdfjs, ~376 kB +
worker 1,4 MB) só baixa ao abrir um PDF. Bundle inicial: **690 kB (205 kB gzip), −62%**.
Chunk 404 pós-deploy recarrega a página uma vez em vez de tela branca.

**Segurança (CRÍTICOS, corrigidos):** `mp-create-payment` não regravava o `plan` validado —
como a linha de `buyers` é inserida pelo navegador, dava pra gravar `plan:'lifetime_pro'`,
pagar R$49,90 e o webhook liberava o Pro; `drive-share-folder` autorizava requisição SEM
header (com `verify_jwt=false`, qualquer curl compartilhava a biblioteca);
`drive-oauth-callback` não exigia auth nenhuma pra sobrescrever a conexão do Drive (e apagava
o `refresh_token` na reconexão — Google só o devolve na 1ª autorização);
`drive-save-folder`/`drive-list-folders`/`whatsapp-manager` aceitavam qualquer JWT logado
(trial lia a `evolution_api_key` e mensagens de clientes). Todos exigem admin agora.

**Pagamento confiável:** `mp-webhook` devolvia 200 em falha transitória (MP não reenviava →
cliente pago sem acesso pra sempre) — agora 500 força retry; se a concessão falha depois de
tomar a flag `access_granted`, a flag volta e o retry refaz (antes batia em "already granted"
e pulava tudo). `send-followup-emails`: janela de ±2h só cobria 4/24h do dia — a maioria dos
trials NUNCA recebia follow-up; agora 26h com dedupe pela tabela.

**Área de membros:** lista de aulas renderiza em lotes de 200 + "Mostrar mais" (megacurso de
31k aulas congelava a aba por segundos); progresso de vídeo acumula em ref e só vira estado ao
fechar/trocar de aula (re-render da página INTEIRA a cada 5s de reprodução); busca do curso com
`useDeferredValue`; timers de retry do player cancelados na troca de aula (retry da aula
anterior reiniciava a nova do zero); `member-account-info` em cache react-query compartilhado
(era 1 chamada de Edge Function POR NAVEGAÇÃO pra todo aluno, via TrialCountdownBar).

**Banco (migration 20260805120000, ⏳ aplicar):** índices funcionais `lower(email)` em
accesses/buyers/profiles (`is_trial_member()`/`my_member_status()` faziam 3 seq scans por
consulta em quase toda página); `lessons(course_id, sort_order, id)` (cada página do curso
reordenava 30k linhas); índices de FK cascade, archive_likes/views(item_id), etc.; ~30
políticas RLS com `has_role()`/`auth.uid()` cru embrulhadas em `(SELECT ...)` — inclui as 5
políticas admin FOR ALL que a 20260804040000 não cobriu (o has_role cru continuava rodando
POR LINHA em lessons via OR de política permissiva); RPC `increment_coupon_use` atômica.

**UX/erros silenciosos:** excluir comprador e "Sincronizar" trials pedem confirmação (eram
DELETEs permanentes de 1 clique); `ClaimAccessPage` distinguia falha de rede de "compra não
encontrada" (cliente que ACABOU de pagar via erro falso, sem retry); StudyPlan/StorageAccounts
com estado de erro (falha mostrava "vazio" como se os dados tivessem sumido); "Carregar mais"
da comunidade não apaga mais o feed; digitar na busca do acervo com material aberto não refaz
mais 3 consultas; F5 no /payment/success não perde mais plano/email; dropdowns de país fecham
ao clicar fora; rollback+aviso em favoritos/exclusões que falham; carrossel do dashboard 6s
com pausa por toque/foco e `prefers-reduced-motion`.

**Deploy em produção (feito nesta sessão, depois do relatório):** a migration
`20260805120000_perf_indexes_rls_initplan.sql` foi aplicada via Management API (19 índices
criados, 36 políticas com has_role/is_member agora em InitPlan, RPC `increment_coupon_use`
com EXECUTE só pra service_role) e as 10 Edge Functions alteradas foram redeployadas via
multipart preservando o `verify_jwt` de cada uma (8 false, 2 true — drive-save-folder e
drive-list-folders), todas com OPTIONS 200 (sem BOOT_ERROR). Verificação adversarial em
produção confirmou os gates de auth recusando (drive-share-folder sem header → 401 etc.) e o
planner usando os índices novos. **O frontend NÃO foi deployado** — depende do merge da branch
na `main` (Vercel detecta o push). Tokens do Supabase Management e do Vercel foram rotacionados
nesta sessão; a tabela de credenciais no topo já reflete os valores novos.

**Pendências documentadas (não corrigidas nesta sessão, por risco/escopo):** rewrites dos
feeds `community_feed`/`archive_feed` (subqueries correlacionadas por linha computadas antes
do LIMIT — os índices novos amortecem; rewrite exige cuidado com `_sort='relevant'`);
rate-limits não-atômicos das Edge Functions (RPC única resolveria os 7); `search_lessons` com
`unaccent` por linha (precisa de índice trigram + wrapper IMMUTABLE); cache de token do Google
no worker de streaming (hoje 1 chamada de Edge Function por range request); `types.ts` gerado
do Supabase desatualizado (16 tabelas de ~40 — regenerar com
`supabase gen types typescript --project-id jrrybiohwqabsdurqudc`).

---

### 2026-08-07 (sessão remota) — 2ª auditoria profunda (afiliados, loja, admin, auth, edge functions)

**Segunda varredura** cobrindo tudo que a primeira não aprofundou: sistema de afiliados,
loja, geradores de IA, todas as páginas admin restantes, fluxos de auth, componentes de
comunidade e o restante das Edge Functions + worker. As correções desta sessão FORAM
deployadas em produção (9 Edge Functions redeployadas via multipart, OPTIONS 200; frontend
aguarda merge na `main`). Destaques:

**Dinheiro / segurança (edge):**
- `mp-webhook`: trava de **auto-indicação de afiliado** — comprador usando o próprio
  cupom/ref ganhava 15-30% de volta e destravava o Vitalício Pro grátis com 5 compras
  próprias. Agora comissão só vale pra venda a outra pessoa.
- `send-access-email`: era um **relay de email aberto** (`verify_jwt=false`, sem checagem) —
  qualquer um mandava "pagamento aprovado" pelo domínio verificado da OneMed. Fechado com
  gate de service-role (mesmo mecanismo do drive-share-folder). Verificado: 401 sem auth.
- `run-email-campaign`: **claim atômico** (scheduled→running com guard) — invocações
  concorrentes mandavam o mesmo lote 2×; removido o fallback aberto quando `CRON_SECRET`
  em branco (idem `run-sms-job`).
- `member-lesson-token`/`member-stream-file`: entitlement passou a checar `expires_at` —
  trial vencido emitia token de 2h e assistia até o cron de revogação rodar.
- `whatsapp-webhook`: exige `apikey` (omitir o campo pulava a validação).
- `member-auth-request`: rate limit por IP usa `x-real-ip` (XFF esquerdo era forjável,
  zerando a trava de brute-force do login).
- `member-sync-library`: falha de gravação de aulas marca `error` após N tentativas (ficava
  `pending` pra sempre relistando o Drive).
- Worker Cloudflare: rejeita `accessToken` ausente (evita `Bearer undefined`). **Precisa de
  deploy manual do worker** (não sobe com as functions).

**Auth / UX (frontend):**
- `AuthContext`: parou de fazer `await` de supabase DENTRO do `onAuthStateChange` (risco de
  deadlock do supabase-js em refresh/entre-abas); só recomputa admin em mudança de identidade.
- `RegisterPage`: honesto sobre a concessão de admin. **Confirmado que a RLS de `user_roles`
  já bloqueia auto-concessão** (WITH CHECK exige has_role admin) — não era exploit, mas a
  página dizia "sucesso" quando o insert era negado.
- `CommentThread`/`CommunityTab`: `ensureName` na resposta aninhada, guard anti-duplo-submit
  no estado, toasts nos erros silenciosos.
- `PdfViewer`: destrói o documento pdf.js no cleanup (vazava worker/páginas por aula).
- `DriveSettings`: "Desconectar" pede confirmação (derrubava o acervo de todos num clique).
- `EmailCampaign`/`SMS`: confirmação antes de disparo em massa; polling do EmailCampaign
  para no unmount. `Coupons`: guarda de afiliado fail-closed. `WhatsApp`: typo `onomed`.
- Vários estados de erro com "tentar novamente" (Flashcards/StudyPlans/Acervo admin);
  `MemberLoginPage` valida tokens antes do setSession; `AccessManagement` pagina buyers.

**Pendências de decisão do dono (afiliados — mexem em pagamento real, NÃO alteradas):**
1. Comissão paga sobre upsells junto do plano (`transaction_amount` inteiro) — manter ou só
   sobre o plano?
2. Venda reembolsada continua com comissão a pagar (webhook só trata `approved`; não há
   reversão em refund/chargeback).
3. Token de indicação `?ref=` é o cupom (mutável) — trocar o cupom quebra a atribuição de
   quem clicou no link antigo. Um id imutável resolveria.

> **Atualização 2026-08-07 (fim desta sessão):** as 3 pendências acima foram RESOLVIDAS a
> pedido do dono — comissão passou a incidir só sobre o plano (`buyers.plan_amount`),
> reembolso/chargeback reverte a comissão (`affiliate_sales.status='reversed'`), e o link de
> indicação passou a usar `affiliates.ref_code` imutável. Migration
> `20260807120000_affiliate_commission_refund_refcode.sql` aplicada; mp-create-payment,
> mp-webhook e affiliate-register redeployados.

---

**"Edge Function returned a non-2xx status code" ao gerar banco de questões** (cliente com PDF
próprio): a frase é do supabase-js, não da nossa função. Em status não-2xx ele devolve `data`
NULO e só essa frase em `error.message` — a razão real vai no CORPO da resposta. O
`FlashcardGeneratorModal` lia só `error.message`, então QUALQUER recusa da função chegava ao aluno
como erro cru em inglês. Corrigido com `extractFunctionErrorMessage` (mesmo utilitário que
checkout/upgrade/stream já usavam).
**Causa real no caso relatado: o limite diário de 15 gerações (429).** Confirmado nos dados —
dois clientes com exatamente 15 tentativas na janela, um deles em 07/08, mesma data do print.
Descartadas por teste em produção: tamanho do arquivo (2/5/8/12 MB de upload → todos 200; o teto
prático é ~16 MB de payload) e PDF de editora (apostila real de 4,6 MB gerou 5 questões em 39s).
**Tetos de IA unificados em 100/dia (decisão do dono, 07/08):** o de 15/dia foi removido e, no
mesmo dia, substituído por um teto ALTO de segurança em TODAS as funções de IA — 100 por conta a
cada 24h em `generate-flashcards` (por modo: flashcards e questões), `generate-study-plan`
(era 10) e `member-assistant` (era 60). Não limita uso real (o aluno que mais usou fez 15 em
24h); serve só de rede contra abuso/script, já que a IA é paga por chamada. As três mensagens de
429 seguem o mesmo padrão: dizem quantas horas faltam (a janela é de 24h desde a PRIMEIRA
chamada, não o fim do dia) e citam o tipo certo. Verificado em produção nas três funções, nos
dois lados do teto: 30 gerações de questões → 200; 20 cronogramas → 200; 70 mensagens do
assistente → respondeu; e com o contador em 100 cada uma devolve a mensagem correta.
A mensagem do 429 também foi reescrita: dizia "tente amanhã", mas a janela é de 24h a partir da
PRIMEIRA geração — agora informa quantas horas faltam e cita o tipo certo ("bancos de questões"
× "baralhos de flashcards"). ⚠️ Tentativa que FALHA (erro de IA) também consome uma das 15.

---

**Arquivo do acervo abria mas NÃO rolava e o clique "saía do documento"** (cliente com PDF de
apostila): o `LessonPlayer` do acervo é portalizado no `document.body`, ou seja, FORA do
`DialogContent` do detalhe do item. Com o diálogo em modo **modal**, o Radix aplica
`react-remove-scroll` + `pointer-events: none` em tudo que está fora do content — o PDF renderiza
mas fica inerte. Reproduzido em produção antes de mexer (`body` com `pointer-events: none`,
`scrollTop` preso em 0). Correção: `<Dialog modal={!sobreposto}>` no `DetailDialog`, onde
`sobreposto` = player OU FlashcardViewer OU QuestionBankViewer aberto (os dois últimos são irmãos
do diálogo e sofriam o mesmo), mais `onInteractOutside`/`onEscapeKeyDown` bloqueados nesse período
— sem isso um clique dentro do player contaria como "fora" e fecharia o detalhe junto. Verificado
em produção no MESMO arquivo do print do cliente: rolagem 0 → 2.740px de 8.202px, clique na página
e na margem sem fechar, e ao fechar o player o detalhe volta a ser modal normalmente.
**Regra:** overlay em portal + Radix Dialog modal não convivem — quando um sobe, o diálogo de trás
tem que sair do modo modal.

---

**"SEMANA 10 aparecendo junto com a 1" — ordenação alfabética virou NATURAL:** o dono viu no
mapa do MEDCURSO 2026 que a Semana 10 caía entre a 1 e a 2. Causa: `recalc_course_totals`
numerava módulos e aulas com `ORDER BY` de TEXTO, e em texto "SEMANA 10" < "SEMANA 2". Não era
específico desse curso — **8.960 módulos em 82 cursos** e **108.641 aulas** estavam fora de ordem
("Aula 2" × "Aula 10", "Bloco 3" × "Bloco 12"). Migration `20260805060000_natural_sort_modules.sql`:
nova função `natural_key(texto)` (quebra em pedaços dígito/não-dígito e zera à esquerda os
números em 12 casas, então a comparação de texto respeita o valor numérico) usada nos dois
`ORDER BY` do recalc. Reordenação aplicada em produção em TODOS os cursos (módulos de uma vez,
aulas curso a curso pra não estourar o timeout da API).
**Desempate obrigatório:** 18 cursos têm pastas de nome idêntico (ex: dois "Gastrologia" no
MEDCurso) — sem `id` no fim do `ORDER BY` o `row_number()` alternava a cada recálculo e a
verificação nunca convergia. Com o desempate, converge em zero. Correção é 100% de banco:
nenhum deploy de frontend foi necessário (a UI já lia `sort_order`).

---

### 2026-08-05 (sessão remota) — MEDCURSO 2026: semanas 8, 9, 10 e a 6 completa

**Pedido:** sincronizar o MEDCURSO com a pasta `1aWl1UsFms5_W9n1rAkRY_yWGBL8Ug515` (plataforma
tinha até a Semana 6 parcial; a pasta tem 6, 8, 9 e 10 — **não existe Semana 7** na origem).

**Descoberta que destravou tudo:** a pasta nova ("MED Curso 2026") é da PRÓPRIA conta de
armazenamento da plataforma (`ufgravity@gmail.com`), mas não estava compartilhada com a conta de
CONTEÚDO (`onemedcursos@gmail.com`) — que é justamente quem o worker de streaming usa pra servir
os bytes. Daí o 404 na API. Compartilhada como leitura (permissão criada com o token da conta de
armazenamento, via função temporária depois removida); sem isso as aulas importariam mas NÃO
tocariam.

**Importação (62 arquivos, 19,3 GB, 35 módulos):** Semana 6 ganhou a estrutura completa
(Ped 1 · Preventiva, com Video Aulas / Aula Bônus / No Papo) dentro do módulo `SEMANA 6` que já
existia; Semanas 8, 9 e 10 viraram módulos novos, nomeados em CAIXA ALTA (`SEMANA 8`) pra casar
com as 1-6. Curso foi de 123 → **185 aulas**. Script `scratchpad/importar.mjs` espelha o
`member-sync-library` (mesmo `lessonType`, `path`, `depth`, `parent_module_id`, `drive_path`,
`last_seen_at`), com simulação por padrão e `--aplicar` pra gravar.

**Duplicata conhecida e deliberada:** "AULA ESPECIAL- TRIAGEM NEONATAL" existe duas vezes na
Semana 6 — a antiga (2,15 GB, solta na raiz do módulo, vinda da pasta do `medbrasil31`, com
**13 alunos com progresso**) e a nova (442 MB, dentro de `Ped 1/Video Aulas`). Não apaguei a
antiga porque `lesson_progress` cai por CASCADE; a nova, muito mais leve, é a que menos sofre com
a cota de download do Drive.

⚠️ **Duas fontes no mesmo curso:** `courses.drive_folder_id` continua apontando pra pasta ANTIGA
(`medbrasil31`, semanas 1-6 + banco de questões). As semanas novas moram na pasta do ufgravity.
Consequência: `scripts/deep-library-sync.mjs` rodado SEM `--only` marcaria as 62 aulas novas com
`missing_since` (não apaga, e o aluno continua vendo — a página do curso não filtra por esse
campo; o botão "Sincronizar biblioteca" do painel também nunca marca). Se for rodar o script
completo, restaure o `missing_since = null` dessas aulas depois.

---

**Plano Mensal: R$49 → R$99.** Preço vive em 4 fontes de verdade que precisam andar juntas
(`src/lib/plans.ts` PLAN_PRICES · `CheckoutPage` PLANS · `mp-create-payment` PLAN_PRICES, que é
quem realmente cobra · `member-account-info` PLAN_PRICES, usado no desconto do upgrade de quem
não tem linha em `buyers`). Citações que precisaram acompanhar: rótulo "Só Plano Mensal (R$ 99)"
no seletor de cupom, prompt do `member-assistant` (a IA respondia o preço antigo) e o teste
`upgradePriceFor('monthly','annual')` (150 → 100). Herdam sozinhos: JSON-LD de SEO, pixel/CAPI e
UpgradePlanModal (todos leem PLAN_PRICES). Verificado em produção: `mp-create-payment` gravou
`amount: 99.00` numa preferência real do Mercado Pago e o checkout exibe R$99,00.
⚠️ **Efeito colateral aceito:** o upgrade é diferença de TABELA, então quem pagou R$49 no Mensal
passa a receber R$99 de crédito ao subir para o Anual (paga R$100 em vez de R$150).

---

**Área "Contas do Painel" (`/admin/contas`, só admin):** gestão de quem entra no painel.
RPC `admin_panel_accounts` (migration `20260805050000_admin_panel_accounts.sql`; user_roles
admin/viewer × auth.users com último login) + Edge Function `admin-panel-accounts` (service
role): `create` (e-mail já existente ganha o papel SEM trocar a senha — senão seria roubo de
conta de assinante), `set_role`, `reset_password`, `remove` (tira só o papel; a conta de usuário
fica). Trava: recusa demover/remover o ÚLTIMO admin. Visualizador não vê o item de nav
(`adminOnly` no navItems) e é recusado na RPC e na função (testado em produção: lista admin ok,
viewer barrado nos dois caminhos, criar/remover conta ok, UI conferida logada como viewer).

---

### 2026-08-05 (sessão remota) — conta VISUALIZADORA do painel admin

**Papel `viewer`** (pedido do dono): conta `medestudosplusmedicina@gmail.com` (senha definida
pelo dono) entra no painel `/admin` inteiro em modo leitura; edição SÓ na **Loja** (criar/gerir
produtos) e na **Área de Membros** (conceder/renovar/revogar acesso — sem DELETE de linha).
Migration `20260805040000_viewer_role.sql`: valor `viewer` no enum `app_role` (ALTER TYPE em
statement separado!); policies de SELECT pra viewer em accesses/buyers/coupons/visits/affiliates/
affiliate_sales/email_followups/user_roles/store_orders; FOR ALL em `store_products`; INSERT+
UPDATE em `accesses`. `is_member()` e `can_read_library_audit()` ganharam bypass do viewer (o
painel de comunidade/acervo/biblioteca lê por eles); RPCs admin_* de leitura re-gateadas pra
admin-OU-viewer via `pg_get_functiondef` + replace direto em produção. `AuthContext` expõe
`isViewer` (admin OU viewer abrem o painel); `AdminLayout` mostra faixa fixa "Modo visualização".
**`drive_config` fica FORA do viewer de propósito** (tokens OAuth do Drive — a página Google
Drive aparece como desconectada pra ele). Enforcement é NO BANCO: sondas confirmaram leitura ok,
criar produto ok, conceder acesso ok, e PATCH em coupons/buyers e DELETE em accesses afetando 0
linhas. Login real testado no navegador em produção (dashboard + faixa + loja + membros).

---

### 2026-08-07 (sessão remota) — INCIDENTE: TDZ no CourseDetailPage derrubou a área de membros

**Sintoma:** após o deploy do frontend, os alunos viram "Algo deu errado ao
carregar a página" ao abrir qualquer curso; console com
`ReferenceError: can't access lexical declaration 'X' before initialization`
(trace em `CourseDetailPage` + `index.js`, dentro de um `useMemo`).

**CAUSA REAL (não era o code-splitting):** no `CourseDetailPage`, o
`useMemo` de `initialWatchedSeconds` executava o callback já na 1ª renderização
referenciando `pendingProgress`/`flushPendingProgress`, que estavam declarados
(`const`) ~30 linhas ABAIXO. `const` tem TDZ: usar antes da linha de declaração
estoura `ReferenceError` — e o `useMemo` invoca o callback SÍNCRONO no render.
`madge --circular` confirmou ZERO dependência circular; o erro aparecia tanto
no bundle dividido quanto no único (por isso reverter o splitting NÃO resolveu).

> ⚠️ **`tsc` e `vite build` NÃO pegam esse bug** — não sabem que o `useMemo`
> chama o callback sincronamente, então "const usado antes da declaração dentro
> de um callback" passa reto. Só quebra em runtime, ao RENDERIZAR a página.
> Testes unitários que não montam a página também não pegam. **Regra: hooks que
> rodam no render (`useMemo`/`useDeferredValue`/código inline) só podem
> referenciar coisas declaradas ACIMA deles no componente.**

**Correção (hotfix `04a183e`):** mover a declaração de
`pendingProgress`/`flushPendingProgress` para ANTES do `useMemo`/`useEffect`
que as usam. Deploy verificado (bundle novo servido, rotas 200).

**Sobre o code-splitting:** foi revertido no meio da investigação (commit
`6acb8a2`) por suspeita errada — a plataforma segue hoje com bundle único
(~1,9MB), imports estáticos no `App.tsx` e `PdfViewer` estático no
`LessonPlayer`. Como o splitting NÃO era a causa, dá pra reintroduzir com
segurança depois (a otimização de −62% fica pendente); `madge` já confirma que
não há ciclo de import pra atrapalhar.

---

### 2026-08-07 (sessão remota) — 3º incidente do mesmo lote: `<Suspense>` órfão + varredura da classe de erro

**Sintoma:** `ReferenceError: Suspense is not defined` ao abrir aula tipo PDF em
`/membros/curso/*` (print do cliente, bundle `index-Bvi1JO0u`/`-DzptLWzL`). Terceiro
`ReferenceError` da mesma leva de reversões (depois de `fetchRoster` e do TDZ do
CourseDetailPage).

**Causa:** ao reverter o code-splitting do `PdfViewer` (voltar pro import estático),
o import de `Suspense` foi removido do `LessonPlayer` mas o JSX
`<Suspense>…</Suspense>` em volta do `<PdfViewer>` ficou órfão. Corrigido removendo
o wrapper (commit `fe4a3ed`) — `PdfViewer` renderiza direto.

**Causa-raiz de por que os 3 vazaram pra produção:** `npm run build` = `vite build`
(SWC), que **STRIPA os tipos sem type-check**. Os três (`Suspense`, `fetchRoster`,
identificadores) seriam pegos por `tsc --noEmit`, que **nunca fazia parte do deploy**.
Agora `tsc --noEmit` é gate obrigatório antes de qualquer push de frontend.

**Varredura completa da classe de erro (para fechar de vez):**
- `tsc --noEmit`: **limpo** — zero identificador indefinido em qualquer arquivo/branch
  (pega `Suspense`/`fetchRoster` e qualquer irmão).
- `eslint no-use-before-define` (variables:true) no `src` inteiro: todos os hits são
  referências dentro de `useEffect`/handlers/`async` que rodam DEPOIS do corpo do
  componente — **nenhum TDZ de render** (o do CourseDetailPage, já corrigido, não tem
  irmão). Verificado caso a caso (MemberDashboard `userId`, CourseDetail `podeGerarIa`,
  Checkout `getTotalPrice`, Archive `reallyStart`, DriveSettings `canResume`).
- Redes de segurança novas: `src/test/lessonPlayerRender.test.tsx` (renderiza o
  LessonPlayer por tipo de aula, reprova ReferenceError — testado: falha COM o bug,
  passa SEM); `src/test/setup.ts` ganhou polyfills de
  ResizeObserver/IntersectionObserver/scrollIntoView (gaps do jsdom).
- 102 testes verdes; build de produção OK (prerender 27/27). Deploy verificado no
  bundle vivo: a assinatura do bug (`animate-spin text-white/70`, que só existia no
  fallback do `<Suspense>`) NÃO está mais no `index-*.js` servido em produção.

**Regra reforçada:** hooks que rodam no render (`useMemo`/`useDeferredValue`/JSX inline)
só referenciam coisas declaradas ACIMA deles; e **`tsc --noEmit` antes de todo deploy**
(o build com SWC não substitui type-check).

---

### 2026-08-07 (sessão remota) — 145 aulas `.mp4.gdrive` removidas do "Anatomia [MuscleFLIX]"

**Relato:** arquivos `.mp4.gdrive` no meio dos cursos que não reproduzem, "destruindo a
experiência". Todas as 145 estavam num único curso: **Anatomia [MuscleFLIX]**
(`course_id 553995eb-61ae-4173-8056-bc1bd220f946`), que tem 283 aulas = **138 vídeos
reais + 145 ponteiros**.

**O que são:** cada `.gdrive` é um arquivo-TEXTO de 168 bytes (`{"":"WARNING! DO NOT
EDIT THIS FILE!","doc_id":"…","resource_key":"","email":"medconteudos21@gmail.com"}`) —
ponteiro deixado por uma ferramenta de backup quando NÃO conseguiu copiar o vídeo de
origem. Não são vídeo; o worker de streaming baixava os 168 bytes e o `<video>` não
tocava.

**Por que não dá pra fazer tocar (medido, não suposto):** o vídeo real mora em
`medconteudos21@gmail.com` e **nunca foi compartilhado com a conta de conteúdo**. Testei
os **145 doc_ids**: `onemedcursos` → **0/145 (todos 404)**; `ufgravity` → 403; público →
401. A pasta do curso é de `medcinerdrive@gmail.com`, compartilhada com `onemedcursos`
(os 138 vídeos reais tocam: metadata 200, range 206) — mas os 145 alvos não. A plataforma
só tem token de `onemedcursos` (conteúdo) e `ufgravity` (storage); nenhum de
`medconteudos21`/`medcinerdrive`. **Sem os bytes compartilhados/copiados, não há o que
servir.**

**Ação (escolha do dono: "esconder por ora, reversível"):** DELETE das 145 linhas-ponteiro
(cascata: só 1 `lesson_progress`, 0 anotações/comentários/favoritos) + DELETE iterativo de
146→149 módulos que ficaram vazios (o feed já esconde módulo vazio, mas o `CourseTree` não).
`recalc_course_totals` rodado. Curso ficou **138 aulas, 143 módulos, 0 vazios** — só DB, sem
deploy (produção lê o mesmo banco, então já sumiram pra todos). Mapa completo de restauração
(lesson→doc_id + módulos removidos) em **`scripts/muscleflix-gdrive-pointers.json`** — quando
o acesso for concedido (compartilhar origem com `onemedcursos` OU token de
`medcinerdrive`/`medconteudos21`), reimportar apontando `drive_file_id=doc_id`.

**Import futuro protegido:** `member-sync-library` e `scripts/deep-library-sync.mjs` já
PULAM arquivos `.gdrive` (não reimportam os ponteiros). Ressalva: um re-sync manual pode
recriar as PASTAS vazias (a subpasta ainda existe no Drive só com o `.gdrive` dentro) —
reaparecem como pasta vazia no `CourseTree`, nunca como aula quebrada.

---

### 2026-08-07 (sessão remota) — Mensal cobrando R$49 em vez de R$99 (deploy defasado do mp-create-payment)

**Relato:** cliente usou o cupom `ONE50` e o Mensal de R$99 saiu por "20 e pouco".

**Causa:** `24,50 = 49,00 × 0,5`. O `mp-create-payment` **em produção** ainda tinha
`PLAN_PRICES.monthly = 49.00` (extraído do eszip da função no ar, versão 65) enquanto o
REPO já estava em `99.00`. Ou seja: a mudança de preço pra R$99 foi feita no código mas o
`mp-create-payment` **não foi redeployado** — provavelmente revertido por um redeploy da
própria função no dia 07/08 (trabalho de afiliados) a partir de uma cópia com o preço antigo.
O Vitalício saía certo (`149,95 = 299,90 × 0,5`) porque só o preço do Mensal mudou.

**Correção:** redeploy do `mp-create-payment` (repo → versão 66, `verify_jwt=false`, OPTIONS
200). Confirmado em produção com chamada real (monthly + ONE50): `buyers.amount = 49,50`,
`plan_amount = 49,5` — R$99 − 50% correto. As outras 3 fontes de preço já estavam em 99
(`plans.ts`, `CheckoutPage` display, `member-account-info` deployado).

**Regra:** mudar preço de plano exige redeploy do `mp-create-payment` (quem cobra) E conferir
o preço no eszip da função no ar — não basta o repo. Ideal: extrair `PLAN_PRICES` pra um lugar
só; hoje vive em 4 fontes.

**Cobranças abaixo do valor na janela do bug (07/08, entre o redeploy defasado e a correção):**
`liaregocr@gmail.com` pagou R$49 (devia R$99, sem cupom) e `ronaibandrade@gmail.com` pagou
R$24,50 (devia R$49,50, ONE50). Decisão sobre cobrar a diferença é do dono — nenhuma ação
financeira tomada. (Os vários `49,00` ANTERIORES a 06/08 estavam certos: o Mensal era R$49 até
a subida pra R$99 em ~06/08.)

---

### 2026-08-09 (sessão remota) — Vercel Speed Insights

**Pedido:** o painel da Vercel mostrava o card "Speed Insights / Get Started" sem nenhum dado.

Speed Insights mede a experiência REAL de carregamento dos alunos (LCP, CLS, INP coletados no
navegador de quem acessa), diferente do Analytics de visitas. O card do painel ensina o passo do
**Next.js** (`@vercel/speed-insights/next`) — aqui é **React + Vite**, então a integração é pelo
subcaminho `/react`, com o componente montado dentro do `BrowserRouter`.

| Arquivo | Mudança |
|---|---|
| `package.json` | `@vercel/speed-insights@2` |
| `src/App.tsx` | `<SpeedInsightsRotas />` ao lado do `<PixelPageViews />`, dentro do `BrowserRouter` |

**O detalhe que importa — agrupar as rotas dinâmicas.** Sem passar `route`, o pacote reporta a
URL crua e cada curso vira uma linha própria no painel: são **403 cursos**, e o relatório viraria
uma lista de caminhos únicos com 1 amostra cada, sem média utilizável. `ROTAS_DINAMICAS`
normaliza antes de reportar:

```
/membros/curso/<slug>   → /membros/curso/[slug]
/cursos/<categoria>     → /cursos/[categoria]
```

Rota estática é reportada como está. É o mesmo padrão que a Vercel usa nativamente no Next.

**Verificado em produção** (deploy `013c71b` READY): `/_vercel/speed-insights/script.js` responde
200 e o `window.si` fica pronto; `data-route` conferido no navegador — `/cursos/cardiologia-ecg` e
`/cursos/pediatria` reportam ambos `/cursos/[categoria]`; com sessão de teste (criada e apagada na
mesma execução), dois cursos diferentes reportam ambos `/membros/curso/[slug]`, enquanto
`/membros` e `/membros/acervo` reportam a si mesmos.

> O prerender NÃO carrega o beacon (o `dist/index.html` não tem a tag) — é client-only por
> design, então nem o SSR nem o sitemap mudam. Os primeiros números aparecem no painel conforme
> os alunos navegam.

---

### 2026-08-09 (sessão remota) — plataforma adaptada a monitores ultra-wide

**Relato:** print de um monitor de ~2000px com tudo espremido no meio. Medido antes de mexer,
em 1920/2560/3440: o conteúdo ficava preso a **1400px** (dashboard), 1280px (curso), 1152px
(acervo) e 1024px (cronograma) — em 3440px isso é **1020px de tela vazia de cada lado, 59% do
monitor**. O painel admin tinha o problema OPOSTO: era 100% fluido (`flex-1 p-6`), então as
fileiras de 4 cards de métrica esticavam para **~740px cada**, com o número num canto e o resto
vazio.

**Sistema de larguras (o ponto principal — fica num lugar só):**
- Breakpoints `3xl: 1920px` e `4xl: 2560px` em `tailwind.config.ts` (o Tailwind parava no 2xl,
  1536px).
- Cinco cascas em `@layer components` no `index.css`: `.shell-wide` (1400→1800→2240, área de
  membros e admin), `.shell-page` (max-w-7xl→1560→1840, landing e silo de SEO), `.shell-list`
  (max-w-6xl→1400→1680, acervo), `.shell-form` (max-w-5xl→1240→1440, checkout/cronograma/
  afiliado) e `.shell-read` (max-w-2xl→860→1000, comunidade/loja).

> A largura BASE de cada casca é a que a plataforma já usava — **em telas de até 1919px nada
> muda**. Conferido por medição em 390/768/1366: idêntico ao anterior, zero vazamento horizontal.

**Corrigiu de quebra um desalinhamento que já existia** (visível nos prints "antes"): na área de
membros o header era 1400px, o conteúdo do curso 1280px e o bloco do título do curso 1000px —
três alinhamentos diferentes na mesma tela. Agora os três compartilham a mesma casca. Mesma
coisa no checkout (nav/etapas/rodapé eram `max-w-4xl` contra `max-w-5xl` dos cards de plano).

**Proporção, não só largura.** Casca larga com 4 colunas fixas não resolve nada, e mais colunas
sem casca maior só encolhe os cards. As duas coisas crescem juntas, então o card fica MAIOR:

| viewport | colunas | largura do card |
|---|---|---|
| 1366 (notebook) | 4 | 249px |
| 1920 | 5 | 276px |
| 3440 | 6 | 301px |

⚠️ **As colunas extras entram só em `3xl`+, nunca em `xl`.** Na primeira tentativa usei
`xl:grid-cols-5` (1280px) — como a casca só cresce a partir de 1920, isso ESPREMIA o card de
257px para 202px em qualquer desktop de 1440px. Regra: coluna nova só no mesmo breakpoint em
que a casca cresce.

**Outros ajustes de proporção:** banner de destaque ganhou altura (340→400→460px) e o texto
deixou de ficar preso num quarto da esquerda; mapa do curso foi a 380px (os nomes de módulo
vinham truncados) e a coluna de aulas ganhou teto de 1560px (senão a linha vira um vão de 800px
entre o título e os ícones); cards das prateleiras 192→232px; faixas de métrica do admin com
teto de 1400px (as tabelas seguem usando os 2240px).

**Comunidade e cronograma crescem pouco de propósito** (672→1000px e 1024→1440px): são coluna
de leitura. Esticar um feed de discussão para 3000px piora a leitura, e dividir conversa
encadeada em colunas seria pior ainda. Continuam com margem larga em 3440 — é decisão, não
esquecimento.

**Verificado em produção** (deploy `d93e18d`): dashboard e curso 1400→2240px, acervo
1152→1680px, grade de categoria em 6 colunas, admin capado em 2240 com card de métrica caindo
de 720px para 456px. Contas de teste (assinante e um admin temporário) criadas e apagadas na
mesma execução.

**🔴 Achado grave: o gate de deploy `tsc --noEmit` não checava NADA.** O `tsconfig.json` da raiz
é solution-style (`"files": []` + `references`), então `tsc --noEmit` nele compila zero arquivo e
sempre sai 0. Comprovado nesta sessão: quebrei um JSX de propósito, `tsc --noEmit` passou e o
`vite build` falhou. É por isso que os três `ReferenceError` de 07/08 (`Suspense`, `fetchRoster`,
TDZ) chegaram em produção mesmo depois do gate ter sido "adicionado". O comando real é
**`tsc -p tsconfig.app.json --noEmit`**, agora nos scripts:

```bash
npm run typecheck        # o projeto de verdade (hoje: 141 erros de TIPO pré-existentes)
npm run typecheck:refs   # só a classe que derruba produção — hoje limpo
```

O typecheck completo está VERMELHO por causa do `types.ts` desatualizado (16 tabelas de ~40 —
pendência já documentada): 141 erros, todos de tipo (TS2769/TS2345/TS2339/TS2322…) em 29
arquivos. **Zero** da classe que quebra em runtime (TS2304 identificador indefinido, TS1005
sintaxe, TS2448 TDZ) — por isso `typecheck:refs` filtra exatamente esses códigos e serve como
gate utilizável hoje. Regenerar o `types.ts` destravaria o gate completo.

---

### 2026-08-09 (sessão remota) — download de aula em vídeo vira exclusividade do Vitalício Pro

**Regra nova:** nenhum plano baixa **aula em vídeo**, exceto o **Vitalício Pro** (e admin).
**Arquivo** (apostila, PDF, planilha, imagem, áudio) segue como estava: do Vitalício pra cima.
O corte aula×arquivo é `lessons.type === 'video'` — o MESMO que a página do curso já usa nas
abas "Aulas" e "Arquivos", então o aluno vê a regra batendo com o que a tela mostra.

`src/lib/plans.ts` continua sendo a fonte única, agora com DUAS listas
(`PLANS_WITH_DOWNLOAD` para arquivo, `PLANS_WITH_LESSON_DOWNLOAD` para aula) e um porteiro
`canDownloadItem(plano, item)`. Trocar quem pode baixar é editar um `Set`.

**🔴 O buraco que isso fechou (o principal desta mudança):** o `dl` do Worker de streaming era
**só um parâmetro de URL, sem assinatura**. Como todo aluno que assiste recebe uma URL de
streaming, bastava acrescentar `&dl=aula.mp4` a ela para o Worker devolver
`Content-Disposition: attachment` e salvar o vídeo — **em qualquer plano, inclusive trial**.
Esconder o botão no frontend não resolveria nada.

Agora a permissão de baixar entra na **assinatura**: `member-lesson-token` resolve o plano
(maior tier entre as linhas ativas, mesmo critério do `member_plan_tier`), recusa o pedido com
403 quando não há direito, e só então assina o sufixo `.dl` e devolve a URL com `&dlok=1`. O
Worker verifica com a mensagem que inclui `.dl` quando `dlok=1` vem na URL, e **ignora o `dl`**
em qualquer outro caso. O cliente pede `intent: 'download'` explicitamente.

> Compatibilidade: URL SEM `dlok` continua verificada com a mensagem antiga
> (`id.exp.mime`) — os tokens de 2h emitidos antes do deploy seguiram tocando normalmente.
> Por isso a ordem de deploy é **Worker primeiro, Edge Function depois**: o Worker novo aceita
> os dois formatos, enquanto o Worker antigo recusaria a assinatura nova (403 para quem baixa).

**Verificado em produção** com contas reais dos 5 planos (criadas e apagadas no próprio teste):

| plano | aula: stream | aula: download | arquivo: download |
|---|---|---|---|
| monthly / annual | 200 | **403** | **403** |
| lifetime / lifetime_plus | 200 | **403** | 200 |
| lifetime_pro | 200 | **200** | 200 |

E as três sondas de bypass: URL de streaming + `&dl=` → **206 inline** (streaming intacto, sem
`Content-Disposition`); URL do Pro com `dlok` assinado → **attachment**; `&dlok=1` forjado numa
URL de streaming → **403 assinatura inválida**. Na interface, conta Vitalício clicando no
download de uma aula vê "Baixar aulas é exclusivo do Vitalício Pro"; conta Pro baixa direto.

**Textos de venda acompanharam:** `PLAN_FEATURES` e os cards do checkout ganharam "Download das
aulas em vídeo — exclusivo do Pro" SÓ no Pro (o teste `downloadPlans.test.ts` que exigia zero
novidade de download entre Plus→Pro codificava a regra antiga e foi atualizado para exigir
exatamente essa linha). O convite de upgrade ganhou uma terceira versão: quem já baixa arquivo
e esbarra numa aula vê que falta o Pro, em vez de "seu plano não inclui downloads".

⚠️ **Duas brechas que continuam abertas de propósito** (são decisão de produto, não bug):
1. **Backup no Drive próprio** é benefício de Plus **e** Pro (`BACKUP_FOLDER_PLANS` no
   `mp-webhook`) e entrega a biblioteca inteira, vídeos inclusive. Ou seja: o Plus não baixa
   aula pela plataforma, mas alcança os vídeos pelo backup. Fechar isso é tirar o backup do
   Plus.
2. **Aulas com `storage_path`** (~240, as convertidas para o bucket `lesson-media`) são servidas
   por signed URL do Supabase Storage, que honra `?download=` como parâmetro solto — o mesmo
   truque do `dl` antigo. Fechar exigiria proxy próprio para esses arquivos.

> E o limite físico: vídeo que **toca** no navegador pode ser capturado por quem insistir. O que
> essa mudança garante é que não sai mais um arquivo pronto, com um clique, para quem não pagou.

---

### 2026-08-09 (sessão remota) — MEDCURSO 2026: semanas 11 e 12

**Pedido:** o dono subiu mais semanas na MESMA pasta de antes
(`1aWl1UsFms5_W9n1rAkRY_yWGBL8Ug515`, no Drive de armazenamento `ufgravity`) — sincronizar o que
faltava.

**Varredura completa da pasta** (recursiva, atalhos resolvidos, zero erros de listagem):
6 pastas de topo (Semanas 6, 8, 9, 10, **11 e 12**), 54 pastas, **97 arquivos, 34,21 GB**.

**Comparação arquivo a arquivo por ID do Drive:**

| semana | arquivos | já na plataforma | a importar |
|---|---|---|---|
| 6, 8, 9, 10 | 62 | **62** | 0 |
| **11** | 19 | 0 | **19** (4,32 GB) |
| **12** | 16 | 0 | **16** (10,55 GB) |

Paridade exata com a importação de 05/08 nas semanas antigas — nada tinha se perdido. Zero
arquivos `.gdrive`, zero stubs de 55.855 bytes, zero colisão de nome (as três armadilhas que já
morderam esta biblioteca antes foram checadas explicitamente).

**Importado:** 35 aulas e 18 módulos (`SEMANA 11|12 / <DISCIPLINA> / {Video Aulas, Aulas Bônus,
No Papo}` — mesma estrutura das semanas 8-10), com semana em CAIXA ALTA para casar com as 1-10.
Curso foi de **185 → 220 aulas** (129 vídeos, 90 PDFs, 1 doc), 99,8 GB. Zero duplicata por
`drive_file_id`.

**Antes de gravar, conferido que a conta de CONTEÚDO (`onemedcursos`) lê os bytes** — a pasta é
do `ufgravity`, e foi exatamente isso que quase impediu a importação de 05/08. O
compartilhamento daquela sessão propagou para as subpastas novas: `alt=media` com `Range` curto
devolveu `206` e assinatura `ftypisom` (MP4 de verdade, não TS disfarçado nem stub).

**Ordenação:** `recalc_course_totals` renumerou com `natural_key` — SEMANA 10, 11 e 12 ficam
DEPOIS da 9, não entre a 1 e a 2. Conferido na página do curso em produção, com conta de teste
criada e apagada na mesma execução: o mapa lista SEMANA 1…12 na ordem certa e o streaming de uma
aula nova de cada semana responde 206 com bytes de MP4.

**Durações:** as 34 aulas novas em vídeo entraram sem `duration_seconds`. Preenchidas em 34/34
lendo SÓ `videoMediaMetadata.durationMillis` do Drive — chamada de metadado, **não baixa bytes**,
então não consome a franquia de download de nenhum vídeo (o
`admin-backfill-lesson-durations` faria o mesmo, mas com fallback que lê trechos do arquivo).
Curso passou a somar 35,9h. O resto do curso segue com cobertura parcial de duração (31/95
vídeos antigos), situação anterior a esta sessão.

⚠️ **Segue valendo o aviso de 05/08:** `courses.drive_folder_id` deste curso aponta para a pasta
ANTIGA (`medbrasil31`, semanas 1-6 + banco de questões). As semanas 8-12 moram na pasta do
`ufgravity`. Rodar `scripts/deep-library-sync.mjs` SEM `--only` marcaria as 97 aulas dessas
semanas com `missing_since` (não apaga, e o aluno continua vendo — a página do curso não filtra
por esse campo; o botão "Sincronizar biblioteca" do painel também nunca marca). Se rodar o
script completo, restaure o `missing_since = null` dessas aulas depois.

---

### 2026-08-10 (sessão remota) — gerador de questões: 3 defeitos distintos

**Relato:** "não está funcionando, gerando apenas 1 questão e às vezes nem gera".

**O motor está são.** Antes de mexer, medi em produção com conta real: apostila PDF pedindo 15,
30 e 5 → **15/15, 30/30, 5/5**, todas completas (4 alternativas + `why` paralelo). Upload próprio
do aluno → 15/15. O limite diário também foi descartado: ninguém passou de **15/100**. Os
sintomas vinham de outro lugar.

**1. "apenas 1 questão" — o campo de quantidade não podia ser limpo.** Reproduzido no navegador:

| ação do aluno | campo | botão |
|---|---|---|
| inicial | `10` | Gerar 10 questões |
| 1 backspace | `1` | **Gerar 1 questão** |
| 2 backspaces (queria limpar) | `1` | **Gerar 1 questão** |
| digita "20" em seguida | `120`→clamp | **Gerar 30 questões** |

O estado era numérico com clamp a CADA tecla: `Number('') || 1` devolvia 1 no instante em que o
campo esvaziava, e o valor voltava para o input controlado. Quem queria 20 gerava **1** (se não
percebia) ou **30** — nunca 20. Corrigido guardando o valor como TEXTO enquanto se digita, com o
ajuste só no `blur` e no envio. Verificado depois do deploy: apagar deixa vazio, digitar "20" dá
20.

**2. Pedir 30 entregava ~21, em silêncio.** Com várias fontes, `max_tokens: 16384` cortava a
resposta no meio e o parser (que recupera o último objeto completo) salvava só o pedaço — sem
avisar. Teto subiu para **32768** e, se ainda faltar, uma segunda chamada pede só a diferença
listando o que já existe para o modelo não repetir. Verificado: **30/30** e **25/25**.
⚠️ A segunda chamada dobra o tempo (uma geração pesada já leva ~80s), então ela só roda se
faltou mais de 10% E o relógio da function ainda tem folga (<90s) — estourar o limite entregaria
ZERO questões, que é pior do que entregar algumas a menos.

**3. Aula em vídeo virava questão inventada a partir do NOME do arquivo.** O pior dos três.
A função manda os primeiros 10 MB do vídeo para a IA, mas **7 de 12 vídeos amostrados têm o
átomo `moov` no fim do arquivo** (não são "faststart"), então esse trecho é indecifrável e
sobrava só o título. O aluno pedia 15 questões sobre a aula e recebia 15 questões plausíveis
inventadas em cima de um nome de arquivo — com cara de legítimas, para estudar medicina.
Agora, quando NENHUMA fonte teve o conteúdo lido de verdade (contador `fontesLidas`), a geração
é recusada com 422 e orientação para escolher a apostila do módulo. Verificado em produção.

> Corrigir a leitura do vídeo em si exigiria remuxar para faststart (mover o `moov` para o
> começo) — não dá para concatenar prefixo + `moov` e obter um MP4 válido. Enquanto isso, o
> caminho honesto é recusar em vez de inventar.

**4. A causa REAL do relato, achada depois com o print do cliente: o modo IMPORTAR.** O aluno
enviava "um PDF com +100 questões" e recebia 1 — sempre pelo caminho **"usar banco de questões
já existente"**. Reproduzido com provas de residência reais (UFSC 2022, 43 páginas; um simulado
de 11 páginas), enviadas por upload como o aluno faz:

| | antes | depois |
|---|---|---|
| prova de 43 páginas | **504 aos 151s** (nada) | **200, 20 questões, 88s** |
| simulado de 11 páginas | **504 aos 150s** (nada) | **200, 18-20 questões, ~93s** |

Eram **três** defeitos empilhados no mesmo laço:

- `if (lote.length < LOTE_IMPORT) break` — transcrever questão de prova é caro em tokens
  (enunciado com caso clínico + 5 alternativas + justificativa de cada uma), então o primeiro
  lote de 20 estourava o limite de saída, o parser recuperava só a primeira questão inteira e o
  laço encerrava achando que o documento tinha acabado. **Era o "só gerou 01".** Agora só encerra
  quando o lote não traz NENHUMA questão nova; lote curto não é sinal de fim.
- **Sem trava de tempo**, o laço rodava 6 lotes e a function morria com **504 aos 150s**. Checar
  o relógio ANTES do lote não bastou (a primeira tentativa ainda deu 504): com 100s no relógio e
  um lote de 50s, a chamada termina em 150s. Agora só começa um lote que **caiba inteiro** no que
  sobra, estimando pela duração do lote anterior.
- A **repetição automática** dentro de `obterCartas` dobrava a rodada: num PDF grande, duas
  chamadas de ~75s davam exatamente 150s. Ela agora só acontece se couber no relógio.

`LOTE_IMPORT` caiu de 20 para **10** — lote menor cabe inteiro na resposta e o laço avança mais
rápido. Quando o tempo acaba, a resposta traz as questões já transcritas e um aviso honesto
("Importei as 20 primeiras… envie o documento dividido em partes"): **não existe retomada**, uma
nova geração recomeça da primeira questão, então o aviso não promete o que o sistema não faz.

⚠️ Um PDF grande no modo GERAR chegou a **145s** numa medição — perto do corte de 150s. É
comportamento anterior a esta sessão (uma única chamada ao modelo, sem laço), mas fica o registro:
documento muito maior que isso pode estourar. O teto do complemento no modo normal foi apertado
de 90s para **75s** por causa disso.

---

### 2026-08-10 (sessão remota) — curso "AnestReview" (1 arquivo) removido da plataforma

Havia **dois** cursos com esse nome: `anestreview` (1 aula, 1 KB) e
`anestesiologia-anestreview` (**1.214 aulas, 140 GB** — o curso de verdade). O da reclamação era
o primeiro; a "aula" era um Google Doc chamado **"Acessar pelo telegram, link abaixo:"**, ou
seja, um ponteiro para canal externo, não conteúdo.

**Desativado (`active=false`), não deletado — de propósito.** O aluno só vê `active=true` (o
dashboard e a página de curso filtram por isso), então o efeito visível é o mesmo. A diferença
está na durabilidade: `member-sync-library` casa curso existente por `drive_folder_id` e **nunca
toca em `active`**; se a linha fosse APAGADA, a próxima "Sincronizar biblioteca" acharia a pasta
`190AKwx4SmRUQB0JKyagrpE2a27f6cG_L` de novo e **recriaria o curso ativo**. Deletar parece
resolvido hoje e volta sozinho depois. Mesmo critério dos 5 cursos vazios de 04/08.

Perdas: nenhuma de conteúdo. Ficaram presos ao curso oculto 1 registro de progresso e 1 favorito
(preservados — reativar em `courses` traz tudo de volta). Verificado em produção com conta real:
a busca por "anest" agora devolve só o curso de 1.214 aulas, e `/membros/curso/anestreview`
responde "Curso não encontrado". Mudança só de banco, sem deploy.

---

### 2026-08-10 (sessão remota) — reajuste geral dos planos

**Preços novos** (Mensal já estava em R$99): Anual 199→**299** · Vitalício 299,90→**499** ·
Plus 599→**798** · Pro 997→**1.497**. As 4 fontes + assistente + rótulos de cupom atualizados
juntos; `AccountMenu` parou de ter o amount da renovação hardcoded (lê `PLAN_PRICES`). Âncoras
riscadas do checkout (R$399/R$667) mantidas — seguem acima dos preços novos. Testes de
`upgradePriceFor` refeitos para os degraus novos (Plus→Pro 699 · Vitalício→Plus 299 ·
Anual→Vitalício 200 · Mensal→Anual 200).

**Verificado em produção, 12/12 casos** com preferências REAIS do Mercado Pago (buyers de teste
apagados após): preço cheio dos 5 planos exato; **ONEMED30 (30%)** em annual/lifetime/pro
cobrando exatamente o que o checkout exibe (R$209,30 / R$349,30 / R$1.047,90 — conferido também
visualmente no resumo do checkout); upgrades por diferença de tabela com sessão logada
(299/699/200) e upgrade+cupom (R$209,30). Eszip do `mp-create-payment` NO AR extraído e
conferido com os valores novos — a lição do incidente de 07/08, quando o repo tinha R$99 e a
função no ar cobrava R$49.

---

### 2026-08-10 (sessão remota) — planos redefinidos: download só Pro, IA por plano, tabela comparativa

**Download** (decisão do dono): QUALQUER download — arquivo OU aula em vídeo — passa a ser
EXCLUSIVO do Vitalício Pro (e admin). `PLANS_WITH_DOWNLOAD` e `PLANS_WITH_LESSON_DOWNLOAD` viram
os dois `{lifetime_pro, admin}`; `member-lesson-token` acompanha (`podeBaixar = isAdmin || plano
=== 'lifetime_pro'`). Vitalício e Plus deixaram de baixar arquivo. O `dl` do Worker segue
assinado no HMAC, então continua sem como burlar pela URL. Verificado em produção com contas dos
5 planos: aula e arquivo com `intent=download` → **403 em todos menos o Pro (200)**.

**Ferramentas de IA — limite por plano (enforcement REAL nas 3 functions:** `generate-flashcards`
nos dois modos, `generate-study-plan`, `member-assistant`): Mensal **BLOQUEADO** (403); Anual
**5/dia**; Vitalício **10**; Plus **20**; Pro e admin sem limite de plano (só o teto de segurança
de 100). O limite é POR FERRAMENTA — cada uma tem seu contador em `rate_limits` (action
`flashcards`/`questions`/`study_plan`/`assistant`), como o dono pediu. O `member-assistant` passou
a bloquear o Mensal também (antes só lia o plano pra contexto). Cada função resolve o plano via
`my_member_status` (mesma RPC das telas) e usa `LIMITE_IA_POR_PLANO[plano] ?? 100`. Verificado em
produção pré-carregando o contador na fronteira: no limite → 429 com a mensagem certa; um abaixo →
passa; Pro com 30 no contador não trava; Mensal 403 nas três ferramentas.

**Benefícios reescritos** (`plans.ts` PLAN_FEATURES + cards do `CheckoutPage` + prompt do
`member-assistant`): atualizações — Mensal/Anual **nenhuma** ("acervo atual"), Vitalício **anuais
dos cursos básicos**, Plus **anuais dos intermediários**, Pro **mensais de 95% + novos cursos**.
Download e IA como acima. Os textos IGUAIS entre planos vizinhos (`Acesso vitalício`, o backup no
Drive) são idênticos de propósito — o diff do `UpgradePlanModal` esconde o que a pessoa já tem; os
que MUDAM de valor (telas, limite de IA, atualizações) têm texto próprio e aparecem como novidade
no upgrade.

**Tabela comparativa** dos 5 planos no checkout: novo `src/components/PlanComparisonTable.tsx`,
abaixo dos cards, com scroll horizontal próprio no mobile (a página nunca rola de lado), ✓/✗ e
condições por célula, coluna do Pro destacada. É uma verdade só — bate com PLAN_FEATURES e com o
enforcement do servidor.

⚠️ **Brecha mantida de propósito:** o **backup no Drive próprio** (Plus e Pro) entrega a
biblioteca inteira, vídeos inclusos — então o Plus não baixa pela plataforma mas alcança tudo pelo
backup. O dono não pediu pra mexer no backup; fechar isso seria tirar o benefício do Plus.

---

### 2026-08-10 (sessão remota) — importar banco grande: a plataforma divide sozinha (paginação)

**Pedido:** um banco de 100-150 questões no modo "usar banco existente" entregava só ~20 — o
resto era cortado pelo limite de 150s da Edge Function. O dono pediu que a própria plataforma
dividisse e gerasse por partes.

**Solução — importação PAGINADA orquestrada pelo cliente:**
- `generate-flashcards` aceita `importStart` (nº da 1ª questão do bloco), transcreve o que couber
  no tempo e devolve `importDone` + `importNextStart`.
- O `FlashcardGeneratorModal` chama em sequência a partir do `importNextStart`, acumula (dedupe
  por enunciado) e mostra o progresso ao vivo ("Transcrevendo o banco… N questões"). Para quando
  `importDone` ou nenhuma questão nova; tetos de 300 questões e 24 chamadas.
- **A operação inteira conta como UMA geração** no limite diário: só a primeira chamada
  (`importStart<=1`) passa pelo contador; continuações (`ehContinuacao`, importStart>1) pulam o
  rate limit. Sem isso, um banco de 150 questões gastaria ~8 do limite do plano.

**Verificado em produção** com a prova UFSC 2022 (43 páginas, ~60 questões): **60/60 em 4
chamadas** (~6 min total, com progresso subindo), todas completas, zero duplicata. Antes: 20 no
máximo. Modo GERAR normal intacto (chamada única, `importDone=true`).

> Custo assumido: bancos grandes levam minutos (cada bloco é uma chamada ao modelo, ~60-115s). O
> aluno vê o número subir e precisa manter a tela aberta — foi o trade-off aceito para entregar o
> banco inteiro em vez de pedir pra dividir o PDF à mão.

---

### 2026-08-11 (sessão remota) — caixa de boas-vindas do trial, IA 5× no trial, receita de ontem

**Caixa flutuante ao iniciar o trial** (`TrialWelcomeModal.tsx`, montada no `MemberDashboardPage`
— destino do fluxo de trial): aparece UMA vez, avisando que "os cursos nas versões mais
atualizadas e totalmente completos ficam disponíveis apenas após a assinatura, para evitar
cópias", com botão "Entendi". Marcado como visto em `localStorage` por conta (`om_trial_welcome_
seen_<uid>`); só existe para `status === 'trial'`. Verificado em produção: trial vê e não
reaparece após "Entendi"+reload; conta paga não vê.

**Trial nas ferramentas de IA: 5 usos por ferramenta** (decisão do dono — "só pra conferir o
funcionamento"). `LIMITE_IA_POR_PLANO` ganhou `trial: 5` nas 3 functions
(`generate-flashcards` nos dois modos, `generate-study-plan`, `member-assistant`); no 6º uso →
429 com mensagem específica de trial ("Você usou as 5 utilizações liberadas no teste grátis.
Assine um plano para continuar…"). O **cronograma bloqueava trial totalmente no frontend**
(`if (isTrial)` → tela de "exclusivo para assinantes") — removido, agora o trial gera e o limite
de 5 é aplicado no servidor como nas demais. Flashcards/questões já liberavam trial
(`podeGerarIa = memberPlan !== 'monthly'`). Verificado em produção nas 4 ferramentas: no 5º → 429,
no 4º → passa.

**Receita de ONTEM no admin** (`BuyersPage`): novos badges "Receita Ontem" e "Aprovados Ontem"
ao lado dos de hoje. Novo helper `yesterdayStartISO()` — janela fechada `[ontem 00h, hoje 00h)`
no fuso de São Paulo (não pode incluir hoje). Verificado em produção contra o banco: R$ 4.469,00
e 14 aprovados ontem, batendo exatamente.

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
