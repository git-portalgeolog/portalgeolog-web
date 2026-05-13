-- Função RPC para atualização atômica de vínculos motorista-veículo
-- Garante que nunca haja perda de dados: DELETE + INSERT dentro de transação

CREATE OR REPLACE FUNCTION update_driver_vehicles_atomic(
  p_driver_id UUID,
  p_vehicle_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- 1. Deletar vínculos antigos
  DELETE FROM public.driver_vehicles WHERE driver_id = p_driver_id;

  -- 2. Inserir novos vínculos
  FOREACH v_vehicle_id IN ARRAY p_vehicle_ids
  LOOP
    INSERT INTO public.driver_vehicles (driver_id, vehicle_id)
    VALUES (p_driver_id, v_vehicle_id);
  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION update_driver_vehicles_atomic(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_driver_vehicles_atomic(UUID, UUID[]) TO service_role;
