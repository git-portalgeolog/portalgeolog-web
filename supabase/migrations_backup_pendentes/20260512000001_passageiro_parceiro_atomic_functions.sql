-- Funções RPC para atualização atômica de Passageiro e Parceiro
-- Garantem que nunca haja perda de dados: DELETE + INSERT dentro de transação

-- 1. Passageiro: UPDATE + DELETE endereços + INSERT endereços
CREATE OR REPLACE FUNCTION update_passageiro_atomic(
  p_passageiro_id UUID,
  p_nome_completo TEXT,
  p_email TEXT,
  p_celular TEXT,
  p_cpf TEXT,
  p_notificar BOOLEAN,
  p_genero TEXT,
  p_enderecos JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end JSONB;
BEGIN
  UPDATE public.passageiros SET
    nome_completo = p_nome_completo,
    email = COALESCE(p_email, ''),
    celular = p_celular,
    cpf = COALESCE(p_cpf, ''),
    notificar = COALESCE(p_notificar, false),
    genero = p_genero,
    updated_at = NOW()
  WHERE id = p_passageiro_id;

  DELETE FROM public.passageiro_enderecos WHERE passageiro_id = p_passageiro_id;

  FOR v_end IN SELECT * FROM jsonb_array_elements(p_enderecos)
  LOOP
    INSERT INTO public.passageiro_enderecos (
      passageiro_id, rotulo, endereco_completo, referencia
    ) VALUES (
      p_passageiro_id,
      COALESCE(v_end->>'rotulo', 'Principal'),
      v_end->>'endereco_completo',
      v_end->>'referencia'
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_passageiro_atomic(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_passageiro_atomic(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, JSONB) TO service_role;

-- 2. Parceiro: UPDATE + DELETE contatos/filiais + INSERT contatos/filiais
CREATE OR REPLACE FUNCTION update_parceiro_atomic(
  p_parceiro_id UUID,
  p_nome TEXT,
  p_pessoa_tipo TEXT,
  p_documento TEXT,
  p_razao_social_ou_nome_completo TEXT,
  p_contatos JSONB,
  p_filiais JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contato JSONB;
  v_filial JSONB;
BEGIN
  UPDATE public.parceiros_servico SET
    nome = p_nome,
    pessoa_tipo = p_pessoa_tipo,
    documento = p_documento,
    razao_social_ou_nome_completo = p_razao_social_ou_nome_completo,
    updated_at = NOW()
  WHERE id = p_parceiro_id;

  DELETE FROM public.parceiros_contatos WHERE parceiro_id = p_parceiro_id;
  DELETE FROM public.parceiros_filiais WHERE parceiro_id = p_parceiro_id;

  FOR v_contato IN SELECT * FROM jsonb_array_elements(p_contatos)
  LOOP
    INSERT INTO public.parceiros_contatos (
      parceiro_id, setor, celular, email, responsavel
    ) VALUES (
      p_parceiro_id,
      v_contato->>'setor',
      v_contato->>'celular',
      v_contato->>'email',
      v_contato->>'responsavel'
    );
  END LOOP;

  FOR v_filial IN SELECT * FROM jsonb_array_elements(p_filiais)
  LOOP
    INSERT INTO public.parceiros_filiais (
      parceiro_id, rotulo, endereco_completo, referencia
    ) VALUES (
      p_parceiro_id,
      v_filial->>'rotulo',
      v_filial->>'endereco_completo',
      v_filial->>'referencia'
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_parceiro_atomic(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_parceiro_atomic(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO service_role;
