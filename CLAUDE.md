# OneMed — Contexto de Projeto para Claude Code

> Este arquivo e carregado automaticamente em toda sessao do Claude Code.
> Atualize-o ao final de cada sessao com decisoes, mudancas e contexto relevante.

---

## Visao Geral

**OneMed** e uma plataforma de cursos medicos (SaaS) que vende acesso a um acervo no Google Drive via Mercado Pago.

**Fluxo principal:**
1. Usuario acessa a landing → solicita trial de 30 min
2. Drive e compartilhado automaticamente via Edge Function
3. Trial expira → acesso revogado pelo cron job
4. Usuario converte → paga via MP → acesso permanente liberado

**Site:** https://onemedcursos.com.br
**Repositorio:** https://github.com/urifs/Onemed
**Branch principal:** `main`

---

## Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Supabase Edge Functions (Deno) |
| Banco | Supabase PostgreSQL + RLS |
| Pagamentos | Mercado Pago (Checkout Pro) |
| Conteudo | Google Drive (pasta compartilhada) |
| Emails | Resend API |
| Hospedagem | Vercel (frontend) |

---

## Infraestrutura

### Supabase
- **Project ID:** `jrrybiohwqabsdurqudc`
- **URL:** `https://jrrybiohwqabsdurqudc.supabase.co`
- **Regiao:** South America (Sao Paulo)

### Vercel
- **Projeto:** `onemed`
- **Project ID:** `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt`
- **GitHub Repo ID:** `1162763179`
- **URL:** `https://onemedcursos.com.br`

---

## Credenciais (uso exclusivo do Claude)

> Usar diretamente sem solicitar ao usuario.

| Servico | Variavel | Valor |
|---------|----------|-------|
| Supabase Management API | `SUPABASE_ACCESS_TOKEN` | `sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec` |
| Vercel API | `VERCEL_TOKEN` | `vcp_6m85MdQjg3YEmboL3Bg4x0fHzqTfXiuhQQubBmzGE3tjjqhdDt0JF7SY` |
| Vercel Project ID | `VERCEL_PROJECT_ID` | `prj_6xtdW0fF2j3x3FBComSPvCBtrTVt` |
| Supabase Project Ref | `SUPABASE_PROJECT_REF` | `jrrybiohwqabsdurqudc` |

---

## Deploy

### Edge Functions (sem Docker)
```bash
export SUPABASE_ACCESS_TOKEN="sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec"
supabase functions deploy <nome> --project-ref jrrybiohwqabsdurqudc --use-api
```

**Todas de uma vez:**
```bash
for fn in create-trial-access drive-list-folders drive-oauth-callback drive-revoke-access drive-save-folder drive-share-folder mp-create-payment mp-webhook send-access-email send-followup-emails sync-pending-buyers; do
  supabase functions deploy $fn --project-ref jrrybiohwqabsdurqudc --use-api
done
```

> **IMPORTANTE:** O esbuild remove comentarios ao compilar. Se a mudanca for apenas em comentarios, o hash nao muda e o Supabase ignora o deploy. Sempre alterar codigo real (ex: string de log) e confirmar que a versao bumped.

### Frontend (Vercel)
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?forceNew=1&target=production" \
  -H "Authorization: Bearer vcp_6m85MdQjg3YEmboL3Bg4x0fHzqTfXiuhQQubBmzGE3tjjqhdDt0JF7SY" \
  -H "Content-Type: application/json" \
  -d '{"name":"onemed","target":"production","gitSource":{"type":"github","repoId":1162763179,"ref":"BRANCH_AQUI"}}'
