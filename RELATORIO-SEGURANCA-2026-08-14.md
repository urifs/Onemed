# Relatório de Cybersegurança — Plataforma OneMed

**Data:** 2026-08-14
**Escopo:** Toda a plataforma — frontend (React/Vercel), 41 Edge Functions (Supabase/Deno), 95 migrations (Postgres/RLS), worker de streaming Cloudflare, pagamentos (Mercado Pago), conteúdo (Google Drive), mensageria (Resend/SMS/WhatsApp), programa de afiliados.
**Metodologia:** Auditoria orquestrada com 23 agentes em 11 frentes de ataque, cada achado passando por verificação adversarial contra o código-fonte + crítico de cobertura. As afirmações críticas foram reconfirmadas manualmente lendo o código. ~3,9M tokens de análise.
**Repositório:** `urifs/Onemed` — confirmado **privado** (`visibility: private`).

> **Observação sobre segredos:** este relatório **não repete os valores** dos tokens de produção. Eles são referenciados por prefixo (ex.: `sbp_d4e0…74a1`) e por onde vivem, para você identificar qual rotacionar sem espalhar o segredo em mais um arquivo.

---

## 1. Resumo Executivo

A plataforma tem uma base de segurança razoável em vários pontos (RLS ligado em quase tudo, preços calculados no servidor, webhook com re-consulta ao Mercado Pago, gates de service-role em funções sensíveis, `has_role` bem construído). Mas a auditoria encontrou **duas falhas críticas que, sozinhas, derrubam o modelo de negócio inteiro**, além de uma cadeia de brute-force contra a conta admin — exatamente as três coisas que você mais teme.

| Severidade | Qtde | O que significa |
|---|---|---|
| 🔴 **CRÍTICO** | 2 | Comprometimento total do backend **ou** bypass total do paywall. Ação hoje. |
| 🟠 **ALTO** | 8 | Takeover de conta, brute-force do admin, prejuízo financeiro direto, DoS barato. |
| 🟡 **MÉDIO** | 15 | Vazamento/abuso com alguma fricção; falta de defesa em profundidade. |
| 🔵 **BAIXO** | 17 | Hardening, cadeia de suprimentos, LGPD, endurecimento de rate-limit. |
| ⚪ **INFO** | 1 | Contexto estrutural (superfície de DDoS). |

### As 3 ações para fazer HOJE (só você pode — precisam dos painéis)

1. **Rotacionar os 3 tokens de produção** que estão em texto puro no `CLAUDE.md` versionado: **Supabase Management API** (`sbp_…`), **Vercel** (`vcp_…`) e **Cloudflare** (`cfut_…`). O token do Supabase é **root do backend inteiro** — quem o tiver ignora toda RLS, todo gate de admin, e reescreve qualquer função. Rotacione **antes** de qualquer outra coisa. (CRIT-1)
2. **Configurar 2 secrets pendentes** no Supabase: `CRON_SECRET` e `MP_WEBHOOK_SECRET`. Enquanto estiverem vazios, várias funções de cron/webhook **falham abertas** (sem autenticação nenhuma). (ALTO-6, BAIXO-15)
3. **Tirar os segredos do repositório** e revisar quem tem acesso ao repo (colaboradores atuais e antigos, forks, integrações de terceiros). O repo é privado — **mantenha-o privado** e trate isso como um controle de segurança de primeira linha.

### A correção de código nº 1 (posso fazer hoje, nesta branch)

**CRIT-2 — fechar a policy pública de `INSERT` em `accesses`.** Hoje qualquer pessoa com a chave pública (que está no site) insere uma linha e ganha acesso vitalício grátis a toda a biblioteca paga. É uma linha de SQL para corrigir, mas precisa ser feita com cuidado para não quebrar o fluxo de trial — detalho na Seção 6.

### Mapa: suas ameaças declaradas → o que a auditoria encontrou

| Você teme… | Situação real | Achados |
|---|---|---|
| **Vazamento de dados** | **Crítico.** O token do Supabase no git é a chave-mestra de exportar a base inteira. Além disso, o backup admin exporta tudo sem redação e não há trilha de auditoria para detectar. | CRIT-1, MÉD-1, MÉD-2 |
| **Brute-force na conta admin** | **Materialmente viável.** O rate-limit está *desligado* justamente para e-mails de admin; sem MFA, senha mínima de 6, sem lockout, e o e-mail admin é enumerável. | ALTO-1, MÉD-3, MÉD-4 |
| **Invasão (bypass de acesso)** | **Crítico.** Auto-concessão de acesso permanente com a chave pública; tomada de conta de aluno por pré-cadastro de senha. | CRIT-2, ALTO-2 |
| **DDoS / abuso de custo** | **Exposto.** Edge Functions fora do Cloudflare, rate-limits não-atômicos e fail-open, worker de streaming sem trava (queima a franquia do Drive = "pane geral"). | ALTO-4, ALTO-5, ALTO-7, ALTO-8, MÉD-6/7/8 |

---

## 1.1. Status da implementação (branch `claude/plataforma-cyberseguranca-completa-5db73m`)

> Correções aplicadas **em código, no branch — ainda não deployadas**. Ver a Seção 6 para a ordem de deploy (há dependências: aplicar as migrations ANTES das Edge Functions).

**✅ Corrigido no branch (Fase 1 + Fase 2):**

