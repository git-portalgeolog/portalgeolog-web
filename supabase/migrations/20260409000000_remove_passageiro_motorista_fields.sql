-- Remove campos de tipo/veículo/parceiro da tabela passageiros
-- Esses campos foram movidos para a tabela drivers (motoristas)

-- Remover as colunas da tabela passageiros
ALTER TABLE public.passageiros 
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS parceiro_id,
  DROP COLUMN IF EXISTS veiculo_id;
