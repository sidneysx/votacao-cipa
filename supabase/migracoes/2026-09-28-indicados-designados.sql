-- Indicados pelo empregador e designados por base (usados na apuração de votos).
-- Para bancos criados antes desta mudança: rode no SQL Editor do Supabase
-- ANTES de publicar a nova versão do site. Só cria tabelas novas.

-- Representantes indicados pelo empregador.
create table if not exists indicados (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  status    text check (status in ('Titular', 'Suplente')),
  gerencia  text,
  curso     boolean,  -- fez o curso da CIPA? nulo = não informado
  criado_em timestamptz not null default now()
);

-- Designado da CIPA em cada base (um por base).
create table if not exists designados (
  base_id uuid primary key references bases(id) on delete cascade,
  nome    text not null
);

alter table indicados  enable row level security;
alter table designados enable row level security;

create policy indicados_admin  on indicados  for all using (is_admin()) with check (is_admin());
create policy designados_admin on designados for all using (is_admin()) with check (is_admin());