| Achado | O que foi feito |
|---|---|
| CRIT-2 | DROP da policy pública de INSERT em `accesses`; `is_member()` com expiração de trial (migration `20260814120000`) |
| ALTO-1 / MÉD-7 | Lockout por conta-alvo no login (inclusive admin); rate-limit atômico |
| ALTO-4/5, MÉD-5/8 | IA: rate-limit atômico + fail-closed + gate de plano fail-closed + fim do bypass `importStart` |
| ALTO-6 | `CRON_SECRET` fail-closed nos 2 crons; `test_email` exige admin |
| ALTO-7, BAIXO-9/13 | IP confiável (anti-XFF) em `create-trial-access`, `affiliate-register`, `member-capture-location` |
| MÉD-1 | Redação de segredos no `admin-database-backup` (tokens Drive, chave WhatsApp, PIX) |
| MÉD-2 | Trilha de auditoria append-only + wiring (contas do painel, admin-reset, reconexão Drive) — migration `20260814130000` |
| MÉD-6 | Rate-limit por IP no `mp-create-payment` |
| MÉD-10 | Headers de segurança no `vercel.json` |
| MÉD-11 / BAIXO-1 | Fecha SELECT anônimo de `coupons` (RPC `validate_coupon`); `REVOKE` do `admin_schema_snapshot` |
| MÉD-13 | Receita/aprovados no `BuyersPage` só com `access_granted=true` |
| MÉD-4 (parcial) | Senha mínima do painel 6→12; **CAPTCHA** (Turnstile) no login admin e de membro (inerte até provisionar) |
| MÉD-3 (parcial) | Rate-limit generoso do `status` para e-mail admin (fecha enumeração de contas do painel) |
| BAIXO-5 | Guard de `Content-Length` nas 3 funções de IA (rejeita corpo gigante antes do parse) |
| BAIXO-8 | Funções de retenção LGPD (`prune_*`) + eliminação (`erase_member_personal_data`) — migration `20260814140000`, não agendadas |
| BAIXO-10 | `prune_rate_limits()` (limpeza da tabela de rate-limit) |
| BAIXO-14 | `whatsapp-webhook` valida `apikey` antes do SELECT de dedup |
| BAIXO-17 | `member_plan_tier` resolve por `auth.users.email` (fim do spoof de badge de plano) |

**⏳ Requer sua ação manual (não é código):** rotacionar os 3 tokens (CRIT-1), configurar `CRON_SECRET`/`MP_WEBHOOK_SECRET`, provisionar o Turnstile.

**🔜 Deixado para uma sessão com teste ao vivo / decisão de produto:**

| Achado | Por quê |
|---|---|
| ALTO-2 (OTP no set-password) | Muda a UX de onboarding que você desenhou (login sem código) — decisão de produto |
| ALTO-3 (expirar assinatura vencida) | Risco de cortar cliente pagante — exige revisão dos seus dados de produção |
| ALTO-8 (range/cache do worker) | Caminho mais crítico (streaming), deploy manual, histórico de apagão — exige teste ao vivo |
| MÉD-12 (auto-Pro do afiliado) | Política do programa de afiliados — decisão de produto |
| MÉD-14 (binding da URL de streaming) | Trade-off com o cache do worker — precisa desenhar junto |
| MFA obrigatório admin | Rollout com risco de lockout — precisa ser feito com cuidado |
| BAIXO-2 (ref do `config.toml`) | Muda o alvo padrão do CLI de deploy — não mexer sem conhecer seu fluxo local |
| BAIXO-7 (pin de dependências) | 39 Edge Functions; pinar versão exata sem testar cada uma é arriscado |
| BAIXO-15 (HMAC do `mp-webhook` p/ IPN) | Caminho de pagamento — endurecer pode recusar notificação legítima; principal é configurar `MP_WEBHOOK_SECRET` |
| BAIXO-16 (cupom `max_uses` atômico) | Incremento acontece na criação da preferência — corrigir de verdade mexe no fluxo de pagamento |

---

## 2. Achados CRÍTICOS

### 🔴 CRIT-1 — Tokens de produção vivos versionados no git (`CLAUDE.md`)

**Onde:** `CLAUDE.md`, linhas 41-43 (e re-exportados em 80, 99). Arquivo rastreado no git, presente em todo o histórico.

**O quê:** Três tokens de produção **ativos** em texto puro:
- **Supabase Management API** `sbp_d4e0…74a1` — **root do backend**. Com ele: rodar SQL arbitrário na base de produção (exportar `buyers`, `accesses`, `member_locations`, chaves PIX de afiliados…), sobrescrever qualquer secret das Edge Functions, **redeployar qualquer função** (ex.: injetar backdoor no `mp-webhook`), criar um admin novo via service role (ignorando a RLS `WITH CHECK` de `user_roles`), ou pausar/deletar o projeto. **Este único vazamento neutraliza todos os outros controles de segurança da plataforma.**
- **Vercel** `vcp_1flO…1x8u` — publicar build malicioso em `onemedcursos.com.br`, ler/reescrever variáveis de ambiente do site.
- **Cloudflare** `cfut_U6GR…7ed4` — reescrever o worker `onemed-stream-lesson`, que está no caminho de streaming de **toda** aula e detém os bindings `LESSON_STREAM_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`.

Agravantes (BAIXO-… e INFO): o mesmo arquivo agrega **todos** os identificadores de produção (ref do Supabase, Project ID da Vercel, Account ID do Cloudflare) e os comandos `curl` prontos de deploy/query — transformando qualquer vazamento de token em takeover copy-paste, sem reconhecimento. Há também a **anon key** (JWT `role:anon`) hardcoded em `20260324203337_cron_jobs.sql:8,21` — essa é pública por design, mas revela o ref **real** de produção (`jrrybiohwqabsdurqudc`), diferente do ref-isca `wydloquewlbmxflacauv` do `config.toml`.

