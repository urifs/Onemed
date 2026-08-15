-- ─────────────────────────────────────────────────────────────────────────────
-- Painel de segurança do admin (/admin/seguranca).
--
-- Uma única RPC agrega TODOS os sinais de ataque num JSONB: medidores, nível de
-- ameaça, alertas priorizados, IPs com muitas contas, localizações pro mapa/radar,
-- cadastros e compras recentes, rate-limits estourados, papéis do painel (vigília
-- de privilégio) e a série horária das últimas 24h.
--
-- SECURITY DEFINER + gate has_role('admin') — dado sensível, só admin (o
-- visualizador NÃO vê este painel; o item de nav é adminOnly).
--
-- Domínios reservados de teste (o padrão exato do pentest de 15/08): example.com,
-- .invalid, .test, .local e o scratch emalupe.com — qualquer aparição é assinatura
-- de ataque e vira alerta ALTO na hora.
-- ─────────────────────────────────────────────────────────────────────────────

-- Assinatura mudou de integer → numeric (pra aceitar 0.5h = 30 min no seletor).
DROP FUNCTION IF EXISTS public.admin_security_overview(integer);

CREATE OR REPLACE FUNCTION public.admin_security_overview(_hours numeric DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _res jsonb;
  _dominios_teste text := '(@example\.com|@emalupe\.com|\.invalid|\.test$|@onemed-qa\.local|@test\.)';
  _win timestamptz := now() - (_hours * interval '1 hour');
  _score int := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  WITH
  -- ── contas por IP nas últimas _hours (compartilhamento / ataque distribuído)
  ip_contas AS (
    SELECT ml.ip,
           count(DISTINCT lower(ml.email)) AS contas,
           max(ml.updated_at) AS ultimo,
           max(ml.city) AS city, max(ml.country) AS country, max(ml.country_code) AS cc
    FROM member_locations ml
    WHERE ml.ip IS NOT NULL AND ml.ip <> '' AND ml.ip <> 'unknown'
      AND ml.updated_at > _win
    GROUP BY ml.ip
  ),
  -- ── sessões ativas agora
  sess AS (
    SELECT s.user_id AS uid, max(s.updated_at) AS ultimo FROM auth.sessions s GROUP BY s.user_id
  ),
  -- ── rate-limits quentes (tentativas na janela atual)
  rl AS (
    SELECT identifier, action, attempts, window_start
    FROM rate_limits
    WHERE window_start > now() - interval '1 hour'
  )

  SELECT jsonb_build_object(
    'gerado_em', now(),
    'janela_horas', _hours,

    -- ── MEDIDORES ────────────────────────────────────────────────────────────
    'metricas', jsonb_build_object(
      'trials_1h',   (SELECT count(*) FROM accesses WHERE access_type='trial' AND created_at > now()-interval '1 hour'),
      'trials_24h',  (SELECT count(*) FROM accesses WHERE access_type='trial' AND created_at > now()-interval '24 hours'),
      'buyers_pending_1h',  (SELECT count(*) FROM buyers WHERE status='pending'  AND created_at > now()-interval '1 hour'),
      'buyers_pending_24h', (SELECT count(*) FROM buyers WHERE status='pending'  AND created_at > now()-interval '24 hours'),
      'buyers_approved_24h',(SELECT count(*) FROM buyers WHERE status='approved' AND created_at > now()-interval '24 hours'),
      'receita_24h', (SELECT COALESCE(sum(COALESCE(plan_amount, amount)),0) FROM buyers WHERE status='approved' AND access_granted=true AND created_at > now()-interval '24 hours'),
      'signups_1h',  (SELECT count(*) FROM auth.users WHERE created_at > now()-interval '1 hour'),
      'signups_24h', (SELECT count(*) FROM auth.users WHERE created_at > now()-interval '24 hours'),
      'sessoes_ativas', (SELECT count(*) FROM sess WHERE ultimo > now()-interval '15 minutes'),
      'sessoes_total',  (SELECT count(*) FROM auth.sessions),
      'credenciais_1h', (SELECT count(*) FROM member_credentials WHERE created_at > now()-interval '1 hour'),
      'logins_falhos_1h', (SELECT COALESCE(sum(attempts),0) FROM rl WHERE action ILIKE '%login%'),
      'cupons_ativos', (SELECT count(*) FROM coupons WHERE active=true),
      'afiliados_24h', (SELECT count(*) FROM affiliates WHERE created_at > now()-interval '24 hours'),
      'ips_multi_conta', (SELECT count(*) FROM ip_contas WHERE contas >= 3),
      'admins_total', (SELECT count(*) FROM user_roles WHERE role='admin'),
      'viewers_total', (SELECT count(*) FROM user_roles WHERE role='viewer')
    ),

    -- ── ALERTAS (priorizados) ─────────────────────────────────────────────────
    'alertas', COALESCE((
      SELECT jsonb_agg(a ORDER BY (CASE a->>'severidade' WHEN 'alta' THEN 3 WHEN 'media' THEN 2 ELSE 1 END) DESC, a->>'valor' DESC)
      FROM (
        -- assinatura de pentest: domínios reservados de teste
        SELECT jsonb_build_object('severidade','alta','tipo','dominio_teste',
          'titulo','Cadastros de domínio de teste reservado',
          'detalhe','E-mails @example.com / .invalid / emalupe.com — assinatura de pentest/ataque automatizado.',
          'valor',(SELECT count(*) FROM auth.users WHERE email ~* _dominios_teste)) AS a
        WHERE (SELECT count(*) FROM auth.users WHERE email ~* _dominios_teste) > 0
        UNION ALL
        -- venda aprovada sem acesso concedido (tentativa de venda fake)
        SELECT jsonb_build_object('severidade','alta','tipo','venda_fake',
          'titulo','Compra "aprovada" sem acesso concedido',
          'detalhe','buyers com status=approved mas access_granted=false — o webhook não confirmou pagamento real.',
          'valor',(SELECT count(*) FROM buyers WHERE status='approved' AND access_granted=false))
        WHERE (SELECT count(*) FROM buyers WHERE status='approved' AND access_granted=false) > 0
        UNION ALL
        -- trial que não expira (expires_at muito no futuro)
        SELECT jsonb_build_object('severidade','alta','tipo','trial_eterno',
          'titulo','Trial ativo sem expiração normal',
          'detalhe','accesses trial ativo com expires_at além de 2h — trial normal dura minutos.',
          'valor',(SELECT count(*) FROM accesses WHERE access_type='trial' AND status='active' AND expires_at > now()+interval '2 hours'))
        WHERE (SELECT count(*) FROM accesses WHERE access_type='trial' AND status='active' AND expires_at > now()+interval '2 hours') > 0
        UNION ALL
        -- IP com muitas contas
        SELECT jsonb_build_object('severidade','media','tipo','ip_multi_conta',
          'titulo','IP com muitas contas',
          'detalhe', ip||' — '||contas||' contas distintas nas últimas '||_hours||'h ('||COALESCE(city,'?')||'/'||COALESCE(cc,'?')||').',
          'valor',contas)
        FROM ip_contas WHERE contas >= 3
        UNION ALL
        -- burst de cadastros
        SELECT jsonb_build_object('severidade','media','tipo','burst_signups',
          'titulo','Pico de cadastros na última hora',
          'detalhe','Muitas contas novas em pouco tempo pode ser criação automatizada.',
          'valor',(SELECT count(*) FROM auth.users WHERE created_at > now()-interval '1 hour'))
        WHERE (SELECT count(*) FROM auth.users WHERE created_at > now()-interval '1 hour') > 25
        UNION ALL
        -- burst de trials
        SELECT jsonb_build_object('severidade','media','tipo','burst_trials',
          'titulo','Pico de trials na última hora',
          'detalhe','Criação de trials acima do normal.',
          'valor',(SELECT count(*) FROM accesses WHERE access_type='trial' AND created_at > now()-interval '1 hour'))
        WHERE (SELECT count(*) FROM accesses WHERE access_type='trial' AND created_at > now()-interval '1 hour') > 25
        UNION ALL
        -- rate-limit estourado (brute force / flood)
        SELECT jsonb_build_object('severidade','media','tipo','rate_limit',
          'titulo','Rate-limit estourado',
          'detalhe', identifier||' — '||attempts||' tentativas em "'||action||'" na última hora.',
          'valor',attempts)
        FROM rl WHERE attempts >= 5
        UNION ALL
        -- vigília de privilégio: papel admin/viewer criado nas últimas 24h
        SELECT jsonb_build_object('severidade','alta','tipo','novo_papel',
          'titulo','Novo papel de painel concedido',
          'detalhe', u.email||' recebeu papel '||ur.role||'. Confirme que foi você.',
          'valor',1)
        FROM user_roles ur JOIN auth.users u ON u.id=ur.user_id
        WHERE u.created_at > now()-interval '24 hours'
      ) alertas_src
    ), '[]'::jsonb),

    -- ── IPs SUSPEITOS (tabela) ────────────────────────────────────────────────
    'ips_suspeitos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ip', ip, 'contas', contas, 'ultimo', ultimo,
        'city', city, 'country', country, 'cc', cc) ORDER BY contas DESC, ultimo DESC)
      FROM (SELECT * FROM ip_contas WHERE contas >= 2 ORDER BY contas DESC, ultimo DESC LIMIT 40) t
    ), '[]'::jsonb),

    -- ── LOCALIZAÇÕES (mapa + radar) ──────────────────────────────────────────
    'localizacoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', t.email, 'ip', t.ip,
        'lat', t.latitude, 'lng', t.longitude,
        'city', t.city, 'region', t.region, 'country', t.country, 'cc', t.country_code,
        'quando', t.updated_at,
        'online', t.online,
        'contas_no_ip', t.contas_no_ip) ORDER BY t.updated_at DESC)
      FROM (
        SELECT ml.email, ml.ip, ml.latitude, ml.longitude, ml.city, ml.region,
               ml.country, ml.country_code, ml.updated_at,
               COALESCE(s.ultimo > now()-interval '15 minutes', false) AS online,
               COALESCE(ic.contas, 1) AS contas_no_ip
        FROM member_locations ml
        LEFT JOIN sess s ON s.uid = ml.user_id
        LEFT JOIN ip_contas ic ON ic.ip = ml.ip
        -- Mapa segue o período selecionado (_win) — 30 min a 7 dias.
        WHERE ml.updated_at > _win AND ml.latitude IS NOT NULL
        ORDER BY ml.updated_at DESC
        LIMIT 400
      ) t
    ), '[]'::jsonb),

    -- ── CADASTROS RECENTES ────────────────────────────────────────────────────
    'signups_recentes', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'quando' DESC) FROM (
        SELECT jsonb_build_object(
          'email', u.email,
          'quando', u.created_at,
          'confirmado', (u.email_confirmed_at IS NOT NULL),
          'ultimo_login', u.last_sign_in_at,
          'suspeito', (u.email ~* _dominios_teste)) AS x
        FROM auth.users u
        WHERE u.created_at > _win
        ORDER BY u.created_at DESC LIMIT 40
      ) t
    ), '[]'::jsonb),

    -- ── COMPRAS RECENTES ──────────────────────────────────────────────────────
    'compras_recentes', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'quando' DESC) FROM (
        SELECT jsonb_build_object(
          'email', b.email, 'plan', b.plan, 'amount', b.amount,
          'status', b.status, 'granted', b.access_granted,
          'tem_pagamento', (b.payment_id IS NOT NULL),
          'quando', b.created_at, 'ip', b.client_ip,
          'suspeito', (b.email ~* _dominios_teste
                       OR (b.status='approved' AND b.access_granted=false)
                       OR b.amount < 0 OR b.amount > 3000)) AS x
        FROM buyers b
        WHERE b.created_at > _win
        ORDER BY b.created_at DESC LIMIT 40
      ) t
    ), '[]'::jsonb),

    -- ── RATE-LIMITS QUENTES ───────────────────────────────────────────────────
    'rate_limits', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'identifier', identifier, 'action', action, 'attempts', attempts, 'desde', window_start)
        ORDER BY attempts DESC)
      FROM (SELECT * FROM rl WHERE attempts >= 3 ORDER BY attempts DESC LIMIT 40) t
    ), '[]'::jsonb),

    -- ── PAPÉIS DO PAINEL (vigília de privilégio) ─────────────────────────────
    'papeis', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', u.email, 'role', ur.role, 'criado', u.created_at, 'ultimo_login', u.last_sign_in_at)
        ORDER BY ur.role)
      FROM user_roles ur JOIN auth.users u ON u.id=ur.user_id
    ), '[]'::jsonb),

    -- ── TIPOS DE ATAQUE (superfície atacada, do rate_limits) ──────────────────
    'ataques_por_tipo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'acao', action, 'tentativas', total_tent, 'ocorrencias', ocor,
        'ips', ips, 'ultimo', ultimo) ORDER BY total_tent DESC)
      FROM (
        SELECT action,
          sum(attempts)::int AS total_tent,
          count(*)::int AS ocor,
          count(DISTINCT split_part(identifier, ':', 1)) FILTER (WHERE identifier ~ '^\d+\.\d+\.\d+\.\d+') AS ips,
          max(window_start) AS ultimo
        FROM rate_limits
        WHERE window_start > _win
        GROUP BY action
      ) t
    ), '[]'::jsonb),

    -- ── ORIGENS (IPs que bateram em rate-limit) ──────────────────────────────
    'origens', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ip', ip, 'tentativas', tent, 'acoes', acoes, 'ocorrencias', ocor, 'ultimo', ultimo)
        ORDER BY tent DESC)
      FROM (
        SELECT split_part(identifier, ':', 1) AS ip,
          sum(attempts)::int AS tent,
          count(*)::int AS ocor,
          array_agg(DISTINCT action) AS acoes,
          max(window_start) AS ultimo
        FROM rate_limits
        WHERE window_start > _win AND identifier ~ '^\d+\.\d+\.\d+\.\d+'
        GROUP BY split_part(identifier, ':', 1)
        ORDER BY sum(attempts) DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb),

    -- ── SÉRIE HORÁRIA (últimas 24h) ───────────────────────────────────────────
    'serie', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'hora', h,
        'signups', (SELECT count(*) FROM auth.users u WHERE u.created_at >= h AND u.created_at < h+interval '1 hour'),
        'trials',  (SELECT count(*) FROM accesses a WHERE a.access_type='trial' AND a.created_at >= h AND a.created_at < h+interval '1 hour'),
        'buyers',  (SELECT count(*) FROM buyers b WHERE b.created_at >= h AND b.created_at < h+interval '1 hour'))
        ORDER BY h)
      FROM generate_series(date_trunc('hour', now())-interval '23 hours', date_trunc('hour', now()), interval '1 hour') h
    ), '[]'::jsonb)
  ) INTO _res;

  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_security_overview(numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_security_overview(numeric) TO authenticated;
