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

    if (os.status_operacional === 'Em Execução' || os.status_operacional === 'Concluído') {
      return NextResponse.json({ success: true, alreadyStarted: true, message: 'Rota já iniciada anteriormente.' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('ordens_servico')
      .update({ status_operacional: 'Em Execução' })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao iniciar a rota.' },
        { status: 500 }
      );
    }

    try {
      if (osId) {
        const { data: driver } = await supabaseAdmin
          .from('ordens_servico')
          .select('motorista')
          .eq('id', osId)
          .single();

        if (driver?.motorista) {
          const { data: driverPhone } = await supabaseAdmin
            .from('drivers')
            .select('phone')
            .eq('name', driver.motorista)
            .single();

          if (driverPhone?.phone) {
            const message = `🚗 *Rota iniciada!*\n\nBoa viagem. Se precisar, o sistema já está atualizado.`;
            await sendWhatsAppMessage(driverPhone.phone, message);
          }
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
    console.error('🔥 Erro os-start-route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
