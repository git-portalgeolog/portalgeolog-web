import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const WA_SENDER_API_URL = "https://www.wasenderapi.com/api/send-message";
const WA_SENDER_API_KEY = "662f06bc6117892fe23d265f39d3ac3b5cac0f79538898361a8ed18c377a0264";

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

    // Enviar mensagem de agradecimento para o motorista
    try {
      if (os.motorista) {
        const { data: driver } = await supabaseAdmin
          .from('drivers')
          .select('phone')
          .eq('name', os.motorista)
          .single();

        if (driver?.phone) {
          let phone = driver.phone.replace(/\D/g, '');
          if (phone.length <= 11 && !phone.startsWith('55')) {
            phone = `55${phone}`;
          }

          const startRouteLink = `https://portalgeolog.com.br/iniciar-rota/${osId}`;
          const thankYouMessage =
            `✅ *Serviço aceito com sucesso!*\n\n` +
            `Obrigado por confirmar a viagem.\n\n` +
            `Quando estiver pronto para iniciar a rota, clique no link abaixo:\n` +
            `${startRouteLink}\n\n` +
            `Boa viagem! 🚗`;

          await fetch(WA_SENDER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${WA_SENDER_API_KEY}`
            },
            body: JSON.stringify({
              to: phone,
              text: thankYouMessage
            })
          });
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao enviar mensagem de agradecimento:', notifyErr);
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
