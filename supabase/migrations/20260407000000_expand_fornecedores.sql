-- Expand fornecedores to support pessoa física/jurídica, documents, contacts and branch addresses

alter table public.fornecedores
  add column if not exists pessoa_tipo text not null default 'juridica',
  add column if not exists documento text,
  add column if not exists razao_social_ou_nome_completo text,
  add column if not exists inscricao_estadual text,
  add column if not exists inscricao_municipal text,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table public.fornecedores
  add constraint fornecedores_pessoa_tipo_check
  check (pessoa_tipo in ('fisica', 'juridica'));

create table if not exists public.fornecedores_contatos (
  id uuid default gen_random_uuid() primary key,
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  setor text not null,
  celular text not null,
  email text,
  responsavel text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.fornecedores_filiais (
  id uuid default gen_random_uuid() primary key,
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  rotulo text,
  endereco_completo text not null,
  referencia text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists fornecedores_contatos_fornecedor_id_idx
  on public.fornecedores_contatos (fornecedor_id);

create index if not exists fornecedores_filiais_fornecedor_id_idx
  on public.fornecedores_filiais (fornecedor_id);

create unique index if not exists fornecedores_nome_unique_normalized_v2
  on public.fornecedores (lower(btrim(nome)))
  where btrim(nome) <> '';

create unique index if not exists fornecedores_documento_unique_normalized
  on public.fornecedores (regexp_replace(coalesce(documento, ''), '\\D', '', 'g'))
  where regexp_replace(coalesce(documento, ''), '\\D', '', 'g') <> '';

create unique index if not exists fornecedores_contatos_unique_normalized
  on public.fornecedores_contatos (
    fornecedor_id,
    lower(btrim(setor)),
    regexp_replace(coalesce(celular, ''), '\\D', '', 'g'),
    lower(btrim(coalesce(email, ''))),
    lower(btrim(responsavel))
  )
  where btrim(setor) <> '' or btrim(celular) <> '' or btrim(coalesce(email, '')) <> '' or btrim(responsavel) <> '';

create unique index if not exists fornecedores_filiais_unique_normalized
  on public.fornecedores_filiais (
    fornecedor_id,
    lower(btrim(coalesce(rotulo, ''))),
    lower(btrim(endereco_completo)),
    lower(btrim(coalesce(referencia, '')))
  )
  where btrim(endereco_completo) <> '';

create or replace function public.update_fornecedores_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_fornecedores_updated_at on public.fornecedores;
create trigger update_fornecedores_updated_at
  before update on public.fornecedores
  for each row execute function public.update_fornecedores_updated_at();

drop trigger if exists update_fornecedores_contatos_updated_at on public.fornecedores_contatos;
create trigger update_fornecedores_contatos_updated_at
  before update on public.fornecedores_contatos
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_fornecedores_filiais_updated_at on public.fornecedores_filiais;
create trigger update_fornecedores_filiais_updated_at
  before update on public.fornecedores_filiais
  for each row execute function public.update_updated_at_column();

alter table public.fornecedores enable row level security;
alter table public.fornecedores_contatos enable row level security;
alter table public.fornecedores_filiais enable row level security;

drop policy if exists "Fornecedores visíveis para usuários autenticados" on public.fornecedores;
create policy "Fornecedores visíveis para usuários autenticados"
  on public.fornecedores for select
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem inserir fornecedores" on public.fornecedores;
create policy "Apenas usuários autenticados podem inserir fornecedores"
  on public.fornecedores for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem atualizar fornecedores" on public.fornecedores;
create policy "Apenas usuários autenticados podem atualizar fornecedores"
  on public.fornecedores for update
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem deletar fornecedores" on public.fornecedores;
create policy "Apenas usuários autenticados podem deletar fornecedores"
  on public.fornecedores for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Fornecedores contatos visíveis para usuários autenticados" on public.fornecedores_contatos;
create policy "Fornecedores contatos visíveis para usuários autenticados"
  on public.fornecedores_contatos for select
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem inserir contatos de fornecedores" on public.fornecedores_contatos;
create policy "Apenas usuários autenticados podem inserir contatos de fornecedores"
  on public.fornecedores_contatos for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem atualizar contatos de fornecedores" on public.fornecedores_contatos;
create policy "Apenas usuários autenticados podem atualizar contatos de fornecedores"
  on public.fornecedores_contatos for update
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem deletar contatos de fornecedores" on public.fornecedores_contatos;
create policy "Apenas usuários autenticados podem deletar contatos de fornecedores"
  on public.fornecedores_contatos for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Filiais de fornecedores visíveis para usuários autenticados" on public.fornecedores_filiais;
create policy "Filiais de fornecedores visíveis para usuários autenticados"
  on public.fornecedores_filiais for select
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem inserir filiais de fornecedores" on public.fornecedores_filiais;
create policy "Apenas usuários autenticados podem inserir filiais de fornecedores"
  on public.fornecedores_filiais for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem atualizar filiais de fornecedores" on public.fornecedores_filiais;
create policy "Apenas usuários autenticados podem atualizar filiais de fornecedores"
  on public.fornecedores_filiais for update
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas usuários autenticados podem deletar filiais de fornecedores" on public.fornecedores_filiais;
create policy "Apenas usuários autenticados podem deletar filiais de fornecedores"
  on public.fornecedores_filiais for delete
  using (auth.role() = 'authenticated');

create or replace function public.save_fornecedor(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_fornecedor_id uuid;
  contato jsonb;
  filial jsonb;
  response jsonb;
begin
  if coalesce(nullif(btrim(payload->>'nome'), ''), '') = '' then
    raise exception 'Informe o nome do fornecedor.';
  end if;

  if coalesce(nullif(btrim(payload->>'pessoa_tipo'), ''), '') not in ('fisica', 'juridica') then
    raise exception 'Tipo de pessoa inválido.';
  end if;

  if coalesce(nullif(btrim(payload->>'documento'), ''), '') = '' then
    raise exception 'Informe o documento do fornecedor.';
  end if;

  if coalesce(nullif(btrim(payload->>'razao_social_ou_nome_completo'), ''), '') = '' then
    raise exception 'Informe a razão social ou nome completo do fornecedor.';
  end if;

  if payload ? 'id' and coalesce(nullif(btrim(payload->>'id'), ''), '') <> '' then
    v_fornecedor_id := (payload->>'id')::uuid;

    update public.fornecedores
      set nome = btrim(payload->>'nome'),
          tipo = btrim(payload->>'tipo'),
          pessoa_tipo = payload->>'pessoa_tipo',
          documento = btrim(payload->>'documento'),
          razao_social_ou_nome_completo = btrim(payload->>'razao_social_ou_nome_completo'),
          inscricao_estadual = nullif(btrim(coalesce(payload->>'inscricao_estadual', '')), ''),
          inscricao_municipal = nullif(btrim(coalesce(payload->>'inscricao_municipal', '')), '')
    where id = v_fornecedor_id;

    delete from public.fornecedores_contatos
      where fornecedor_id = v_fornecedor_id;
    delete from public.fornecedores_filiais
      where fornecedor_id = v_fornecedor_id;
  else
    insert into public.fornecedores (
      nome,
      tipo,
      pessoa_tipo,
      documento,
      razao_social_ou_nome_completo,
      inscricao_estadual,
      inscricao_municipal
    ) values (
      btrim(payload->>'nome'),
      btrim(payload->>'tipo'),
      payload->>'pessoa_tipo',
      btrim(payload->>'documento'),
      btrim(payload->>'razao_social_ou_nome_completo'),
      nullif(btrim(coalesce(payload->>'inscricao_estadual', '')), ''),
      nullif(btrim(coalesce(payload->>'inscricao_municipal', '')), '')
    )
    returning id into v_fornecedor_id;
  end if;

  for contato in select * from jsonb_array_elements(coalesce(payload->'contatos', '[]'::jsonb)) loop
    insert into public.fornecedores_contatos (
      fornecedor_id,
      setor,
      celular,
      email,
      responsavel
    ) values (
      v_fornecedor_id,
      btrim(coalesce(contato->>'setor', '')),
      btrim(coalesce(contato->>'celular', '')),
      nullif(btrim(coalesce(contato->>'email', '')), ''),
      btrim(coalesce(contato->>'responsavel', ''))
    );
  end loop;

  for filial in select * from jsonb_array_elements(coalesce(payload->'filiais', '[]'::jsonb)) loop
    insert into public.fornecedores_filiais (
      fornecedor_id,
      rotulo,
      endereco_completo,
      referencia
    ) values (
      v_fornecedor_id,
      nullif(btrim(coalesce(filial->>'rotulo', '')), ''),
      btrim(coalesce(filial->>'endereco_completo', '')),
      nullif(btrim(coalesce(filial->>'referencia', '')), '')
    );
  end loop;

  select jsonb_build_object(
    'id', f.id,
    'nome', f.nome,
    'tipo', f.tipo,
    'pessoa_tipo', f.pessoa_tipo,
    'documento', f.documento,
    'razao_social_ou_nome_completo', f.razao_social_ou_nome_completo,
    'inscricao_estadual', f.inscricao_estadual,
    'inscricao_municipal', f.inscricao_municipal,
    'telefone', f.telefone,
    'contatos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'setor', c.setor,
        'celular', c.celular,
        'email', c.email,
        'responsavel', c.responsavel
      ) order by c.created_at)
      from public.fornecedores_contatos c
      where c.fornecedor_id = f.id
    ), '[]'::jsonb),
    'filiais', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', fi.id,
        'rotulo', fi.rotulo,
        'endereco_completo', fi.endereco_completo,
        'referencia', fi.referencia
      ) order by fi.created_at)
      from public.fornecedores_filiais fi
      where fi.fornecedor_id = f.id
    ), '[]'::jsonb)
  )
  into response
  from public.fornecedores f
  where f.id = v_fornecedor_id;

  return response;
end;
$$;
