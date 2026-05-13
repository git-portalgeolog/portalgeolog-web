-- Migration: Adicionar coluna driver_template_message_id em ordens_servico
-- Description: Armazenar o message_id do template da Meta para permitir lookup no webhook

alter table public.ordens_servico
add column if not exists driver_template_message_id text default null;

create index if not exists idx_ordens_servico_driver_template_msg_id
  on public.ordens_servico(driver_template_message_id)
  where driver_template_message_id is not null;

comment on column public.ordens_servico.driver_template_message_id
  is 'Message ID do template WhatsApp enviado pelo motorista (Meta API), usado para correlacionar respostas no webhook';
