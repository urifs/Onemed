# Remediação de Segurança — 2026-08-02

Correções aplicadas no branch `claude/security-audit-domain-privacy-axr5eo` a partir do
`SECURITY-AUDIT-2026-08-02.md`. **Nada aqui altera produção até você fazer o deploy.** Escrito para
não quebrar nenhum fluxo: cada gate de autorização copia o padrão de auth de funções que já funcionam
(`send-custom-email`, `drive-folder-permissions`, `drive-access-token`), e a criação de trial/checkout
continua exatamente como estava.

> Os tokens no `CLAUDE.md` (C7) **não foram mexidos** — você indicou que o repositório é fechado e não é
> um problema no seu contexto.

---

## ⚠️ PRÉ-REQUISITO OBRIGATÓRIO ANTES DE DEPLOYAR (senão quebra)

**Configurar `CRON_SECRET`** nos secrets do Supabase **e** garantir que os cron jobs enviam o header
`x-cron-secret` com esse valor. As funções `send-followup-emails`, `run-email-campaign` e `run-sms-job`
passaram a ser **fail-closed** (antes liberavam sem auth quando o secret faltava). Se você deployar essas
três **sem** o `CRON_SECRET` configurado nos crons, os envios agendados param de rodar.

```bash
# 1) gerar e salvar o secret
openssl rand -hex 32   # copie o valor
curl -X POST "https://api.supabase.com/v1/projects/<REF>/secrets" \
  -H "Authorization: Bearer <MGMT_TOKEN>" -H "Content-Type: application/json" \
  -d '[{"name":"CRON_SECRET","value":"<VALOR_GERADO>"}]'
# 2) conferir que os pg_cron jobs mandam x-cron-secret com esse valor
#    (migrations 20260326000002_fix_cron_jobs / 20260418000003_fix_cron_secret_name)
```

`MP_WEBHOOK_SECRET` **não** é pré-requisito: o `mp-webhook` foi deixado sem fail-closed de propósito
(evita quebrar notificações IPN). Configurá-lo apenas **fecha** o M1 — o webhook já rejeita assinatura
inválida quando o `data.id` está presente.

---

## Ordem de deploy sugerida (agrupar as interdependências)

1. **Aplicar a migration** `20260802120000_security_hardening.sql` primeiro (RLS/RPC).
   Depois de aplicar, o checkout de cupom passa a usar a RPC `validate_coupon` — deploye o frontend junto.
2. **Deployar juntas** (compartilham auth interna por service key):
   `send-access-email`, `create-trial-access`, `mp-webhook`, `drive-share-folder`.
3. Deployar o restante das functions (independentes): `drive-oauth-callback`, `drive-save-folder`,
   `drive-list-folders`, `whatsapp-manager`, `whatsapp-webhook`, `mp-create-payment`, `member-lesson-token`.
4. **Só depois do `CRON_SECRET`**: `send-followup-emails`, `run-email-campaign`, `run-sms-job`.
5. Deployar o **frontend** (Vercel) — inclui `vercel.json` (headers), `CheckoutPage` (RPC de cupom),
   `RegisterPage`.

### Verificações pós-deploy (rápidas)
- Trial: fazer um teste grátis em `/` → deve logar e **receber o e-mail** de boas-vindas.
- Compra: um pagamento de teste aprovado → acesso liberado + e-mail (confirma `send-access-email` + webhook).
- Cupom: aplicar um cupom no `/checkout` → desconto aplicado (confirma a RPC `validate_coupon`).
- WhatsApp: mandar a palavra-chave para o número → a auto-resposta ainda dispara (confirma o webhook).
- Admin: abrir `/admin/drive`, listar/salvar pasta, conectar Drive → tudo funciona com o JWT de admin.
- `OPTIONS` em cada function deployada deve responder 200/204 (500 = BOOT_ERROR).

---

## O que foi corrigido (por achado)

