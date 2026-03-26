import { NextResponse } from 'next/server';

// Configurações WASenderAPI
const WA_SENDER_API_URL = "https://www.wasenderapi.com/api/send-message";
const WA_SENDER_API_KEY = "1929b24cf117d20488a0520302ca5e00ab36b8025836dad2ac61c5143c383a84";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    // Limpeza do número para o padrão (DDI + DDD + Numero)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    console.log(`[WASenderAPI] Enviando para: ${cleanPhone}`);

    const response = await fetch(WA_SENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WA_SENDER_API_KEY}`
      },
      body: JSON.stringify({
        to: cleanPhone,
        text: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro WASenderAPI:', data);
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Erro na WASenderAPI',
        details: data 
      }, { status: response.status });
    }

    console.log('✅ WhatsApp enviado com sucesso via WASenderAPI:', data);
    return NextResponse.json({ success: true, api_response: data });
  } catch (error: any) {
    console.error('🔥 Erro Crítico WASenderAPI:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