**Cenário de ataque:** Qualquer pessoa com acesso de leitura ao repo (colaborador atual/antigo, fork, clone num notebook, mirror de CI, ou uma futura tornada-pública acidental) copia o `sbp_…` e chama `POST https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/database/query` com `{"query":"select email, whatsapp, client_ip from buyers"}` — dump da base de clientes. Ou sobrescreve `SUPABASE_SERVICE_ROLE_KEY` e injeta um `mp-webhook` trojanizado. Nenhuma autenticação da aplicação está envolvida — **os tokens *são* o backend**.

**Por que é crítico mesmo com o repo privado:** "privado" é uma configuração a um clique de "público", e o segredo persiste no histórico do git em todo clone já feito (incluindo ambientes de sessão do Claude Code, CIs, e qualquer máquina que já clonou). Repo privado reduz a probabilidade, não o impacto.

**Correção:**
1. **Rotacionar os 3 tokens agora** nos respectivos painéis (Supabase → Account/Access Tokens; Vercel → Account Tokens; Cloudflare → API Tokens).
2. **Remover a seção de credenciais do `CLAUDE.md`.** Guardar tokens só em gerenciadores de secret (Supabase Secrets, Vercel Env, Cloudflare Secrets) e/ou num cofre local **fora do git**. O `CLAUDE.md` pode referenciar *o nome* do secret, nunca o valor.
3. Como o segredo já está no histórico: assumir os tokens antigos como queimados (por isso rotacionar) — reescrever o histórico do git (`git filter-repo`) é opcional e secundário à rotação.
4. Revisar colaboradores/deploy keys/integrações do repo; manter privado; ligar *secret scanning* do GitHub.

---

### 🔴 CRIT-2 — Auto-concessão de acesso vitalício grátis (policy pública de `INSERT` em `accesses`)

**Onde:** `supabase/migrations/20260323163104_…sql:5-7` (policy), reforçado por `is_member()` em `20260805040000_viewer_role.sql:26-39` e `member-lesson-token/index.ts:98-104`.

**O quê (confirmado por mim no código):**
```sql
CREATE POLICY "Public can insert trial access" ON public.accesses
  FOR INSERT WITH CHECK (access_type = 'trial' AND status = 'active');
```
A policy **não tem cláusula `TO`**, então vale para os papéis `anon` **e** `authenticated` — e a chave anônima está embutida no bundle do frontend. Ela **não** amarra o `email` ao chamador, **não** exige `expires_at`, e **não** exige que a linha venha da função `create-trial-access`. Nenhuma migration posterior a remove ou aperta (as de 2026-08-05 só adicionam a policy do *viewer*, com `TO authenticated`).

O efeito é total porque **toda** decisão de acesso deriva de uma linha `active` em `accesses`:
- `is_member()` checa **apenas** `status='active'` — **ignora `access_type` e `expires_at`** — e é o gate das policies de SELECT em `courses`/`course_modules`/`lessons`/`course_comments`.
- `member-lesson-token` assina um token HMAC de streaming de 2h para qualquer linha ativa com `expires_at IS NULL OR > now()` — com `expires_at = null`, **passa**.
- O cron `drive-revoke-access` só mexe em trials com `expires_at <= now()`; uma linha com `expires_at = null` **nunca é revogada** → acesso **permanente**.

**Cenário de ataque:** Um não-pagante, usando só a chave pública do site (ou um trial descartável), faz um `INSERT` de uma linha `{access_type:'trial', status:'active', email:<qualquer>, expires_at:null}` e obtém acesso permanente e gratuito a **toda** a biblioteca de cursos e ao streaming. Scriptável para cunhar contas infinitas. **Isso derrota o modelo de pagamento inteiro** — o produto que os concorrentes querem copiar fica disponível de graça.

**Correção (código — posso fazer nesta branch, com cuidado):** O fluxo legítimo de trial roda por `create-trial-access`, que usa a **service_role** (ignora RLS), então **remover ou restringir a policy pública NÃO quebra o trial**. A policy é um resquício do trial antigo (pré-2026-07-19) que inseria direto do frontend. Passos:
1. Verificar (grep) que nenhum caminho de frontend faz `.from('accesses').insert()` — a criação de trial já é 100% via Edge Function.
2. `DROP POLICY "Public can insert trial access"` (fecha o `anon`); manter apenas a criação via service-role e as policies de admin/viewer.
3. Em `is_member()`, adicionar o predicado de expiração: `AND (a.expires_at IS NULL OR a.expires_at > now())` para acessos vitalícios/pagos legítimos, mas **exigir `expires_at` não-nulo para trials** (defesa em profundidade) — alinhando com `my_member_status`/`member-lesson-token`, que já checam expiração (ver MÉD-9).

---

## 3. Achados ALTOS

