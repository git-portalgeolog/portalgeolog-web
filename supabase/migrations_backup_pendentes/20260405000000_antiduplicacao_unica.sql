delete from public.tipos_servico where id = 'a46d7a5f-1884-4587-bc17-7b12abc160f8';

delete from public.passageiros where id = 'fdee0606-4fbf-4876-bf28-d27a798f5d8e';

create unique index if not exists clientes_nome_unique_normalized
  on public.clientes (lower(btrim(nome)))
  where btrim(nome) <> '';

create unique index if not exists fornecedores_nome_unique_normalized
  on public.fornecedores (lower(btrim(nome)))
  where btrim(nome) <> '';

create unique index if not exists tipos_servico_nome_unique_normalized
  on public.tipos_servico (lower(btrim(nome)))
  where btrim(nome) <> '';

create unique index if not exists passageiros_email_unique_normalized
  on public.passageiros (lower(btrim(email)))
  where btrim(email) <> '';

create unique index if not exists passageiros_celular_unique_normalized
  on public.passageiros (regexp_replace(coalesce(celular, ''), '\\D', '', 'g'))
  where regexp_replace(coalesce(celular, ''), '\\D', '', 'g') <> '';

create unique index if not exists passageiros_cpf_unique_normalized
  on public.passageiros (regexp_replace(coalesce(cpf, ''), '\\D', '', 'g'))
  where regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') <> '';

create unique index if not exists drivers_name_unique_normalized
  on public.drivers (lower(btrim(name)))
  where btrim(name) <> '';

create unique index if not exists drivers_cpf_unique_normalized
  on public.drivers (regexp_replace(coalesce(cpf, ''), '\\D', '', 'g'))
  where regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') <> '';

create unique index if not exists drivers_cnh_unique_normalized
  on public.drivers (regexp_replace(coalesce(cnh, ''), '\\D', '', 'g'))
  where regexp_replace(coalesce(cnh, ''), '\\D', '', 'g') <> '';
