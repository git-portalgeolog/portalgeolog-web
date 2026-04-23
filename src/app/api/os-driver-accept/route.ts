import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('os_id');

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }

    // Buscar a OS
    const { data: os, error: findError } = await supabaseAdmin
      .from('ordens_servico')
      .select('id, status_operacional')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    // Se já está em um status avançado, considerar como já aceita
    if (os.status_operacional !== 'Pendente' && os.status_operacional !== 'Cancelado') {
      return NextResponse.json({ success: true, alreadyAccepted: true, message: 'Viagem já aceita pelo motorista anteriormente.' });
    }

    // Atualizar OS: motorista aceitou, muda status de Pendente para Aguardando
    const { error: updateError } = await supabaseAdmin
      .from('ordens_servico')
      .update({
        status_operacional: 'Aguardando',
      })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao registrar aceite do motorista.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Viagem aceita com sucesso! Aguarde a confirmação dos passageiros.',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-driver-accept:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