### 🟠 ALTO-1 — Brute-force da conta admin sem trava (rate-limit desligado para admins)
**Onde:** `supabase/functions/member-auth-request/index.ts:187-200, 262-271`.
Todo o rate-limiting da aplicação está dentro de `if (!isAdminEmail) { … }`. Para e-mails de admin/painel, **nenhuma** trava por IP ou por conta é aplicada em nenhuma ação (`status`, `set-password`, `login`). Como as contas de painel foram semeadas em `member_credentials` (`origem='painel'`), a ação `login` cai direto no grant `password` do GoTrue. Resultado: `member-auth-request` vira um **oráculo de brute-force de senha do admin sem trava de aplicação**, justamente para as contas de takeover total. Um login OK devolve `access_token`+`refresh_token` de um `user_id` que passa em `has_role('admin')` → controle total de `/admin`. A única barreira restante é o throttle interno por-IP do GoTrue, contornável com pool de IPs. Sem MFA e com senha curta (MÉD-4), a senha é adivinhável.
**Correção:** **Não** isentar e-mails de admin do rate-limit nas ações `login` e `set-password` (manter isenção, se necessária, só em `status`). Aplicar limite por IP **e** por conta-alvo, com lockout progressivo. Ativar MFA/TOTP nas contas admin/viewer (o Supabase Auth suporta). Adicionar CAPTCHA (Turnstile/hCaptcha) no login.

### 🟠 ALTO-2 — Tomada de conta de aluno por pré-cadastro de senha (`set-password` sem prova de posse)
**Onde:** `member-auth-request/index.ts:274-329`.
A ação `set-password` cadastra a senha de **qualquer** e-mail com acesso ativo sem nenhuma prova de posse do e-mail — não há OTP enviado ao inbox, só a checagem "já tem senha?". Com o login virado para e-mail+senha e o encerramento em massa de sessões (relatado em 13/08), existe uma janela enorme de contas com `hasPassword=false`. Quem enumerar o e-mail de um cliente (MÉD-3) cadastra a senha primeiro, assume a conta (streaming/scraping do acervo pago) e **tranca o cliente para fora** (não há "esqueci a senha" por e-mail — recuperação só via suporte).
**Correção:** Exigir prova de posse: enviar código OTP por e-mail (Resend já está configurado) antes de gravar a primeira senha. Alternativamente, gerar a senha via magic-link que o próprio dono do inbox clica. Manter o rate-limit por IP **e** por conta-alvo.

### 🟠 ALTO-3 — Assinantes mensais/anuais vencidos continuam com streaming vitalício
**Onde:** `member-lesson-token/index.ts:101,104` (e `member-stream-file:90,93`).
O gate de entitlement passa se **qualquer** linha `buyers` tem `access_granted=true` — **sem filtro de expiração**. O `mp-webhook` concede mensal (30d) e anual (365d) com `expires_at` finito **mas** seta `buyers.access_granted=true` e **nunca** reverte na expiração. O único cron de revogação só mexe em trials. Resultado: **todo cliente mensal/anual que deixa vencer continua streamando a biblioteca inteira para sempre**, sem exploit — por inação. O modelo de receita recorrente não é imposto para o conteúdo.
**Correção:** Adicionar filtro de expiração no gate (checar `accesses.expires_at`, não `buyers.access_granted` cru) **ou** um job que reverte `access_granted`/`status` quando o acesso pago vence. `can_access_course_email` só bloqueia o ~1% de cursos com `required_plans` — o gate de tempo precisa existir de verdade.

### 🟠 ALTO-4 — Bypass total do rate-limit de IA via `importStart>1`
**Onde:** `generate-flashcards/index.ts:217, 233-234, 245`.
No modo "importar banco existente", toda chamada com `importStart>1` é tratada como "continuação" e **pula o bloco inteiro de rate-limit** (`if (!ehContinuacao)`). O cliente decide sozinho enviando `importStart:2` — não há token de operação emitido pelo servidor. Cada chamada roda um laço de até 120 questões com múltiplas chamadas **pagas** ao Gemini.
**Cenário:** Qualquer conta autenticada (inclusive trial) faz `POST` com `{mode:'questions', importExisting:true, importStart:2, uploads:[…]}` e gera ilimitadamente, sem contar no teto. **Prejuízo direto** (a IA é paga por chamada).
**Correção:** Emitir um token de continuação assinado pelo servidor na primeira chamada e exigi-lo nas seguintes; ou contar toda chamada no rate-limit e usar um cursor server-side em vez de confiar no `importStart` do cliente.

### 🟠 ALTO-5 — Rate-limits de IA não-atômicos (corrida) → gasto de LLM pago
**Onde:** `generate-flashcards:247-279`, `generate-study-plan:63-88`, `member-assistant:173-200`.
As três funções fazem `SELECT attempts → compara → UPDATE attempts+1`, sem atomicidade nem trava. N requisições concorrentes leem o mesmo `attempts`, todas passam no gate, todas geram conteúdo pago e o `UPDATE` final grava o mesmo valor+1 (*lost update*). Um único trial vira centenas de chamadas Gemini pagas.
**Correção:** Substituir por uma RPC atômica `SECURITY DEFINER` que faz o incremento-e-checa em um `UPDATE … RETURNING` guardado (ou `INSERT … ON CONFLICT DO UPDATE` com predicado). Resolve o abuso nas três funções de uma vez.

### 🟠 ALTO-6 — `CRON_SECRET` fail-open em `send-followup-emails` e `drive-revoke-access` (+ relay de e-mail)
**Onde:** `send-followup-emails/index.ts:186-195` (+ modo `test_email:207`), `drive-revoke-access:149-158`. Ambas `verify_jwt=false`.
A verificação é `if (cronSecret) { … }` — se `CRON_SECRET` estiver **vazio** (o `CLAUDE.md` marca como "⏳ Pendente"), o bloco inteiro é pulado e a função fica **aberta**. As funções-irmãs `run-email-campaign`/`run-sms-job` já foram endurecidas para falhar **fechadas** nesse mesmo padrão; estas duas não. Uma vez alcançável, `send-followup-emails` tem um modo `test_email` que dispara templates da **marca OneMed** para um endereço **arbitrário** do corpo → **relay de e-mail com o domínio verificado** (phishing) e/ou blast real de follow-up. Em `drive-revoke-access`, `{}` dispara revogação em lote.
**Correção:** Configurar `CRON_SECRET` agora **e** trocar `if (cronSecret)` por *fail-closed* (recusar quando não configurado), como nas irmãs. Remover/gatear o modo `test_email`.

