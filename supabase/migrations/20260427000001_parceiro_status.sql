-- Migration: Adicionar coluna de status em parceiros_servico
-- Description: Permitir ativar/inativar parceiros de servico

-- Adicionar coluna status com valores permitidos
alter table public.parceiros_servico
add column if not exists status text not null default 'ativo'
check (status = any (array['ativo'::text, 'inativo'::text]));

-- Index para performance em filtros por status
create index if not exists idx_parceiros_servico_status on public.parceiros_servico(status);

-- Atualizar registros existentes para garantir valor
update public.parceiros_servico set status = 'ativo' where status is null;
