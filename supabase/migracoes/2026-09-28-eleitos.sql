-- Quantidade de eleitos e data de admissão dos candidatos.
-- Para bancos criados antes desta mudança: rode no SQL Editor do Supabase
-- ANTES de publicar a nova versão do site.

alter table config
  add column if not exists titulares int not null default 1 check (titulares >= 1),
  add column if not exists suplentes int not null default 0 check (suplentes >= 0);

alter table candidatos
  add column if not exists data_admissao date;

-- Sem voto em branco: a urna só aceita candidato ativo.
-- Grava o voto: marca o eleitor como "votou" e soma um voto para o candidato
-- na base do aparelho, na mesma transação. Não aceita voto em branco.
create or replace function registrar_voto(p_token uuid, p_matricula text, p_candidato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  d dispositivos;
begin
  d := checar_urna(p_token);

  if p_candidato is null
     or not exists (select 1 from candidatos where id = p_candidato and ativo) then
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