### 🟠 ALTO-7 — `create-trial-access`: rate-limit e cap por IP burláveis via `X-Forwarded-For` forjado
**Onde:** `create-trial-access/index.ts:220-221`. Função `verify_jwt=false`.
`clientIp = x-forwarded-for.split(',')[0]` — o valor mais à esquerda, **forjável pelo cliente**. Ambos os limitadores (5/15min e 2 trials/24h) chaveiam por esse IP. Com XFF rotativo, o atacante fura os dois.
**Cenário:** "Email-bombing como serviço" com o domínio verificado da OneMed, inflação de `auth.users`/`accesses`, e custo de Resend/ipwho.is — tudo anônimo. O mesmo padrão de XFF forjável afeta `affiliate-register` (BAIXO-9) e `member-capture-location` (BAIXO-13).
**Correção:** Confiar apenas no IP da borda (o header que a plataforma injeta de forma confiável), não no XFF cru; usar o IP mais à **direita** confiável ou o IP de conexão. Adicionar CAPTCHA no formulário de trial.

### 🟠 ALTO-8 — Worker Cloudflare: amplificação de cache-MISS + zero rate-limit → DoS barato e "pane geral"
**Onde:** `cloudflare/stream-lesson/worker.js:139-143, 126-129, 249-266`.
O worker alinha o **fim** de cada range à grade de 24MB, mas serve e **chaveia o cache pelo offset de início cru** enviado pelo atacante. A mensagem HMAC (`fileId.exp.mime.dl`) **não inclui o range**, então uma URL legitimamente assinada vale para **qualquer** `Range` durante suas 2h. Não há rate-limit em lugar nenhum do worker. Cada offset de início distinto é um cache-MISS garantido, e cada MISS (a) invoca a Edge Function de token no Supabase e (b) faz um download no Drive.
**Cenário:** Atacante pega um trial grátis, abre uma aula, copia a URL assinada do devtools, e faz `for N: GET <url>` com `Range: bytes=N-`. Cada `N` fora da grade normaliza para um download de ~24MB que nunca bate no cache → **queima a franquia diária de download do Drive daquele arquivo até esgotar** → o worker passa a responder 429 para **todos** os alunos naquela aula. É exatamente o mecanismo de "pane geral" documentado. Repetido em várias URLs colhidas de uma conta grátis, tira conteúdo popular do ar na plataforma inteira e infla custos do Supabase.
**Correção:** Alinhar o **início** do range à grade também (chave de cache = trecho normalizado, não offset cru). Adicionar rate-limit no worker (contador por assinatura/IP via KV ou Durable Object). Considerar incluir o range/limites na mensagem assinada.

---

## 4. Achados MÉDIOS

### 🟡 MÉD-1 — `admin-database-backup` exporta tudo sem redação
`admin-database-backup/index.ts:100-174`. A função é **corretamente** gateada por admin, mas exporta o schema `public` inteiro, linha a linha, **sem exclusão de coluna**. Um download concentra num arquivo NDJSON de texto puro: `drive_config.refresh_token` (acesso à biblioteca que **sobrevive à troca de senha do admin**), `whatsapp_config.evolution_api_key`, todas as `affiliates.pix_key`, e a PII de todos os clientes (email/telefone/IP/user-agent). Admins salvam esse arquivo em notebooks.
**Correção:** Redigir colunas de segredo/PII no export (allowlist de colunas por tabela), criptografar o arquivo, e logar cada download (ver MÉD-2).

### 🟡 MÉD-2 — Nenhuma trilha de auditoria / observabilidade de segurança
Não existe **nenhuma** tabela de auditoria no projeto (grep por `audit_log`/`admin_action`/`activity_log` → zero). Ações de altíssimo impacto (reset de senha de contas do painel, concessão manual de acesso, sobrescrita dos tokens OAuth do Drive, disparos de e-mail/SMS em massa, marcar comissões como pagas) **não deixam rastro imutável**. O `CLAUDE.md` registra que a retenção de log do runtime é de "minutos" (foi por isso que o apagão de 17 dias da CAPI passou despercebido). Consequência direta: **os cenários que você teme (invasão, brute-force, vazamento) não geram alerta, não deixam evidência forense e não permitem provar escopo depois.**
**Correção:** Criar uma tabela `security_audit_log` append-only (INSERT-only, sem UPDATE/DELETE nem para admin) preenchida por trigger/serviço em toda ação privilegiada; alertas (e-mail/WhatsApp) em eventos-gatilho (novo admin, backup baixado, muitos 401 de login).

### 🟡 MÉD-3 — Enumeração da base de clientes + identificação de contas admin (oráculo `status`)
`member-auth-request:202-220`. `{action:'status'}` responde 404 para não-cliente e 200 com `{hasPassword, passwordSource}` para cliente — um oráculo de enumeração da base de assinantes (dado comercial sensível: estudantes de medicina). `passwordSource='painel'` **revela quais e-mails são admin/viewer** — alimentando diretamente ALTO-1 e ALTO-2. Para membros, rate-limit 20/15min por IP (contornável); para admins, **sem** rate-limit.
**Correção:** Resposta uniforme (mesmo status/tempo para cliente e não-cliente); mover a descoberta de "tem senha?" para depois de uma prova mínima; nunca vazar `passwordSource='painel'`.

