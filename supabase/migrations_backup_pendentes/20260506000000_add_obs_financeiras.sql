-- Add obs_financeiras column to ordens_servico
ALTER TABLE ordens_servico
ADD COLUMN IF NOT EXISTS obs_financeiras text DEFAULT '';
