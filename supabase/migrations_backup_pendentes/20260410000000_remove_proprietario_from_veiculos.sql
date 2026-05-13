-- Remove colunas de proprietário da tabela veiculos
-- Isso é necessário pois os veículos não precisam mais ser vinculados a proprietários

-- Remover constraint de foreign key para parceiros_servico
ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_parceiro_id_fkey;

-- Remover coluna parceiro_id
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS parceiro_id;

-- Remover coluna proprietario_tipo
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS proprietario_tipo;