### 🟡 MÉD-4 — Login admin sem defesa contra brute-force (senha mín. 6, sem MFA, sem lockout, sem CAPTCHA)
`LoginPage.tsx`, `AuthContext.tsx:195`, `RegisterPage.tsx:23`, `admin-panel-accounts:63,115`. O login do painel chama `signInWithPassword` sem CAPTCHA; a política de senha do painel é **6 caracteres**; não há MFA nem lockout por conta. Combinado com o e-mail admin enumerável (MÉD-3) e a via não-throttled (ALTO-1), o brute-force do admin é materialmente viável.
**Correção:** MFA obrigatório para admin/viewer; senha mínima 12+; CAPTCHA no login; lockout por conta.

### 🟡 MÉD-5 — Gate de plano de IA fail-open (conta sem entitlement recebe teto de 100/dia)
`generate-flashcards:201-214,240-242` (e irmãs). As funções só bloqueiam explicitamente `plano==='monthly'`. Conta sem assinatura ativa (afiliado-só, trial expirado que ainda autentica) tem `plan=NULL` → `''` → não é `'monthly'` → passa → cai no `TETO_SEGURANCA=100`. Uma conta sem pagar ganha ~400 gerações/dia (mais que Anual=5 ou Vitalício=10).
**Correção:** Tratar `plan` vazio/NULL como bloqueado (fail-closed), não cair no teto de segurança.

### 🟡 MÉD-6 — `mp-create-payment`: rate-limit chaveado pelo e-mail do atacante, não-atômico e fail-open
`mp-create-payment:109-129`. `verify_jwt=false`; único limite = `checkRateLimit(email, 'create_payment', 10, 60)` com chave = e-mail do corpo (atacante-controlado); o `catch` segue **sem** limite. Loop variando `email` nunca bate o teto; cada chamada cria uma preferência na **API do Mercado Pago** e escreve `buyers` → amplificação de custo e risco de rate-limit/bloqueio da conta MP da OneMed.
**Correção:** Rate-limit por IP (borda) além de por e-mail; fail-closed no erro; considerar CAPTCHA antes de criar preferência.

### 🟡 MÉD-7 — Login de membro sem lockout por conta (brute-force distribuído)
`member-auth-request:187-200`. A única trava é por IP (5/15min, não-atômica). Não há contador **por conta** — tentativas erradas contra um e-mail-alvo só enchem o balde do IP do atacante, que distribui por muitos IPs e fica abaixo do limite. O alvo nunca é protegido.
**Correção:** Contador/lockout por conta-alvo (identifier = email), além do por-IP.

### 🟡 MÉD-8 — Rate-limiting fail-open sob pressão de banco (feedback loop)
`create-trial-access:222-232`, `mp-create-payment:126-128`, `generate-flashcards:280`, etc. Praticamente todo ponto de checagem tem `try/catch` que **libera no erro**. Sob flood, as consultas a `rate_limits` (não-atômicas, contenção na mesma linha) começam a dar timeout → cada função cai no `catch` → passa a atender **sem limite** → amplifica o próprio ataque.
**Correção:** Fail-closed nos endpoints caros/sensíveis (recusar quando o rate-limit está indisponível); rate-limit atômico reduz a contenção que causa o timeout.

### 🟡 MÉD-9 — `is_member()` ignora `expires_at` (RLS de metadados libera biblioteca a trial expirado)
`20260805040000_viewer_role.sql:26-39`. `is_member()` retorna true para qualquer `accesses.status='active'` sem checar expiração, e é o gate das policies de SELECT em `courses`/`lessons`/etc. Um trial cujos 30min passaram mas cujo `status` ainda é `active` (cron roda a cada 5min) lê a biblioteca; se o cron parar, é ilimitado. Inconsistente com `my_member_status`/`member-lesson-token`, que checam expiração. (Também amplia o raio de CRIT-2.)
**Correção:** Adicionar predicado de expiração em `is_member()` (ver CRIT-2).

### 🟡 MÉD-10 — Sem headers de segurança HTTP (`vercel.json`)
`vercel.json` só tem redirects/rewrites — **nenhum** header. O site não envia `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` nem `Permissions-Policy`. `/admin/*` e `/membros/*` são rotas same-origin que qualquer site pode colocar em iframe (clickjacking do painel autenticado). Sem CSP, não há mitigação em profundidade se algum XSS for introduzido (a sessão do Supabase vive em `localStorage`).
**Correção:** Adicionar bloco `headers` no `vercel.json` com CSP restritiva, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS e `Permissions-Policy`.

### 🟡 MÉD-11 — Todo cupom ativo é anon-legível e usável por qualquer um
`20260323163043_…sql:125` — `CREATE POLICY "Public can view active coupons" … USING (active = TRUE)` sem `TO` → `anon` lê **todos** os cupons ativos (código, %, max_uses). Não há coluna de destinatário; `mp-create-payment` valida só por código+ativo+expiração+max_uses. Logo, o "última chance 30%" mandado para um único ex-trial vira 30% para a internet inteira; e todos os cupons de afiliado são colhíveis.
**Correção:** Não expor a tabela `coupons` a `anon`/`authenticated` via SELECT; validar o cupom só server-side (a Edge Function usa service-role). Opcional: amarrar cupom sensível a e-mail/destinatário.

