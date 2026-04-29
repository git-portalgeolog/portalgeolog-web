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
      .select('id, status_operacional, motorista, protocolo, os_number, trecho')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    const alreadyStarted = os.status_operacional === 'Em Rota' || os.status_operacional === 'Finalizado';

    return NextResponse.json({
      success: true,
      os,
      alreadyStarted,
      message: alreadyStarted ? 'Rota já iniciada anteriormente.' : undefined,
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-start-route preview:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { os_id?: string };
    const osId = body.os_id;

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
      .from('ordens_servico')
      .select('id, status_operacional, motorista')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    if (os.status_operacional === 'Em Rota' || os.status_operacional === 'Finalizado') {
      return NextResponse.json({ success: true, alreadyStarted: true, message: 'Rota já iniciada anteriormente.' });
    }

    const { error: updateError } = await getAdmin()
      .from('ordens_servico')
      .update({
        status_operacional: 'Em Rota',
        route_started_at: new Date().toISOString(),
      })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao iniciar a rota.' },
        { status: 500 }
      );
    }

    try {
      if (os.motorista) {
        const { data: driverPhone } = await getAdmin()
          .from('drivers')
          .select('phone')
          .eq('name', os.motorista)
          .single();

        if (driverPhone?.phone) {
          const finishLink = `https://portalgeolog.com.br/finalizar-rota/${osId}`;
          const message =
            `🚗 *Rota iniciada!*\n\nBoa viagem.\n\n` +
            `Quando chegar ao destino, clique no link abaixo para finalizar a rota:\n` +
            `${finishLink}\n\n` +
            `_Após clicar, o status será atualizado automaticamente no painel._`;
          await sendWhatsAppMessage(driverPhone.phone, message);
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao enviar mensagem de início de rota:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Rota iniciada. Boa viagem!',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-start-route POST:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
