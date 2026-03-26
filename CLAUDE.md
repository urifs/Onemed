# OneMed — Contexto de Projeto para Claude Code

> Este arquivo é carregado automaticamente em toda sessão do Claude Code.
> Atualize-o ao final de cada sessão com decisões, mudanças e contexto relevante.

---

## Visão Geral

**OneMed** é uma plataforma de cursos médicos (SaaS) que vende acesso a um acervo no Google Drive via Mercado Pago. O fluxo principal:

1. Usuário acessa a landing page → solicita trial de 30 min
2. Drive é compartilhado automaticamente via Edge Function
3. Trial expira → acesso revogado pelo cron job
4. Usuário converte → paga via MP → acesso permanente liberado

**Site:** https://onemedcursos.com.br
**Repositório:** https://github.com/urifs/Onemed
**Branch principal:** `main`

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Supabase Edge Functions (Deno) |
| Banco | Supabase PostgreSQL + RLS |
| Pagamentos | Mercado Pago (Checkout Pro) |
| Armazenamento conteúdo | Google Drive (pasta compartilhada) |
| Emails | Resend API |
| Hospedagem | Vercel (frontend) |

---

## Supabase

**Project ID:** `jrrybiohwqabsdurqudc`
**URL:** `https://jrrybiohwqabsdurqudc.supabase.co`
**Região:** South America (São Paulo)
**Anon Key (pública):** ver `.env.example`

### Deploy de Edge Functions (sem Docker)
```bash
export SUPABASE_ACCESS_TOKEN="sbp_0bfd1b84358ef0811676dca4fc2eb8108b7bd07e"
supabase functions deploy <nome> --project-ref jrrybiohwqabsdurqudc --use-api

# Deploy de todas de uma vez:
for fn in create-trial-access drive-list-folders drive-oauth-callback drive-revoke-access drive-save-folder drive-share-folder mp-create-payment mp-webhook send-access-email send-followup-emails; do
  supabase functions deploy $fn --project-ref jrrybiohwqabsdurqudc --use-api
done
```

O token também está salvo em `~/.bashrc` na máquina de desenvolvimento.

### Tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `accesses` | Acessos trial e paid com status/expiração |
| `buyers` | Compradores com external_reference do MP |
| `coupons` | Cupons de desconto com limite de uso |
| `visits` | Rastreamento de visitas na landing |
| `drive_config` | Config OAuth do Google Drive |
| `email_followups` | Controle de emails de follow-up enviados |
| `user_roles` | Roles de admin |
| `rate_limits` | Rate limiting das Edge Functions |

---

## Edge Functions

| Função | Chamada por | Descrição |
|--------|-------------|-----------|
| `create-trial-access` | Frontend (landing) | Cria trial de 30min + compartilha Drive |
| `mp-create-payment` | Frontend (checkout) | Gera preferência no Mercado Pago |
| `mp-webhook` | Mercado Pago | Processa pagamento aprovado |
| `drive-share-folder` | Interna | Compartilha pasta Drive com email |
| `drive-revoke-access` | Cron (*/5 min) | Revoga acessos trial expirados |
| `drive-list-folders` | Admin panel | Lista pastas do Drive |
| `drive-save-folder` | Admin panel | Salva pasta configurada |
| `drive-oauth-callback` | OAuth flow | Troca code por tokens do Google |
| `send-access-email` | Interna | Envia emails de confirmação (Resend) |
| `send-followup-emails` | Cron (13h UTC) | Envia follow-ups para trials expirados |

---

## Variáveis de Ambiente (Supabase Secrets)

Configuradas em: **Supabase Dashboard → Edge Functions → Secrets**

| Variável | Status | Descrição |
|----------|--------|-----------|
| `MP_ACCESS_TOKEN_PROD` | ✅ Configurado | Token de produção do Mercado Pago |
| `MP_ACCESS_TOKEN_TEST` | ✅ Configurado | Token de teste do MP |
| `GOOGLE_CLIENT_SECRET` | ✅ Configurado | Secret OAuth do Google |
| `RESEND_API_KEY` | ✅ Configurado | API key do Resend |
| `MP_WEBHOOK_SECRET` | ⏳ Pendente | Secret HMAC do webhook MP (pegar no dashboard MP → Webhooks) |
| `CRON_SECRET` | ⏳ Pendente | Secret para autenticar cron jobs (gerar com `openssl rand -hex 32`) |

---

## Planos e Preços (server-side)

```typescript
lifetime: R$ 299,90  // Acesso permanente
annual:   R$ 199,00  // 12 meses
upsell:   R$  19,90
upsell2:  R$   9,90
```

---

## Segurança — Estado Atual (2026-03-26)