```

> **IMPORTANTE:** Deployments de branches que nao sejam `main` so atualizam `onemedcursos.com.br` se `target=production` estiver explicito. Sem isso, o Vercel cria apenas preview URLs.

---

## Edge Functions

| Funcao | Versao | verify_jwt | Chamada por | Descricao |
|--------|--------|-----------|-------------|-----------|
| `create-trial-access` | v19 | true | Frontend | Cria trial 30min + Drive obrigatorio + email |
| `mp-create-payment` | v15 | true | Frontend | Gera preferencia no Mercado Pago |
| `mp-webhook` | v16 | false | Mercado Pago | Processa pagamento aprovado automaticamente |
| `drive-share-folder` | v9 | false | Interna | Compartilha pasta Drive com email |
| `drive-revoke-access` | v14 | false | Cron (*/5 min) | Revoga acessos trial expirados |
| `drive-list-folders` | v13 | true | Admin | Lista pastas do Drive |
| `drive-save-folder` | v8 | true | Admin | Salva pasta configurada |
| `drive-oauth-callback` | v13 | false | OAuth flow | Troca code por tokens Google |
| `send-access-email` | v14 | false | Interna | Envia emails de confirmacao (Resend) |
| `send-followup-emails` | v14 | false | Cron (13h UTC) | Follow-ups 1d/7d/30d com cupons |
| `sync-pending-buyers` | v11 | false | Admin | Sincroniza compradores pendentes com MP API |

---

## Padroes Importantes

### Chamadas internas entre Edge Functions
**NUNCA** usar `supabase.functions.invoke` para chamar outra Edge Function de dentro de uma Edge Function. O SDK envia o **anon key** no header Authorization (nao o service role), causando 401. Usar sempre `fetch()` direto **sem Authorization header**:

```typescript
const res = await fetch(`${supabaseUrl}/functions/v1/drive-share-folder`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, accessId }),
})
```

### Funcoes chamadas pelo frontend (via SDK)
Retornar **HTTP 200 para todos os casos** (sucesso, erro de auth, erro interno) com erro no body como `{ error: "..." }`. O SDK do Supabase descarta o body em respostas nao-2xx e mostra apenas "Edge Function returned a non-2xx status code".

### Funcoes chamadas externamente (webhook MP)
`verify_jwt: false` obrigatorio — o Mercado Pago nao envia Bearer token.

### Funcoes do admin panel (sync-pending-buyers)
`verify_jwt: false` + validacao JWT manual no codigo + retorno HTTP 200 sempre. Evita que o gateway intercepte antes da funcao.

---

## Banco de Dados

### Tabelas principais
| Tabela | Descricao |
|--------|-----------|
| `accesses` | Acessos trial e paid com status/expiracao/drive_permission_id |
| `buyers` | Compradores com external_reference do MP |
| `coupons` | Cupons de desconto com limite de uso |
| `visits` | Rastreamento de visitas na landing |
| `drive_config` | Config OAuth do Google Drive |
| `email_followups` | Controle de emails de follow-up enviados |
| `user_roles` | Roles de admin |
| `rate_limits` | Rate limiting das Edge Functions |

### Migrations aplicadas
| Arquivo | Descricao |
|---------|-----------|
| `20260323163043_*.sql` | Schema inicial, RLS, policies |
| `20260323163104_*.sql` | Policy fixes |
| `20260324002232_*.sql` | drive_permission_id |
| `20260324002357_*.sql` | pg_cron setup |
| `20260324034623_*.sql` | email_followups table |
| `20260326000002_fix_cron_jobs.sql` | Cron jobs com CRON_SECRET do Vault (aplicada via SQL) |

---

## Variaveis de Ambiente (Supabase Secrets)

| Variavel | Descricao |
|----------|-----------|
| `MP_ACCESS_TOKEN_PROD` | Token de producao do Mercado Pago |
| `RESEND_API_KEY` | API key do Resend |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth do Google |
| `CRON_SECRET` | Secret para autenticar cron jobs (Secrets + Vault) |
| `VERCEL_TOKEN` | Token de deploy do Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel |

---

## Planos e Precos (server-side)

```typescript
lifetime: R$ 299,90  // Acesso permanente
annual:   R$ 199,00  // 12 meses
upsell:   R$  19,90
upsell2:  R$   9,90
```

---

## Seguranca

- **CORS restrito**: todas as funcoes retornam `onemedcursos.com.br` (nao `*`)
- **CRON_SECRET**: `drive-revoke-access` e `send-followup-emails` verificam `x-cron-secret`; cron jobs SQL leem do Vault
- **Rate limiting**: `create-trial-access` (5/15min por IP) e `mp-create-payment` (10/hora por email)
- **Validacao server-side**: email, plano, preco e cupom validados no backend
- **Drive obrigatorio no trial**: countdown so aparece apos Drive compartilhado; falha → rollback
- **Race condition no webhook**: `mp-webhook` verifica existencia de acesso antes de inserir
- **drive_permission_id**: todos os acessos pagos tem permissao registrada para futura revogacao
- **RLS**: todas as tabelas com RLS ativado
- **HMAC webhook MP**: codigo presente, ativo quando `MP_WEBHOOK_SECRET` for configurado

---

## Estrutura de Arquivos

```
onemed/
├── src/
│   ├── pages/
│   │   ├── Index.tsx              # Landing + trial form + countdown + tela manutencao
│   │   ├── CheckoutPage.tsx       # Checkout com seletor de pais/WhatsApp
│   │   ├── Dashboard.tsx          # Dashboard admin (metricas + tabela acessos recentes)
│   │   ├── AccessManagement.tsx   # Gerenciamento de acessos (trial + paid)
│   │   ├── BuyersPage.tsx         # Compradores + Sincronizar + status Drive
│   │   ├── TrialUsersPage.tsx     # Listagem de trials + status Drive
│   │   └── CouponsPage.tsx        # Gestao de cupons
│   ├── context/AuthContext.tsx    # Auth admin
│   └── App.tsx                    # Rotas (admin protegidas com ProtectedRoute)
├── supabase/
│   ├── config.toml
│   ├── functions/                 # 11 Edge Functions
│   └── migrations/
├── public/
│   ├── admin-manifest.json        # PWA manifest (scope /admin)
│   ├── admin-sw.js                # Service Worker (scope /admin)
│   └── icons/admin-icon.svg
├── .env.example                   # Chaves publicas do Supabase
└── CLAUDE.md                      # Este arquivo
```

---

## Frontend — Rotas

### Publicas
- `/` — Landing com formulario de trial; countdown inline apos submit
- `/checkout` — Checkout com 4 etapas, seletor de pais/WhatsApp
- `/payment/success`, `/payment/pending`, `/payment/error` — Retorno do MP
- `/claim-access` — Resgate de acesso por compra manual
- `/termos`, `/privacidade` — Paginas legais

### Admin (`/admin/*` — protegidas por ProtectedRoute)
- `/admin` — Dashboard com metricas e tabela de acessos recentes
- `/admin/access` — Gerenciamento de todos os acessos
- `/admin/buyers` — Compradores com botao Sincronizar
- `/admin/trials` — Usuarios trial
- `/admin/coupons` — Cupons de desconto
- `/admin/drive` — Configuracao do Google Drive

---

## Funcionalidades do Admin Panel

### Tabelas com scroll
Todas as tabelas (Dashboard, Acessos, Trial, Compradores) tem `max-height` com scroll vertical e header fixo (`sticky`).

### Colunas padrao nas tabelas
- **Email** — email do usuario
- **WhatsApp** — clicavel, abre conversa no WhatsApp
- **Tipo** — Trial / Pago
- **Status** — Ativo / Expirado / Revogado / Aprovado / Pendente
- **Drive** — Compartilhado (verde) / Pendente (vermelho) baseado em `drive_permission_id`
- **Data** — horario no fuso de Sao Paulo

### Tela de manutencao (trial)
Quando o Drive falha por erro de sistema (nao erro de email do usuario), o frontend exibe tela com botao WhatsApp para suporte em vez do erro generico.

---

## Comandos Uteis

```bash
# Deploy de uma funcao
export SUPABASE_ACCESS_TOKEN="sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec"
supabase functions deploy mp-webhook --project-ref jrrybiohwqabsdurqudc --use-api

# Verificar versao deployada
curl -s "https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/functions/<nome>" \
  -H "Authorization: Bearer sbp_46a93dbb0118dfcdcef474f9287d4044284b30ec" | python3 -m json.tool

# Deploy frontend para producao
curl -s -X POST "https://api.vercel.com/v13/deployments?forceNew=1&target=production" \
  -H "Authorization: Bearer vcp_6m85MdQjg3YEmboL3Bg4x0fHzqTfXiuhQQubBmzGE3tjjqhdDt0JF7SY" \
  -H "Content-Type: application/json" \
  -d '{"name":"onemed","target":"production","gitSource":{"type":"github","repoId":1162763179,"ref":"main"}}'

# Git push
git push -u origin <branch>
```
