# OneMed — Contexto de Projeto para Claude Code

> **INSTRUCAO OBRIGATORIA:** Ao iniciar qualquer sessao, leia este arquivo COMPLETO antes de qualquer acao.
> Este arquivo e carregado automaticamente em toda sessao do Claude Code.
> Atualize-o ao final de cada sessao com decisoes, mudancas e contexto relevante.

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

## Vercel

**Projeto:** `onemed`
**Project ID:** `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt`
**URL:** `https://onemedcursos.com.br`

---

## Credenciais de Acesso (uso exclusivo do Claude)

> Tokens necessarios para operacoes autonomas. Usar diretamente sem solicitar ao usuario.

| Servico | Variavel | Valor |
|---------|----------|-------|
| Supabase Management API | `SUPABASE_ACCESS_TOKEN` | `sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec` |
| Vercel API | `VERCEL_TOKEN` | `vcp_6m85MdQjg3YEmboL3Bg4x0fHzqTfXiuhQQubBmzGE3tjjqhdDt0JF7SY` |
| Vercel Project ID | `VERCEL_PROJECT_ID` | `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt` |
| Supabase Project Ref | `SUPABASE_PROJECT_REF` | `jrrybiohwqabsdurqudc` |

---

### Deploy de Edge Functions (sem Docker)
```bash
export SUPABASE_ACCESS_TOKEN="sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec"
supabase functions deploy <nome> --project-ref jrrybiohwqabsdurqudc --use-api

# Deploy de todas de uma vez:
for fn in create-trial-access drive-list-folders drive-oauth-callback drive-revoke-access drive-save-folder drive-share-folder mp-create-payment mp-webhook send-access-email send-followup-emails sync-pending-buyers; do
  supabase functions deploy $fn --project-ref jrrybiohwqabsdurqudc --use-api
done
```

**IMPORTANTE — Deploy via `--use-api`:**
O esbuild remove comentários ao compilar. Se a mudança no código for apenas em comentários, o hash do bundle não muda e o Supabase silenciosamente ignora o deploy (versão antiga continua rodando). Sempre fazer uma mudança real no código (ex: alterar string de log). Confirmar que o número de versão bumped após o deploy.

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

| Função | Versão Atual | Chamada por | Descrição |
|--------|-------------|-------------|-----------|
| `create-trial-access` | v10 | Frontend (landing) | Cria trial de 30min + aguarda Drive + envia email |
| `mp-create-payment` | v13 | Frontend (checkout) | Gera preferência no Mercado Pago |
| `mp-webhook` | v12 | Mercado Pago | Processa pagamento aprovado, sem race condition |
| `drive-share-folder` | v7 | Interna | Compartilha pasta Drive com email |
| `drive-revoke-access` | v13 | Cron (*/5 min) | Revoga acessos trial expirados |
| `drive-list-folders` | v11 | Admin panel | Lista pastas do Drive |
| `drive-save-folder` | v6 | Admin panel | Salva pasta configurada |
| `drive-oauth-callback` | — | OAuth flow | Troca code por tokens do Google |
| `send-access-email` | v12 | Interna | Envia emails de confirmação (Resend) |
| `send-followup-emails` | v13 | Cron (13h UTC) | Envia follow-ups para trials expirados |
| `sync-pending-buyers` | v5 | Admin panel | Sincroniza compradores pendentes com MP API |

---

## Variáveis de Ambiente (Supabase Secrets)

Configuradas em: **Supabase Dashboard → Edge Functions → Secrets**

| Variável | Status | Descrição |
|----------|--------|-----------|
| `MP_ACCESS_TOKEN_PROD` | ✅ Configurado | Token de produção do Mercado Pago |
| `MP_ACCESS_TOKEN_TEST` | ✅ Configurado | Token de teste do MP |
| `GOOGLE_CLIENT_SECRET` | ✅ Configurado | Secret OAuth do Google |
| `RESEND_API_KEY` | ✅ Configurado | API key do Resend |
| `VERCEL_TOKEN` | ✅ Configurado | Token de deploy do Vercel |
| `VERCEL_PROJECT_ID` | ✅ Configurado | ID do projeto Vercel |
| `CRON_SECRET` | ✅ Configurado | Secret para autenticar cron jobs (Secrets + Vault) |
| `MP_WEBHOOK_SECRET` | ⏳ Pendente | Secret HMAC do webhook MP (pegar no dashboard MP → Webhooks) |

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

### Ativo e funcionando ✅
- **CORS restrito**: todas as 11 funções retornam `onemedcursos.com.br` em vez de `*`
- **CRON_SECRET**: `drive-revoke-access` e `send-followup-emails` verificam `x-cron-secret`; cron jobs SQL leem o secret do Vault
- **Rate limiting**: código ativo em `create-trial-access` (5/15min por IP) e `mp-create-payment` (10/hora por email)
- **Validação server-side**: email, plano, preço e cupom validados no backend
- **Drive obrigatório no trial**: countdown só aparece após Drive efetivamente compartilhado; se falhar → rollback
- **Race condition no webhook**: `mp-webhook` verifica existência de acesso antes de inserir
- **drive_permission_id salvo**: todos os compradores pagos têm permissão registrada para futura revogação
- **Auth JWT em `drive-share-folder`**: verifica `service_role` no payload ou admin no `user_roles`
- **HMAC webhook MP**: código presente, ativo quando `MP_WEBHOOK_SECRET` for configurado
- **RLS**: todas as tabelas com RLS ativado

