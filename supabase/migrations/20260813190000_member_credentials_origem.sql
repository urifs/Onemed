-- ─────────────────────────────────────────────────────────────────────────────
-- De ONDE veio a senha de cada conta.
--
-- A migration do login com senha marcou como "já tem senha" quem tinha
-- escolhido uma de verdade em outro lugar: afiliados (com o próprio e-mail) e
-- contas do painel. É a MESMA conta do Auth, então a senha realmente vale para
-- entrar na área de membros — e marcá-los evitou que, ao "cadastrar" uma senha
-- nova, eles trocassem sem querer a que já usam no painel/afiliados.
--
-- O que faltou foi CONTAR isso na tela: 41 afiliados que também são alunos
-- caíram no campo "Sua senha" achando que nunca tinham cadastrado nada,
-- digitaram qualquer coisa e leram "senha incorreta". Com a origem gravada, a
-- tela de login diz qual senha é aquela em vez de deixar a pessoa adivinhar.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.member_credentials
  add column if not exists origem text not null default 'membro';

-- Backfill: quem está aqui desde o arrasto inicial e é afiliado/painel não
-- cadastrou pela área de membros. Ordem importa — conta do painel que também é
-- afiliada é tratada como painel, que é o acesso mais forte.
update public.member_credentials mc
set origem = case
  when exists (select 1 from public.user_roles r where r.user_id = mc.user_id) then 'painel'
  when exists (select 1 from public.affiliates f where f.user_id = mc.user_id) then 'afiliado'
  else 'membro'
end
where mc.created_at < timestamptz '2026-08-13 17:30:00+00';
