-- Migration: Remove Tipo de Serviço functionality
-- Description: Remove tipos_servico table and tipo_servico column from ordens_servico

-- First, drop the tipos_servico table
DROP TABLE IF EXISTS tipos_servico;

-- Remove the tipo_servico column from ordens_servico
ALTER TABLE ordens_servico 
DROP COLUMN IF EXISTS tipo_servico;

-- Remove the realtime subscription for tipos_servico (if it exists)
-- This is handled automatically by dropping the table

-- Note: Any existing data in tipo_servico will be lost
-- This migration is irreversible without backup
