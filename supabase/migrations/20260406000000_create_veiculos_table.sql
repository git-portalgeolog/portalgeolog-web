-- Create vehicles table
create table if not exists public.veiculos (
  id uuid default gen_random_uuid() primary key,
  placa varchar(20) not null,
  modelo varchar(100) not null,
  marca varchar(50) not null,
  ano integer not null check (ano >= 1900 and ano <= extract(year from current_date) + 1),
  cor varchar(50),
  capacidade integer default 1 check (capacidade > 0),
  tipo varchar(20) default 'carro' check (tipo in ('carro', 'van', 'onibus', 'moto', 'caminhao', 'outro')),
  status varchar(20) default 'ativo' check (status in ('ativo', 'inativo', 'manutencao')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) default auth.uid()
);

-- Create unique index for license plate (normalized)
create unique index if not exists veiculos_placa_unique_normalized
  on public.veiculos (upper(btrim(regexp_replace(placa, '[^A-Za-z0-9]', '', 'g'))))
  where btrim(placa) <> '';

-- Add updated_at trigger
drop trigger if exists update_veiculos_updated_at on public.veiculos;
create trigger update_veiculos_updated_at
  before update on public.veiculos
  for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.veiculos enable row level security;

-- RLS policies
drop policy if exists "Veículos são visíveis para todos os usuários autenticados" on public.veiculos;
create policy "Veículos são visíveis para todos os usuários autenticados"
  on public.veiculos for select
  using (auth.role() = 'authenticated');

drop policy if exists "Apenas administradores podem inserir veículos" on public.veiculos;
create policy "Apenas administradores podem inserir veículos"
  on public.veiculos for insert
  with check (
    auth.role() = 'authenticated' 
    and exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and categoria in ('Administrador', 'Interno', 'Gestor')
    )
  );

drop policy if exists "Apenas administradores podem atualizar veículos" on public.veiculos;
create policy "Apenas administradores podem atualizar veículos"
  on public.veiculos for update
  using (
    auth.role() = 'authenticated' 
    and exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and categoria in ('Administrador', 'Interno', 'Gestor')
    )
  );

drop policy if exists "Apenas administradores podem deletar veículos" on public.veiculos;
create policy "Apenas administradores podem deletar veículos"
  on public.veiculos for delete
  using (
    auth.role() = 'authenticated' 
    and exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and categoria in ('Administrador', 'Interno', 'Gestor')
    )
  );

-- Add vehicle_id to drivers table if not exists
alter table public.drivers 
add column if not exists vehicle_id uuid references public.veiculos(id);

-- Create index for vehicle_id in drivers table
create index if not exists drivers_vehicle_id_idx on public.drivers(vehicle_id);

-- Add trigger to ensure drivers must have a vehicle
create or replace function public.ensure_driver_vehicle()
returns trigger as $$
begin
  if new.vehicle_id is null then
    raise exception 'vehicle_id is required for drivers';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists ensure_driver_vehicle on public.drivers;
create trigger ensure_driver_vehicle
  before insert or update on public.drivers
  for each row execute function public.ensure_driver_vehicle();