### Correções aplicadas ✅
- **HMAC webhook MP**: verificação de assinatura via `x-signature` (ativa quando `MP_WEBHOOK_SECRET` configurado)
- **CORS restrito**: todas as 10 funções retornam `onemedcursos.com.br` em vez de `*`
- **Rate limiting**: `create-trial-access` (5/15min por IP) e `mp-create-payment` (10/hora por email) — ativo após migration `rate_limits`
- **Constant-time compare**: `drive-share-folder` usa HMAC em vez de `===` para comparar service key
- **CRON_SECRET**: `drive-revoke-access` e `send-followup-emails` verificam `x-cron-secret` (ativo quando `CRON_SECRET` configurado)
- **Validação de email**: regex em `create-trial-access`
- **Cron jobs**: migration `20260326000002_fix_cron_jobs.sql` remove token hardcoded, usa vault

### Pendente de configuração manual ⏳
1. Adicionar `MP_WEBHOOK_SECRET` no Supabase Secrets
2. Gerar `CRON_SECRET` (`openssl rand -hex 32`) → adicionar em Secrets E Vault
3. Aplicar migrations: `20260326000001_rate_limits.sql` e `20260326000002_fix_cron_jobs.sql`

### RLS
- Todas as tabelas com RLS ativado
- Tabelas protegidas por políticas admin + insert público controlado por CHECK constraints
- `drive_config`, `email_followups`: admin only

---

## Migrations Aplicadas

| Arquivo | Descrição |
|---------|-----------|
| `20260323163043_*.sql` | Schema inicial, RLS, policies |
| `20260323163104_*.sql` | Policy fixes |
| `20260324002232_*.sql` | drive_permission_id |
| `20260324002357_*.sql` | pg_cron setup |
| `20260324034623_*.sql` | email_followups table |
| `20260324203337_cron_jobs.sql` | Cron jobs (token hardcoded — substituir pela migration abaixo) |
| `20260326000001_rate_limits.sql` | Tabela rate_limits ⏳ aplicar |
| `20260326000002_fix_cron_jobs.sql` | Cron jobs sem token hardcoded ⏳ aplicar |

---

## Estrutura de Arquivos Relevante

```
onemed/
├── src/
│   ├── pages/
│   │   ├── CheckoutPage.tsx     # Checkout com seletor de país/WhatsApp
│   │   ├── Dashboard.tsx        # Dashboard admin (métricas diárias)
│   │   ├── BuyersPage.tsx       # Listagem de compradores
│   │   └── CouponsPage.tsx      # Gestão de cupons
│   ├── context/AuthContext.tsx  # Auth admin
│   └── App.tsx                  # Rotas (admin protegidas com ProtectedRoute)
├── supabase/
│   ├── config.toml              # project_id: jrrybiohwqabsdurqudc
│   ├── functions/               # 10 Edge Functions
│   └── migrations/              # SQL migrations
├── .env.example                 # Chaves públicas do Supabase
└── CLAUDE.md                    # Este arquivo
```

---

## Histórico de Sessões

### Sessão 2026-03-26
**Sincronização remota**
- Projeto sincronizado com GitHub (`urifs/Onemed`) para acesso via Claude Code mobile
- `.env.example` criado com chaves públicas do Supabase
- `supabase/.temp/` adicionado ao `.gitignore`

**Auditoria e correções de segurança**
- 6 vulnerabilidades corrigidas: HMAC webhook MP, token hardcoded no SQL de cron, rate limiting, constant-time compare, CORS `*`, validação de email
- 2 migrations criadas: `rate_limits` (tabela) e `fix_cron_jobs` (remove token hardcoded)
- Rate limiting defensivo (não quebra se migration não aplicada)
- Todas as 10 Edge Functions com CORS restrito a `onemedcursos.com.br`

**Deploy**
- Supabase CLI autenticado: token `sbp_0bfd1b84358ef0811676dca4fc2eb8108b7bd07e` salvo em `~/.bashrc`
- Deploy via `--use-api` (sem Docker) funcionando
- 10 funções deployadas e verificadas em produção

**Testes pós-deploy (todos ✅)**
- Validação de email (sem @, malformado → 400)
- Trial creation, duplicate detection
- Pagamento MP (plano inválido → 400, lifetime R$299,90 → init_point)
- Webhook fake processado sem erro
- Drive revoke, follow-up emails, send-access-email
- Drive list folders: 100 pastas retornadas (Drive conectado)
- CORS: origem maliciosa bloqueada, `onemedcursos.com.br` autorizada

**Sistema de contexto**
- `CLAUDE.md` criado na raiz (carregado automaticamente em toda sessão)
- Disponível no GitHub → sincroniza com mobile automaticamente

---

## Comandos Úteis

```bash
# Deploy de uma função específica
export SUPABASE_ACCESS_TOKEN="sbp_0bfd1b84358ef0811676dca4fc2eb8108b7bd07e"
supabase functions deploy mp-webhook --project-ref jrrybiohwqabsdurqudc --use-api

# Testar trial creation
curl -s -X POST "https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/create-trial-access" \
  -H "Authorization: Bearer $(grep PUBLISHABLE .env.example | cut -d'"' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Push para produção
git add -A && git commit -m "feat: ..." && git push origin main
```
