import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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
      .select('id, status_operacional, motorista')
      .eq('id', osId)
      .single();

    console.log('[os-driver-accept] OS encontrada:', os?.id, 'motorista:', os?.motorista, 'status:', os?.status_operacional);

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

    // Enviar mensagens para o motorista
    let messageSent = false;
    try {
      if (os.motorista) {
        const { data: driver, error: driverError } = await supabaseAdmin
          .from('drivers')
          .select('phone')
          .eq('name', os.motorista)
          .single();

        console.log('[os-driver-accept] Driver lookup:', { name: os.motorista, phone: driver?.phone, error: driverError?.message });

        if (driver?.phone) {
          const startRouteLink = `https://portalgeolog.com.br/iniciar-rota/${osId}`;

          // Mensagem única: agradecimento + link de início de rota
          const acceptMessage =
            `✅ *Viagem aceita!*\n\n` +
            `Obrigado.\n\n` +
            `Quando for iniciar a rota, clique aqui:\n` +
            `${startRouteLink}`;

          console.log('[os-driver-accept] Enviando msg para', driver.phone);
          await sendWhatsAppMessage(driver.phone, acceptMessage);
          messageSent = true;
          console.log('[os-driver-accept] Msg enviada');
        } else {
          console.warn('[os-driver-accept] Telefone do motorista não encontrado');
        }
      } else {
        console.warn('[os-driver-accept] OS sem motorista definido');
      }
    } catch (notifyErr) {
      console.error('[os-driver-accept] Erro ao enviar WhatsApp:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: messageSent ? 'Viagem aceita. Mensagens enviadas ao motorista.' : 'Viagem aceita.',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-driver-accept:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
