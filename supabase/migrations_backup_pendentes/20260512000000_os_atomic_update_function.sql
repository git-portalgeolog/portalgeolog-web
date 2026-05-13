-- Função RPC para atualização atômica de OS com waypoints
-- Garante que nunca haja perda de dados: se qualquer passo falhar,
-- toda a transação é revertida automaticamente pelo PostgreSQL.

CREATE OR REPLACE FUNCTION update_os_atomic(
  p_os_id UUID,
  p_os_data JSONB,
  p_waypoints JSONB,
  p_driver_operation_cycles JSONB DEFAULT '[]'::jsonb,
  p_current_driver_cycle_index INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wp JSONB;
  v_passenger JSONB;
  v_wp_id UUID;
  v_position INTEGER := 0;
BEGIN
  -- 1. Atualizar a ordem de serviço
  UPDATE public.ordens_servico SET
    data = (p_os_data->>'data')::DATE,
    hora = COALESCE(p_os_data->>'hora', ''),
    hora_extra = COALESCE(p_os_data->>'hora_extra', ''),
    os_number = COALESCE(p_os_data->>'os_number', ''),
    cliente_id = (p_os_data->>'cliente_id')::UUID,
    solicitante = COALESCE(p_os_data->>'solicitante', ''),
    solicitante_id = (p_os_data->>'solicitante_id')::UUID,
    centro_custo = COALESCE(p_os_data->>'centro_custo', ''),
    centro_custo_id = (p_os_data->>'centro_custo_id')::UUID,
    motorista = COALESCE(p_os_data->>'motorista', ''),
    driver_id = (p_os_data->>'driver_id')::UUID,
    veiculo_id = (p_os_data->>'veiculo_id')::UUID,
    valor_bruto = COALESCE((p_os_data->>'valor_bruto')::NUMERIC, 0),
    obs_financeiras = COALESCE(p_os_data->>'obs_financeiras', ''),
    imposto = COALESCE((p_os_data->>'imposto')::NUMERIC, 0),
    custo = COALESCE((p_os_data->>'custo')::NUMERIC, 0),
    lucro = COALESCE((p_os_data->>'lucro')::NUMERIC, 0),
    driver_operation_cycles = p_driver_operation_cycles,
    current_driver_cycle_index = p_current_driver_cycle_index,
    updated_at = NOW()
  WHERE id = p_os_id;

  -- 2. Deletar waypoints antigos (cascade deleta passageiros)
  DELETE FROM public.os_waypoints WHERE ordem_servico_id = p_os_id;

  -- 3. Deletar comentários antigos
  DELETE FROM public.os_waypoint_comments WHERE ordem_servico_id = p_os_id;

  -- 4. Inserir novos waypoints com passageiros e comentários
  FOR v_wp IN SELECT * FROM jsonb_array_elements(p_waypoints)
  LOOP
    INSERT INTO public.os_waypoints (
      ordem_servico_id,
      position,
      label,
      lat,
      lng,
      comment,
      itinerary_index,
      hora,
      data
    ) VALUES (
      p_os_id,
      v_position,
      COALESCE(v_wp->>'label', ''),
      (v_wp->>'lat')::DOUBLE PRECISION,
      (v_wp->>'lng')::DOUBLE PRECISION,
      COALESCE(v_wp->>'comment', ''),
      (v_wp->>'itinerary_index')::INTEGER,
      v_wp->>'hora',
      (v_wp->>'data')::DATE
    )
    RETURNING id INTO v_wp_id;

    -- Inserir passageiros do waypoint
    IF jsonb_array_length(COALESCE(v_wp->'passengers', '[]'::jsonb)) > 0 THEN
      FOR v_passenger IN SELECT * FROM jsonb_array_elements(COALESCE(v_wp->'passengers', '[]'::jsonb))
      LOOP
        INSERT INTO public.os_waypoint_passengers (
          waypoint_id,
          passageiro_id
        ) VALUES (
          v_wp_id,
          (v_passenger->>'solicitante_id')::UUID
        );
      END LOOP;
    END IF;

    -- Inserir comentário do waypoint
    IF COALESCE(v_wp->>'comment', '') <> '' THEN
      INSERT INTO public.os_waypoint_comments (
        ordem_servico_id,
        waypoint_position,
        waypoint_label,
        comment
      ) VALUES (
        p_os_id,
        v_position,
        COALESCE(v_wp->>'label', ''),
        v_wp->>'comment'
      );
    END IF;

    v_position := v_position + 1;
  END LOOP;

END;
$$;

-- Conceder permissão para authenticated users chamarem a função
GRANT EXECUTE ON FUNCTION update_os_atomic(UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_os_atomic(UUID, JSONB, JSONB, JSONB, INTEGER) TO service_role;
