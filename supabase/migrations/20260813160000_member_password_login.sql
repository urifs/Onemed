-- ─────────────────────────────────────────────────────────────────────────────
-- Login da área de membros passa a ser E-MAIL + SENHA.
--
-- Até aqui o login era só o e-mail: o servidor gerava um magic link e resgatava
-- ele sozinho, devolvendo a sessão na hora. Ou seja, quem soubesse o e-mail de
-- um aluno entrava na conta dele. A senha é escolhida pelo próprio aluno na
-- primeira vez que ele for entrar — comprar e receber acesso continuam sendo só
-- pelo e-mail, sem senha nenhuma no caminho.
--
-- Por que uma tabela nossa e não `auth.users.encrypted_password`: o GoTrue
-- grava um hash bcrypt ALEATÓRIO em toda conta criada por magic link, então
-- todas as 2.222 contas já tinham `encrypted_password` preenchido. Não dá pra
-- distinguir "senha escolhida pela pessoa" de "senha aleatória que ninguém
-- conhece" olhando pra lá — a marca precisa ser explícita.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.member_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Busca do login é sempre por e-mail em minúsculas.
create unique index if not exists member_credentials_email_key
  on public.member_credentials (lower(email));

alter table public.member_credentials enable row level security;

-- Escrita é EXCLUSIVA da Edge Function (service_role ignora RLS). Nenhuma
-- policy de insert/update/delete: se o cliente pudesse escrever aqui, marcar a
-- si mesmo como "já tem senha" trancaria o dono de fora da própria conta.
drop policy if exists "Admin lê credenciais" on public.member_credentials;
create policy "Admin lê credenciais" on public.member_credentials
  for select using (
    (select public.has_role(auth.uid(), 'admin'))
    or (select public.has_role(auth.uid(), 'viewer'))
  );

-- ── quem JÁ escolheu uma senha de verdade ────────────────────────────────────
-- Duas origens, e as duas são a MESMA conta do Auth que o login de membro usa:
--   · afiliados cadastrados com o próprio e-mail (o `affiliate-register` define
--     a senha que a pessoa digitou). Afiliado que nasceu em usuário-ALIAS tem
--     outro e-mail e outro user_id, então não entra — e não deve mesmo.
--   · contas do painel (admin e visualizador), com senha definida no cadastro.
-- Sem esse arrasto, essas pessoas veriam "cadastrar senha" e, ao cadastrar,
-- trocariam sem querer a senha que já usam para entrar no painel/afiliados.
insert into public.member_credentials (user_id, email)
select u.id, lower(u.email)
from auth.users u
where u.email is not null
  and (
    exists (select 1 from public.affiliates f where f.user_id = u.id and lower(f.email) = lower(u.email))
    or exists (select 1 from public.user_roles r where r.user_id = u.id)
  )
on conflict (user_id) do nothing;
