-- Migration: Adicionar tabelas de contatos e filiais para parceiros
-- Description: Criar tabelas para suportar múltiplos contatos e filiais por parceiro

-- Tabela de contatos de parceiros
CREATE TABLE IF NOT EXISTS public.parceiros_contatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros_servico(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  celular TEXT NOT NULL,
  email TEXT,
  responsavel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de filiais de parceiros
CREATE TABLE IF NOT EXISTS public.parceiros_filiais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros_servico(id) ON DELETE CASCADE,
  rotulo TEXT NOT NULL,
  endereco_completo TEXT NOT NULL,
  referencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_parceiros_contatos_parceiro_id ON public.parceiros_contatos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_filiais_parceiro_id ON public.parceiros_filiais(parceiro_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger às novas tabelas
CREATE TRIGGER handle_parceiros_contatos_updated_at
  BEFORE UPDATE ON public.parceiros_contatos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_parceiros_filiais_updated_at
  BEFORE UPDATE ON public.parceiros_filiais
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.parceiros_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros_filiais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contatos
CREATE POLICY "Users can view contacts of their partners" ON public.parceiros_contatos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts for their partners" ON public.parceiros_contatos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts of their partners" ON public.parceiros_contatos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts of their partners" ON public.parceiros_contatos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Políticas RLS para filiais
CREATE POLICY "Users can view branches of their partners" ON public.parceiros_filiais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert branches for their partners" ON public.parceiros_filiais
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update branches of their partners" ON public.parceiros_filiais
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete branches of their partners" ON public.parceiros_filiais
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Dados iniciais: criar contato e filial padrão para parceiros existentes
INSERT INTO public.parceiros_contatos (parceiro_id, setor, celular, responsavel)
SELECT 
  id,
  'Principal',
  COALESCE(telefone, '(00) 00000-0000'),
  'Contato Principal'
FROM public.parceiros_servico
WHERE id NOT IN (
  SELECT DISTINCT parceiro_id 
  FROM public.parceiros_contatos 
  WHERE parceiro_id IS NOT NULL
);

INSERT INTO public.parceiros_filiais (parceiro_id, rotulo, endereco_completo)
SELECT 
  id,
  'Matriz',
  COALESCE(endereco, 'Endereço não informado')
FROM public.parceiros_servico
WHERE id NOT IN (
  SELECT DISTINCT parceiro_id 
  FROM public.parceiros_filiais 
  WHERE parceiro_id IS NOT NULL
);
