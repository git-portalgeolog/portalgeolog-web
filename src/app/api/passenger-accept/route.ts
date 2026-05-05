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
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token não informado.' }, { status: 400 });
    }

    const { data: confirmation, error: findError } = await getAdmin()
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

    const { error: updateError } = await getAdmin()
      .from('os_passenger_confirmations')
      .update({ aceito: true, aceito_em: now })
      .eq('id', confirmation.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao registrar confirmação.' },
        { status: 500 }
      );
    }

    let messageSent = false;
    try {
      const { data: passengerData } = await getAdmin()
        .from('passageiros')
        .select('nome_completo, celular')
        .eq('id', confirmation.passageiro_id)
        .maybeSingle();

      const { data: osData } = await getAdmin()
        .from('ordens_servico')
        .select('motorista')
        .eq('id', confirmation.os_id)
        .maybeSingle();

      if (passengerData?.celular) {
        const passengerName = passengerData.nome_completo?.split(' ')[0] || 'Passageiro';
        const driverName = osData?.motorista?.split(' ')[0] || 'Motorista';
        const thanksMessage =
          `✅ *Confirmação recebida!*\n\n` +
          `Obrigado, *${passengerName}*! Sua viagem foi confirmada com sucesso.\n\n` +
          `🚗 *Motorista:* ${driverName}\n` +
          `⏰ *Horário:* ${now.slice(11, 16)}\n\n` +
          `Aguarde a chegada do veículo no local combinado. Qualquer alteração, entraremos em contato.\n\n` +
          `_Portal Geolog - Sua viagem, nossa prioridade._`;

        await sendWhatsAppMessage(passengerData.celular, thanksMessage);
        messageSent = true;
      }
    } catch (notifyErr) {
      console.error('[passenger-accept] Erro ao enviar agradecimento WhatsApp:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: messageSent
        ? 'Viagem confirmada com sucesso! O motorista será notificado.'
        : 'Viagem confirmada com sucesso!',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro passenger-accept:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
