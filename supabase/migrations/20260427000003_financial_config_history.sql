create table if not exists public.financial_config_history (
  id uuid default gen_random_uuid() primary key,
  config_key text not null,
  value text not null,
  effective_from date not null,
  created_at timestamptz default now()
);

-- Índice para buscar configuração vigente de forma eficiente
CREATE INDEX IF NOT EXISTS idx_financial_config_history_key_date
ON public.financial_config_history (config_key, effective_from desc);

-- Política: qualquer usuário autenticado pode ler
CREATE POLICY "financial_config_history_select_authenticated"
ON public.financial_config_history
FOR SELECT
TO authenticated
USING (true);

-- Política: apenas service_role pode inserir/atualizar/deletar
CREATE POLICY "financial_config_history_write_service_role"
ON public.financial_config_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política fallback para authenticated (será validado na API ou frontend)
CREATE POLICY "financial_config_history_insert_authenticated"
ON public.financial_config_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Habilitar RLS
alter table public.financial_config_history enable row level security;

-- Migrar configuração atual existente para o histórico
insert into public.financial_config_history (config_key, value, effective_from)
select 'imposto_percentual', value, '2000-01-01'::date
from public.app_settings
where key = 'imposto_percentual'
on conflict do nothing;