### 🟡 MÉD-12 — Afiliado: auto-indicação por segundo e-mail → auto-comissão + Vitalício Pro grátis
`mp-webhook:320-324`. A trava de auto-indicação compara **strings de e-mail**, não identidade. `buyer.email` é controlado pelo browser (INSERT público em `buyers`, sem verificação). Um afiliado `a@x` que compra como `b@y` passa a trava: ganha 20-30% de comissão sobre a própria compra e, na 5ª, destrava um **Vitalício Pro automático** (sem revisão de admin).
**Correção:** Amarrar a atribuição a identidade verificada (user_id/pagamento), não a e-mail digitado; exigir revisão para o grant automático de Pro.

### 🟡 MÉD-13 — INSERT público em `buyers` permite forjar pedidos "approved"
`20260323163104_…sql:10-12`. A policy restringe só `access_granted=FALSE AND email_sent=FALSE`; todas as outras colunas (email, plan, amount, status, payment_id) são atacante-controladas. **Não** dá acesso (o gate exige `access_granted=true`), mas `BuyersPage` calcula receita a partir de linhas `status='approved'` **sem exigir `payment_id`** → um atacante **polui seus relatórios financeiros** e pode inflar a tabela (DoS de storage).
**Correção:** Restringir/remover o INSERT público em `buyers` (a criação legítima pode ser via Edge Function service-role); nos relatórios, contar só linhas com `payment_id` real do MP.

### 🟡 MÉD-14 — URL de streaming assinada é um bearer token de 2h compartilhável
`member-lesson-token/index.ts:41,191-194`; `worker.js:157-174`. A URL assinada contém só `id/exp/sig/mime` — **sem** identidade de usuário/sessão/IP. O worker autoriza só por HMAC+expiração e nunca re-checa se o solicitante ainda é membro. Logo: (a) qualquer membro copia a URL do devtools e a posta num grupo de Telegram/WhatsApp — qualquer um assiste 2h por link, sem conta OneMed (numa plataforma explicitamente anti-pirataria); (b) um cliente que fez chargeback continua assistindo até `exp`.
**Correção:** Reduzir o TTL; amarrar a URL ao usuário/IP na assinatura; ou exigir uma re-validação leve de entitlement. (Trade-off com o cache do worker — desenhar junto.)

---

## 5. Achados BAIXOS e INFO (resumo)

| ID | Achado | Onde | Correção curta |
|---|---|---|---|
| BAIXO-1 | `admin_schema_snapshot()` SECURITY DEFINER **sem `REVOKE EXECUTE`** → qualquer anon enumera o schema inteiro via PostgREST | `20260724190000_…sql` | `REVOKE EXECUTE … FROM anon, authenticated` |
| BAIXO-2 | Config drift: `config.toml`/`.env.example` apontam ref **diferente** do de produção | `config.toml:1` | Corrigir para `jrrybiohwqabsdurqudc`; deploy sempre com `--project-ref` |
| BAIXO-3 | `member-assistant`: 1 mensagem = até 7 chamadas LLM pagas contando como 1 | `member-assistant:300-334` | Contar cada sub-chamada; limitar partes |
| BAIXO-4 | Prompt injection via PDF/anotações (impacto limitado — sem dados de terceiros) | `member-assistant:333-406` | Delimitar conteúdo do usuário; não confiar no "nunca revele" |
| BAIXO-5 | `req.json()` do corpo inteiro antes dos caps de tamanho (custo memória/CPU) | `generate-flashcards:217` | Limitar `Content-Length` antes do parse |
| BAIXO-6 | Revogação de sessão não é imediata (access token válido ~1h via `jwt_exp=3600`) | `client.ts`, `AuthContext` | Aceitar como limite; encurtar `jwt_exp` se crítico |
| BAIXO-7 | **Cadeia de suprimentos**: `esm.sh/@supabase/supabase-js@2` flutuante, sem lockfile, nas 39 funções (RCE com service_role no cold-start se o CDN for comprometido) | `functions/*/index.ts` | Pinar versão exata + `deno.lock`/import_map; considerar vendoring |
| BAIXO-8 | **LGPD**: retenção ilimitada de IP+geolocalização de alunos, sem consentimento nem via de exclusão | `member_locations`, `visits` | Política de retenção (expurgo por idade); fluxo de eliminação; base legal para geo |
| BAIXO-9 | `affiliate-register` (não-auth) cunha cupons 10% ilimitados + contas Auth confirmadas em massa (XFF forjável) | `affiliate-register` | IP confiável; teto global; revisão |
| BAIXO-10 | `rate_limits` cresce sem TTL/limpeza | `20260326000001_rate_limits.sql` | Job de expurgo por `window_start` |
| BAIXO-11 | `drive-revoke-access` cron sem auth quando `CRON_SECRET` vazio | `drive-revoke-access:149-158` | Fail-closed (ver ALTO-6) |
| BAIXO-12 | Wildcard CORS (`*`) em `member-stream-file` e `whatsapp-webhook` | `member-stream-file:15` | Allow-list como as irmãs |
| BAIXO-13 | `member-capture-location`: XFF forja localização no mapa admin | `member-capture-location:47` | IP confiável da borda |
| BAIXO-14 | `whatsapp-webhook`: 2 SELECTs antes de validar `apikey` (amplificação de carga) | `whatsapp-webhook:61-90` | Validar `apikey` primeiro |
| BAIXO-15 | `mp-webhook`: HMAC pulado para formato IPN e quando `MP_WEBHOOK_SECRET` vazio (sem roubo hoje pois campos são re-consultados no MP) | `mp-webhook:493-527` | Configurar secret; verificar todas as formas |
| BAIXO-16 | Cupom `max_uses` não-atômico (corrida) + incrementa na criação da preferência (sem pagamento) | `mp-create-payment:218,345-359` | Claim atômico com predicado `max_uses`; incrementar só na aprovação |
| BAIXO-17 | `profiles.email` livremente editável → spoof de badge de plano/nome na comunidade (cosmético) | `20260720000001_…sql:6-9` | Não permitir editar `email` no `profiles`; resolver tier por `user_id` |
| INFO-1 | Edge Functions em `*.supabase.co`, **fora** do Cloudflare do site (sem WAF/edge rate-limit próprio) | `config.toml` | Considerar proxy/WAF na frente; endurecer rate-limits internos |

