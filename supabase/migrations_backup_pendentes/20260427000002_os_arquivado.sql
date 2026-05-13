-- Migration: Adicionar coluna arquivado em ordens_servico para soft-delete
-- Description: Permitir arquivar OS sem perder dados

alter table public.ordens_servico
add column if not exists arquivado boolean not null default false;

-- Index para performance em filtros por arquivado
create index if not exists idx_ordens_servico_arquivado on public.ordens_servico(arquivado);

-- Atualizar registros existentes (já estão false por default, mas garantimos)
update public.ordens_servico set arquivado = false where arquivado is null;
