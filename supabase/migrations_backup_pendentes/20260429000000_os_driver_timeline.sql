-- Migration: Adicionar campos de timeline e quilometragem para fluxo do motorista
-- Description: Rastrear data/hora e KM nas etapas de mensagem, aceite, em rota e concluído

alter table public.ordens_servico
add column if not exists driver_message_sent_at timestamptz,
add column if not exists driver_accepted_at timestamptz,
add column if not exists driver_km_initial integer,
add column if not exists route_started_at timestamptz,
add column if not exists route_started_km integer,
add column if not exists route_finished_at timestamptz,
add column if not exists route_finished_km integer;

-- Índices para performance em filtros de status operacional
create index if not exists idx_ordens_servico_driver_accepted_at on public.ordens_servico(driver_accepted_at);
create index if not exists idx_ordens_servico_route_started_at on public.ordens_servico(route_started_at);
create index if not exists idx_ordens_servico_route_finished_at on public.ordens_servico(route_finished_at);