---

## 6. Plano de Correção Priorizado

### Fase 0 — HOJE, só você (painéis, minutos)
- [ ] **Rotacionar** Supabase Management, Vercel e Cloudflare tokens (CRIT-1).
- [ ] **Configurar** `CRON_SECRET` e `MP_WEBHOOK_SECRET` nos Supabase Secrets (ALTO-6, BAIXO-15).
- [ ] **Remover** a seção de credenciais do `CLAUDE.md`; revisar colaboradores do repo; manter privado; ligar secret scanning.

### Fase 1 — Correções de código de alto impacto (posso fazer nesta branch)
- [ ] **CRIT-2**: fechar o INSERT público em `accesses` + `is_member()` com expiração (verificar antes que nenhum frontend depende do INSERT direto).
- [ ] **ALTO-1 / MÉD-7**: rate-limit + lockout por conta em `member-auth-request`, inclusive para admins.
- [ ] **ALTO-6 / BAIXO-11**: `CRON_SECRET` fail-closed em `send-followup-emails` e `drive-revoke-access`; gatear `test_email`.
- [ ] **ALTO-4 / ALTO-5 / MÉD-5 / MÉD-8**: RPC de rate-limit atômica para as 3 funções de IA + fail-closed + gate de plano fail-closed + fim do bypass `importStart`.
- [ ] **ALTO-7 / BAIXO-9 / BAIXO-13**: usar IP confiável da borda (não XFF cru) em `create-trial-access`, `affiliate-register`, `member-capture-location`.
- [ ] **MÉD-10**: bloco `headers` no `vercel.json` (CSP, frame-ancestors, HSTS, nosniff…).
- [ ] **MÉD-11 / BAIXO-1**: fechar SELECT anon de `coupons`; `REVOKE EXECUTE` de `admin_schema_snapshot()`.

### Fase 2 — Endurecimento (decisões de produto + código)
- [ ] **MÉD-4 / ALTO-1**: MFA obrigatório para admin/viewer + CAPTCHA no login + senha mínima 12.
- [ ] **ALTO-2**: prova de posse (OTP) no `set-password`.
- [ ] **ALTO-3**: expirar acessos pagos vencidos (job de revogação).
- [ ] **ALTO-8 / MÉD-14**: rate-limit + normalização de range no worker; TTL/binding da URL de streaming.
- [ ] **MÉD-1**: redigir/criptografar o backup admin.
- [ ] **MÉD-2**: tabela de auditoria append-only + alertas.
- [ ] **MÉD-6 / MÉD-12 / MÉD-13**: rate-limit de pagamento por IP; atribuição de afiliado por identidade; fechar INSERT público de `buyers`.

### Fase 3 — Estrutural / compliance
- [ ] **BAIXO-7**: pinar dependências + lockfile nas Edge Functions.
- [ ] **BAIXO-8**: política de retenção LGPD + fluxo de eliminação.
- [ ] **BAIXO-2**: corrigir o project ref no `config.toml`.
- [ ] **INFO-1**: avaliar WAF/proxy na frente das Edge Functions.

---

## 7. O que foi verificado como SEGURO (para calibrar a confiança)

A auditoria também confirmou controles **funcionando** — não é tudo vermelho:
- **Auto-concessão de admin bloqueada**: a RLS de `user_roles` (`WITH CHECK has_role(auth.uid(),'admin')`) impede o `/admin/register` de conceder admin a si mesmo; a página agora reporta a falha honestamente.
- **Viewer não vira admin**: sem policy de INSERT/UPDATE em `user_roles`; `admin-panel-accounts` exige `has_role('admin')`.
- **Preços server-side**: `mp-create-payment` recalcula preço/plano no servidor; o `mp-webhook` re-consulta status/valor/plano na API do MP e tem idempotência atômica — **não há roubo de dinheiro por forjar o corpo do webhook hoje** (apesar do HMAC pulado — BAIXO-15).
- **`has_role`, `is_member` e a maioria das RPCs** são `SECURITY DEFINER` com `search_path` fixo (sem injeção de search_path).
- **Gates de service-role** presentes em `drive-share-folder`, `send-access-email` (fechado após auditoria anterior), etc.
- **XSS**: os únicos sinks (`chart.tsx`, `PdfViewer`) não recebem dado controlado por usuário; RLS liga em quase todas as tabelas.
- **`member-assistant`** resolve posse de playlist por `user_id` e roda RPCs como o próprio aluno — sem vazamento cruzado de contexto entre usuários.

Isso mostra que a plataforma **não** está desprotegida por descuido geral — os problemas estão concentrados em pontos específicos e corrigíveis. Priorizando a Fase 0 e a Fase 1, o risco cai drasticamente ainda hoje.

---

*Relatório gerado por auditoria automatizada (23 agentes, 11 frentes, verificação adversarial) com reconfirmação manual dos achados críticos. Os achados de código citam `arquivo:linha` para correção direta.*
