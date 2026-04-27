import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const runtime = 'edge';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
const getAdmin = () => {
  if (!_supabaseAdmin) _supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return _supabaseAdmin;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('os_id');

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
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

    if (os.status_operacional === 'Finalizado') {
      return NextResponse.json({ success: true, alreadyFinished: true, message: 'Rota já finalizada anteriormente.' });
    }

    if (os.status_operacional !== 'Em Rota') {
      return NextResponse.json({ success: false, error: 'A viagem ainda não foi iniciada.' }, { status: 400 });
    }

    const { error: updateError } = await getAdmin()
      .from('ordens_servico')
      .update({ status_operacional: 'Finalizado' })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao finalizar a rota.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rota finalizada! Obrigado.',
    });
  } catch (error: unknown) {
    console.error('Erro os-finish-route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