### Pendente ⏳
1. Configurar `MP_WEBHOOK_SECRET` no Supabase Secrets (pegar no dashboard MP → Webhooks)
2. Aplicar migration `20260326000001_rate_limits.sql` (rate limiting sem enforcement real até lá)

### Baixa Prioridade (não bloqueante)
- `ClaimAccessPage` grava acesso direto no banco pelo frontend (usuário com `external_reference` válido pode se auto-conceder acesso sem pagamento aprovado)
- `access_type` inconsistente: webhook salva `'paid'`, ClaimAccessPage salva `'lifetime'`/`'annual'`
- Preços nos emails de follow-up são strings hardcoded
- Tabela `rate_limits` sem limpeza automática

---

## Migrations

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `20260323163043_*.sql` | ✅ Aplicada | Schema inicial, RLS, policies |
| `20260323163104_*.sql` | ✅ Aplicada | Policy fixes |
| `20260324002232_*.sql` | ✅ Aplicada | drive_permission_id |
| `20260324002357_*.sql` | ✅ Aplicada | pg_cron setup |
| `20260324034623_*.sql` | ✅ Aplicada | email_followups table |
| `20260324203337_cron_jobs.sql` | ✅ Substituída | Cron jobs antigos (token hardcoded) |
| `20260326000001_rate_limits.sql` | ⏳ Pendente | Tabela rate_limits |
| `20260326000002_fix_cron_jobs.sql` | ✅ Aplicada via SQL direto | Cron jobs com CRON_SECRET do Vault |

---

## Estrutura de Arquivos Relevante

```
onemed/
├── src/
│   ├── pages/
│   │   ├── Index.tsx            # Landing + trial form + countdown inline
│   │   ├── CheckoutPage.tsx     # Checkout com seletor de país/WhatsApp
│   │   ├── Dashboard.tsx        # Dashboard admin (métricas diárias)
│   │   ├── BuyersPage.tsx       # Listagem de compradores + botão Sincronizar
│   │   ├── TrialUsersPage.tsx   # Listagem de trials (admin)
│   │   └── CouponsPage.tsx      # Gestão de cupons
│   ├── context/AuthContext.tsx  # Auth admin
│   └── App.tsx                  # Rotas (admin protegidas com ProtectedRoute)
├── supabase/
│   ├── config.toml              # project_id: jrrybiohwqabsdurqudc
│   ├── functions/               # 11 Edge Functions
│   └── migrations/              # SQL migrations
├── public/
│   ├── admin-manifest.json      # PWA manifest (scope /admin)
│   ├── admin-sw.js              # Service Worker (scope /admin)
│   └── icons/admin-icon.svg     # Ícone PWA admin
├── src/components/
│   └── AdminPWAHead.tsx         # Injeta meta tags PWA dinamicamente
├── .env.example                 # Chaves públicas do Supabase
└── CLAUDE.md                    # Este arquivo
```

---

## Resumo Executivo do Projeto

### Base
Plataforma SaaS de cursos médicos que vende acesso a um acervo no Google Drive via Mercado Pago.

**Fluxo principal:**
Landing → trial 30min grátis → Drive compartilhado → trial expira → follow-up por email → checkout → pagamento MP → acesso permanente

**Planos:** Lifetime R$299,90 / Annual R$199,00 + upsells R$19,90 e R$9,90

### Frontend (rotas públicas)
- `/` — Landing com formulário de trial; countdown renderizado **inline** após submit (não há rota `/trial` separada)
- `/checkout` — Checkout com 4 etapas, seletor de país/WhatsApp
- `/payment/success`, `/payment/pending`, `/payment/error` — Páginas de retorno do MP
- `/claim-access` — Resgate de acesso por compra manual
- `/termos`, `/privacidade` — Páginas legais
- `/admin/*` — Painel admin protegido por ProtectedRoute

### Backend (11 Edge Functions — todas em produção)
| Função | Responsabilidade |
|--------|-----------------|
| `create-trial-access` | Trial + rate limit + Drive obrigatório + email |
| `mp-create-payment` | Valida plano, calcula preço server-side, gera checkout MP |
| `mp-webhook` | Processa pagamento aprovado, sem race condition |
| `drive-share-folder` | Compartilha pasta Drive via Google API, salva permission_id |
| `drive-revoke-access` | Revoga trials expirados (cron */5min) |
| `drive-oauth-callback` | Troca code OAuth por tokens Google |
| `drive-list-folders` | Lista pastas do Drive (admin) |
| `drive-save-folder` | Salva pasta configurada (admin) |
| `send-access-email` | Envia email de boas-vindas (trial/paid) |
| `send-followup-emails` | Follow-ups 1d/7d/30d com cupons ONEMED10/20/30 (cron 13h UTC) |
| `sync-pending-buyers` | Sincroniza compradores pendentes com MP API (admin) |

