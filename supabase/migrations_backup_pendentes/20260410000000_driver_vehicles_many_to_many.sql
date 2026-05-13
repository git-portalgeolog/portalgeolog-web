-- Migration: Criar tabela de relacionamento N:M entre drivers e veículos
-- Isso permite que um motorista esteja vinculado a múltiplos veículos

-- Criar tabela driver_vehicles
CREATE TABLE public.driver_vehicles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    vehicle_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- Garantir que não haja duplicatas
    CONSTRAINT unique_driver_vehicle UNIQUE (driver_id, vehicle_id)
);

-- Comentários
COMMENT ON TABLE public.driver_vehicles IS 'Relacionamento N:M entre motoristas e veículos';
COMMENT ON COLUMN public.driver_vehicles.driver_id IS 'ID do motorista';
COMMENT ON COLUMN public.driver_vehicles.vehicle_id IS 'ID do veículo vinculado';

-- RLS: Habilitar row level security
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para driver_vehicles
CREATE POLICY "Allow authenticated users to select driver_vehicles"
    ON public.driver_vehicles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert driver_vehicles"
    ON public.driver_vehicles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update driver_vehicles"
    ON public.driver_vehicles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete driver_vehicles"
    ON public.driver_vehicles
    FOR DELETE
    TO authenticated
    USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_driver_vehicles_updated_at
    BEFORE UPDATE ON public.driver_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes: copiar vehicle_id da tabela drivers para driver_vehicles
INSERT INTO public.driver_vehicles (driver_id, vehicle_id)
SELECT id, vehicle_id
FROM public.drivers
WHERE vehicle_id IS NOT NULL;

-- Remover foreign key e coluna vehicle_id da tabela drivers (opcional - pode manter para compatibilidade)
-- Por enquanto vamos manter a coluna mas remover a FK e deixar nullable
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_vehicle_id_fkey;
ALTER TABLE public.drivers ALTER COLUMN vehicle_id DROP NOT NULL;

-- Criar índices para performance
CREATE INDEX idx_driver_vehicles_driver_id ON public.driver_vehicles(driver_id);
CREATE INDEX idx_driver_vehicles_vehicle_id ON public.driver_vehicles(vehicle_id);
