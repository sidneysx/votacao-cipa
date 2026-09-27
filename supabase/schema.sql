-- =====================================================================
-- Votação CIPA — estrutura do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
--
-- Regra principal (voto secreto):
--   eleitores  -> guarda só "o eleitor X votou" (sem o candidato)
--   votos      -> guarda só "voto para o candidato Y na base Z" (sem o eleitor)
-- As duas coisas são gravadas juntas na função registrar_voto(), mas não
-- existe nenhuma ligação entre as tabelas.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Configuração do site (uma linha só). Muda a cada ano.
create table config (
  id       int primary key default 1 check (id = 1),
  nome     text not null default 'Eleição CIPA',
  cor      text not null default '#1d4ed8',
  logo_url text,
  inicio   timestamptz,  -- abertura da votação
  fim      timestamptz   -- encerramento; o resultado só aparece depois disso
);
insert into config (id) values (1);

-- Bases / regionais.
create table bases (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table candidatos (
  id       uuid primary key default gen_random_uuid(),
  numero   int not null unique,
  nome     text not null,
  foto_url text,
  ativo    boolean not null default true
);

-- Cada tablet/computador de votação. Fica amarrado a uma base.
-- O admin cadastra, o sistema gera um código de ativação de uso único;
-- o mesário digita o código no aparelho e ele passa a ter um token secreto.
create table dispositivos (
  id         uuid primary key default gen_random_uuid(),
  tag        text not null unique,
  base_id    uuid not null references bases(id) on delete restrict,
  codigo     text unique,          -- código de ativação (apagado depois do uso)
  token      uuid unique,          -- segredo guardado no aparelho
  ativo      boolean not null default true,
  ativado_em timestamptz
);

-- Lista de eleitores (funcionários). Só marca SE votou, nunca EM QUEM.
create table eleitores (
  matricula     text primary key,
  nome          text not null,
  votou         boolean not null default false,
  votou_em      timestamptz,
  votou_base_id uuid references bases(id) on delete set null
);

-- Votos. Não tem eleitor nem horário, só candidato + base.
-- candidato_id nulo = voto em branco.
create table votos (
  id             uuid primary key default gen_random_uuid(),
  candidato_id   uuid references candidatos(id) on delete restrict,
  base_id        uuid not null references bases(id) on delete restrict,
  dispositivo_id uuid references dispositivos(id) on delete set null
);

-- Usuários que podem entrar no painel.
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

alter table config       enable row level security;
alter table bases        enable row level security;
alter table candidatos   enable row level security;
alter table dispositivos enable row level security;
alter table eleitores    enable row level security;
alter table votos        enable row level security;
alter table admins       enable row level security;

-- Qualquer um lê config e candidatos (a urna precisa mostrar).
create policy config_leitura     on config     for select using (true);
create policy config_admin       on config     for update using (is_admin()) with check (is_admin());
create policy candidatos_leitura on candidatos for select using (true);
create policy candidatos_admin   on candidatos for all    using (is_admin()) with check (is_admin());

-- Só admin mexe em bases, dispositivos e eleitores.
create policy bases_admin        on bases        for all using (is_admin()) with check (is_admin());
create policy dispositivos_admin on dispositivos for all using (is_admin()) with check (is_admin());
create policy eleitores_admin    on eleitores    for all using (is_admin()) with check (is_admin());

-- Cada usuário só consegue ver se ele mesmo é admin.
create policy admins_proprio on admins for select using (user_id = auth.uid());

-- votos: nenhuma política = ninguém lê nem grava direto.
-- Só as funções abaixo (security definer) acessam.

-- ---------------------------------------------------------------------
-- Funções da urna
-- ---------------------------------------------------------------------

-- Troca o código de ativação por um token. O código não serve mais depois disso,
-- então não dá para ativar o mesmo código em outro aparelho.
create function ativar_dispositivo(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := gen_random_uuid();
begin
  update dispositivos
     set token = v_token, codigo = null, ativado_em = now()
   where codigo = upper(regexp_replace(p_codigo, '[^a-zA-Z0-9]', '', 'g'))
     and ativo;
  if not found then
    raise exception 'Código inválido ou já utilizado';
  end if;
  return v_token;
end $$;

-- Diz para o aparelho qual é a tag e a base dele.
create function sessao_dispositivo(p_token uuid)
returns table (tag text, base text)
language sql stable security definer set search_path = public as $$
  select d.tag, b.nome
    from dispositivos d
    join bases b on b.id = d.base_id
   where d.token = p_token and d.ativo;
$$;

-- Uso interno: valida o aparelho e o horário da votação.
create function checar_urna(p_token uuid) returns dispositivos
language plpgsql stable security definer set search_path = public as $$
declare
  d dispositivos;
  c config;
begin
  select * into d from dispositivos where token = p_token and ativo;
  if d.id is null then
    raise exception 'Dispositivo não autorizado';
  end if;
  select * into c from config where id = 1;
  if c.inicio is null or c.fim is null or now() < c.inicio then
    raise exception 'A votação ainda não começou';
  end if;
  if now() >= c.fim then
    raise exception 'A votação foi encerrada';
  end if;
  return d;
end $$;
revoke execute on function checar_urna(uuid) from public, anon, authenticated;

-- Confere a matrícula antes de mostrar os candidatos. Devolve o nome do eleitor.
create function verificar_eleitor(p_token uuid, p_matricula text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_nome  text;
  v_votou boolean;
begin
  perform checar_urna(p_token);
  select nome, votou into v_nome, v_votou from eleitores where matricula = trim(p_matricula);
  if v_nome is null then
    raise exception 'Matrícula não encontrada';
  end if;
  if v_votou then
    raise exception 'Este eleitor já votou';
  end if;
  return v_nome;
end $$;

-- Grava o voto: marca o eleitor como "votou" e soma um voto para o candidato
-- na base do aparelho, na mesma transação. p_candidato nulo = branco.
create function registrar_voto(p_token uuid, p_matricula text, p_candidato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  d dispositivos;
begin
  d := checar_urna(p_token);

  if p_candidato is not null
     and not exists (select 1 from candidatos where id = p_candidato and ativo) then
    raise exception 'Candidato inválido';
  end if;

  update eleitores
     set votou = true, votou_em = now(), votou_base_id = d.base_id
   where matricula = trim(p_matricula) and not votou;
  if not found then
    raise exception 'Matrícula não encontrada ou eleitor já votou';
  end if;

  insert into votos (candidato_id, base_id, dispositivo_id)
  values (p_candidato, d.base_id, d.id);
end $$;

-- ---------------------------------------------------------------------
-- Resultado (só depois do horário de encerramento, para todo mundo)
-- ---------------------------------------------------------------------

create function resultado()
returns table (base text, candidato_id uuid, votos bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from config where id = 1 and fim is not null and now() >= fim) then
    raise exception 'O resultado só fica disponível após o encerramento da votação';
  end if;
  return query
    select b.nome, v.candidato_id, count(*)
      from votos v
      join bases b on b.id = v.base_id
     group by b.nome, v.candidato_id;
end $$;

-- ---------------------------------------------------------------------
-- Nova eleição: apaga os votos e desmarca quem votou.
-- Mantém bases, dispositivos, candidatos e eleitores.
-- ---------------------------------------------------------------------

create function nova_eleicao() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Acesso negado';
  end if;
  delete from votos where true;
  update eleitores set votou = false, votou_em = null, votou_base_id = null where votou;
end $$;

-- ---------------------------------------------------------------------
-- Imagens (logo e fotos dos candidatos)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

create policy imagens_leitura on storage.objects for select
  using (bucket_id = 'imagens');
create policy imagens_envio on storage.objects for insert
  with check (bucket_id = 'imagens' and public.is_admin());
create policy imagens_troca on storage.objects for update
  using (bucket_id = 'imagens' and public.is_admin());
create policy imagens_exclusao on storage.objects for delete
  using (bucket_id = 'imagens' and public.is_admin());