| Achado | Arquivo(s) | Correção |
|--------|-----------|----------|
| **C1/A2** login sem posse | — | **NÃO** alterado no código (muda o fluxo de login inteiro). Precisa da sua decisão — ver "Pendentes" |
| **C2** paywall via INSERT em accesses | `20260802120000_*.sql` | Removida a policy pública de INSERT; `is_member()` passa a checar `expires_at` de trials |
| **C3** drive-share-folder anônimo | `drive-share-folder/index.ts` | Removido o ramo "sem header = autorizado"; `secureCompare` na service key |
| **C4/M6** coleta em massa de aulas | `member-lesson-token/index.ts` | Rate limit por usuário (60/min, admin isento, fail-open) |
| **C5** send-access-email open relay | `send-access-email` + callers | Exige service key (`secureCompare`) + escaping de HTML |
| **C6** whatsapp-manager sem auth | `whatsapp-manager/index.ts` | Gate de admin obrigatório |
| **A1** troca de plano | `mp-create-payment/index.ts` | `buyers.plan` vira autoritativo do servidor (grava o plano validado) |
| **A3** drive-oauth-callback | `drive-oauth-callback/index.ts` | Gate de admin |
| **A4** drive-save-folder | `drive-save-folder/index.ts` | Gate de admin |
| **A8** followups fail-open | `send-followup-emails/index.ts` | Fail-closed (exige `CRON_SECRET`) |
| **A9** whatsapp-webhook | `whatsapp-webhook/index.ts` | Validação de apikey obrigatória (fail-closed) |
| **M4** drive-list-folders | `drive-list-folders/index.ts` | Gate de admin |
| **M7** crons fail-open | `run-email-campaign`, `run-sms-job` | Fail-closed |
| **M8** bypassPermissions | `.claude/settings.json` | Removido `defaultMode: bypassPermissions` |
| **M9** headers de segurança | `vercel.json` | HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` |
| **M11/B4** cupons listáveis | `20260802120000_*.sql` + `CheckoutPage.tsx` | RPC `validate_coupon` por código; SELECT público removido |
| **B2** compare `===` | `drive-share-folder/index.ts` | `secureCompare` |
| **B5** member_plan_tier anon | `20260802120000_*.sql` | `REVOKE EXECUTE` de anon/authenticated |
| **B6** admin_schema_snapshot | `20260802120000_*.sql` | `REVOKE` de PUBLIC; só `service_role` |
| **B8** RegisterPage self-grant | `RegisterPage.tsx` | Removido o insert de role admin pelo cliente |
| **B11** profiles.email editável | `20260802120000_*.sql` | Trigger que trava `email` no UPDATE (nome continua editável) |

---

## Pendentes (precisam da sua decisão ou têm risco de impacto ao cliente)

- **C1/A2 — login sem prova de posse (o mais grave).** Corrigir muda a experiência de login (hoje é "só
  digitar o e-mail"). Opções: (a) mandar link/OTP por e-mail e só logar quem clicar/digitar o código;
  (b) manter a UX mas exigir o clique no link do inbox. Não implementei porque redesenha o fluxo de
  autenticação — me diga qual caminho prefere e eu faço.
- **A5 enumeração 404/200** — resolve junto com o C1 (resposta genérica uniforme).
- **A7 planos pagos nunca expiram** — enforcer `expires_at` cortaria assinantes mensais/anuais vencidos.
  É correto, mas é mudança com impacto em cliente pagante; deixei de fora desta leva. Antes de aplicar,
  rodar: `SELECT count(*) FROM accesses WHERE status='active' AND access_type<>'trial' AND expires_at < now();`
- **A6 worker não revalida entitlement** — exige o Worker consultar o Supabase por requisição (mudança
  arquitetural no `cloudflare/stream-lesson`). Reduzir o TTL quebraria aula longa, então não mexi no TTL.
- **M1 HMAC do webhook** — configurar `MP_WEBHOOK_SECRET` (sem risco de quebra).
- **M2 cupom não-atômico** — mover o incremento para o webhook e usar UPDATE atômico; deixei fora para
  não arriscar a contabilidade de cupom sem teste.
- **M10 OfficeViewer** — renderizar Office no cliente em vez de mandar a URL assinada pra Microsoft
  (troca de biblioteca de visualização).
- **B12/B13** — validação de nome de exibição e limite de tamanho/rate de comentários (baixo risco de
  quebra; posso fazer se quiser).
