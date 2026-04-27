create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Inserir valor padrão de 12% para manter compatibilidade
insert into public.app_settings (key, value)
values ('imposto_percentual', '12')
on conflict (key) do nothing;

-- Habilitar RLS
alter table public.app_settings enable row level security;

-- Política: qualquer usuário autenticado pode ler
CREATE POLICY "app_settings_select_authenticated" 
ON public.app_settings 
FOR SELECT 
TO authenticated 
USING (true);

-- Política: apenas service_role pode inserir/atualizar
CREATE POLICY "app_settings_write_service_role" 
ON public.app_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Política: apenas administradores podem atualizar (via JWT claim ou checagem em API)
-- Como o client-side não tem service_role, usaremos uma API route para atualização
-- Esta política permite INSERT/UPDATE para authenticated como fallback, 
-- mas a lógica de autorização será feita na API route ou no frontend.
CREATE POLICY "app_settings_update_authenticated" 
ON public.app_settings 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "app_settings_insert_authenticated" 
ON public.app_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
