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
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token não informado.' }, { status: 400 });
    }

    const { data: confirmation, error: findError } = await supabaseAdmin
      .from('os_passenger_confirmations')
      .select('id, os_id, aceito, aceito_em')
      .eq('token', token)
      .single();

    if (findError || !confirmation) {
      return NextResponse.json(
        { success: false, error: 'Link de confirmação inválido ou expirado.' },
        { status: 404 }
      );
    }

    if (confirmation.aceito) {
      return NextResponse.json({ success: true, alreadyAccepted: true, message: 'Viagem já confirmada anteriormente.' });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('os_passenger_confirmations')
      .update({ aceito: true, aceito_em: now })
      .eq('id', confirmation.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao registrar confirmação.' },
        { status: 500 }
      );
    }

    const { error: osError } = await supabaseAdmin
      .from('ordens_servico')
      .update({ status_operacional: 'Aguardando' })
      .eq('id', confirmation.os_id);

    if (osError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar status da viagem.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Viagem confirmada com sucesso! O motorista será notificado.',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro passenger-accept:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
