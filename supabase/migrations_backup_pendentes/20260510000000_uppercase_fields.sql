-- Migration: Converter nomes para maiúsculas nas tabelas de cadastro e OS
-- Description: Normaliza Solicitante, Centro de Custo, Motorista e Passageiros para uppercase

-- 1. Solicitantes
update public.solicitantes set nome = upper(nome) where nome <> upper(nome);

-- 2. Centros de Custo
update public.centros_custo set nome = upper(nome) where nome <> upper(nome);

-- 3. Motoristas (drivers)
update public.drivers set name = upper(name) where name <> upper(name);

-- 4. Passageiros
update public.passageiros set nome_completo = upper(nome_completo) where nome_completo <> upper(nome_completo);

-- 5. Ordens de Serviço - Solicitante
update public.ordens_servico set solicitante = upper(solicitante) where solicitante <> upper(solicitante) and solicitante <> '';

-- 6. Ordens de Serviço - Motorista
update public.ordens_servico set motorista = upper(motorista) where motorista <> upper(motorista) and motorista <> '';