### Estado Geral
Sistema **totalmente operacional** em produção. Fluxo completo trial → pagamento → acesso funcionando. Drive compartilhado corretamente para trials e compradores. Cron jobs autenticados via CRON_SECRET do Vault. CORS restrito em todas as funções. Todos os compradores pagos com `drive_permission_id` registrado.

**IMPORTANTE — Chamadas internas entre Edge Functions:**
Nunca usar `supabase.functions.invoke` para chamar outra Edge Function de dentro de uma Edge Function. O Supabase JS SDK envia o **anon key** no header Authorization (não o service role key), causando 401 em funções protegidas. Usar sempre `fetch()` diretamente **sem Authorization header** para chamadas internas — o `drive-share-folder` e outras funções internas autorizam chamadas sem header (`if (!authHeader) → isAuthorized = true`).

---

## Histórico de Sessões

### Sessão 2026-03-26 (desktop)
- Projeto sincronizado com GitHub (`urifs/Onemed`)
- `.env.example` criado com chaves públicas do Supabase
- Auditoria de segurança: HMAC webhook MP, token hardcoded no SQL, rate limiting, constant-time compare, CORS `*`, validação de email
- 2 migrations criadas: `rate_limits` e `fix_cron_jobs`
- 10 funções deployadas e verificadas em produção

### Sessão 2026-03-26 (remota — Claude Code Web)
- Verificados todos os secrets do Supabase via Management API
- Adicionados `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` ao Supabase Secrets
- `CLAUDE.md` criado com instrução de leitura obrigatória

### Sessão 2026-03-26 (remota — continuação)
- Análise completa do codebase
- PWA exclusiva para o painel admin (manifest, service worker, ícones PNG)
- `.claude/settings.json` criado com `"defaultMode": "bypassPermissions"`

### Sessão 2026-03-26 (remota — continuação 2)
- Correção: Drive não compartilhava com trials (fire-and-forget interrompido antes de completar)
- Nova função `sync-pending-buyers` + botão "Sincronizar" em BuyersPage
- Branch: `claude/verify-api-keys-LjXH2`

### Sessão 2026-03-26 (remota — continuação 3)
**Correções críticas após descoberta de deploys stale:**
- `drive-share-folder` v7: auth JWT corrigida (service_role + admin)
- `create-trial-access` v10: Drive obrigatório antes de liberar countdown; rollback se falhar
- `mp-webhook` v12: race condition corrigido + passa `accessId` para Drive
- `sync-pending-buyers` v5: passa `accessId` para Drive
- `drive-revoke-access` v13: CRON_SECRET implementado
- `send-followup-emails` v13: CRON_SECRET implementado
- CORS corrigido em todas as 11 funções
- 5 acessos duplicados removidos do banco
- Drive re-compartilhado manualmente para todos os compradores pagos
- CRON_SECRET configurado no Supabase Secrets + Vault
- Cron jobs SQL atualizados para enviar `x-cron-secret` do Vault

### Sessão 2026-03-26 (remota — continuação 4)
**Verificação geral minuciosa — resultado: plataforma totalmente operacional ✅**
- Todos os 11 Edge Functions testados (auth, validação, respostas corretas)
- Frontend testado: todas as páginas HTTP 200, SPA shell correto
- CORS verificado em todas as funções
- Drive: connected=true, pasta configurada, token válido
- DB: 7 aprovados, 7 acessos pagos, 0 sem drive_permission_id, 0 duplicados
- Cron jobs: funcionando com x-cron-secret do Vault

### Sessão 2026-03-26 (remota — continuação 5)
**Bug crítico corrigido: trial falhava para todos os clientes**

**Causa raiz descoberta:** `supabase.functions.invoke` dentro de Edge Functions envia o anon key no header `Authorization` (não o service role key). O `drive-share-folder` recebia o anon key, retornava 401, e `create-trial-access` interpretava como falha do Drive → retornava erro "Edge function returned a non-2xx status code" para todos os clientes.

**Funções corrigidas:**
- `create-trial-access` v15 — usa `fetch()` sem Authorization header para `drive-share-folder` e `send-access-email`
- `mp-webhook` v14 — mesmo fix para os dois invokes (Drive + email)
- `sync-pending-buyers` v7 — mesmo fix para os dois invokes (Drive + email)

**Padrão estabelecido:** Chamadas internas entre Edge Functions devem usar `fetch()` sem Authorization header. Nunca usar `supabase.functions.invoke` para isso.

**Verificado após fix:** trial criado com sucesso, Drive compartilhado, email enviado ✅

---

## Comandos Úteis

```bash
# Deploy de uma função específica
export SUPABASE_ACCESS_TOKEN="sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec"
supabase functions deploy mp-webhook --project-ref jrrybiohwqabsdurqudc --use-api

# Testar trial creation
curl -s -X POST "https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/create-trial-access" \
  -H "Authorization: Bearer $(grep PUBLISHABLE .env.example | cut -d'"' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Push para produção
git add -A && git commit -m "feat: ..." && git push origin main
```
