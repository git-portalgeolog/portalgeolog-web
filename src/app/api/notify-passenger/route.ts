import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Configurar Edge Runtime para Cloudflare Workers
export const runtime = 'edge';

// Configurações WASenderAPI
const WA_SENDER_API_URL = "https://www.wasenderapi.com/api/send-message";
const WA_SENDER_API_KEY = "662f06bc6117892fe23d265f39d3ac3b5cac0f79538898361a8ed18c377a0264";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[notify-passenger] body:', JSON.stringify(body));
    const { type, passengerEmail, passengerPhone, passengerName, osProtocol, osId, passageiroId, acceptUrl } = body;

    const results: { email?: boolean; whatsapp?: boolean } = {};

    let token: string | undefined;

    if (osId && passageiroId) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('os_passenger_confirmations')
        .select('id, token')
        .eq('os_id', osId)
        .eq('passageiro_id', passageiroId)
        .single();

      console.log('[notify-passenger] existing token lookup:', existing, existingError);

      if (existing) {
        token = existing.token;
      } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('os_passenger_confirmations')
          .insert({ os_id: osId, passageiro_id: passageiroId })
          .select('token')
          .single();
        console.log('[notify-passenger] inserted token:', inserted, insertError);
        if (inserted) token = inserted.token;
      }
    }

    const confirmationLink = token && acceptUrl
      ? `${acceptUrl}/${token}`
      : undefined;
    console.log('[notify-passenger] confirmationLink:', confirmationLink);

    if ((type === 'email' || type === 'both') && passengerEmail) {
      const resend = createResendClient();
      if (resend) {
        await resend.emails.send({
          from: 'Portal Geolog <suporte@portalgeolog.com.br>',
          to: passengerEmail,
          subject: `Sua viagem está confirmada - ${osProtocol || 'N/A'}`,
          html: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Portal Geolog</h2>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.5;">Olá, <strong>${passengerName || 'Passageiro'}</strong>!</p>
              <p style="font-size: 16px; line-height: 1.5;">Sua viagem <strong>${osProtocol || 'N/A'}</strong> está <strong>aguardando sua confirmação</strong>.</p>
              <p style="font-size: 16px; line-height: 1.5;">Clique no botão abaixo para confirmar:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${confirmationLink || '#'}" style="display: inline-block; background-color: #16a34a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Confirmar Viagem</a>
              </div>
              <p style="font-size: 12px; color: #64748b; text-align: center;">Se o botão não funcionar, copie e cole este link:<br>${confirmationLink || 'N/A'}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #64748b;">
              Portal Geolog - Sistema de Gestão de Transporte
            </div>
          </div>`,
        });
        results.email = true;
      }
    }

    if ((type === 'whatsapp' || type === 'both') && passengerPhone) {
      let cleanPhone = passengerPhone.replace(/\D/g, '');
      if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
      }

      const text = confirmationLink
        ? `Olá, *${passengerName || 'Passageiro'}*! ✨\n\nEsperamos que esteja bem. Estamos entrando em contato para confirmar sua viagem agendada via *Portal Geolog*.\n\n� *Detalhes da Viagem:*\nProtocolo: *${osProtocol || 'N/A'}*\n\nPara garantir sua reserva e nos ajudar na organização do trajeto, pedimos a gentileza de confirmar sua presença clicando no link abaixo:\n\n👉 *CONFIRMAR MINHA VIAGEM:*\n${confirmationLink}\n\nApós clicar, seu status será atualizado automaticamente em nosso sistema. Muito obrigado pela atenção! 🙏`
        : `Olá, *${passengerName || 'Passageiro'}*! ✨\n\nSua viagem de protocolo *${osProtocol || 'N/A'}* está agendada no Portal Geolog. Em breve enviaremos o link de confirmação com todos os detalhes do trajeto.`;

      console.log('[notify-passenger] sending WhatsApp to', cleanPhone, 'text length', text.length);

      const response = await fetch(WA_SENDER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WA_SENDER_API_KEY}`
        },
        body: JSON.stringify({
          to: cleanPhone,
          text,
        })
      });

      console.log('[notify-passenger] WASenderAPI status:', response.status, response.statusText);

      if (response.ok) {
        results.whatsapp = true;
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('❌ Erro WASenderAPI:', data);
        results.whatsapp = false;
        return NextResponse.json(
          { success: false, error: `WASenderAPI error ${response.status}: ${JSON.stringify(data)}`, results, token },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ success: true, results, token });
  } catch (error: unknown) {
    console.error('🔥 Erro Crítico notify-passenger:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
