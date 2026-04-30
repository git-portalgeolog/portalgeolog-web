-- Migration: Adicionar campo de estado da conversa WhatsApp com motorista
-- Description: Rastrear o fluxo de aceitação/início/finalização via respostas de texto no WhatsApp

alter table public.ordens_servico
add column if not exists driver_whatsapp_state text default null;

-- Índice para busca rápida de OS pendente por motorista + estado
create index if not exists idx_ordens_servico_driver_whatsapp_state on public.ordens_servico(driver_whatsapp_state)
where driver_whatsapp_state is not null;

-- Comentário
comment on column public.ordens_servico.driver_whatsapp_state is 'Estado da conversa WhatsApp: awaiting_accept, awaiting_start, awaiting_km_start, awaiting_finish, awaiting_km_finish, completed';
