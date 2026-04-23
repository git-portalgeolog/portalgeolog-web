import { NextResponse } from 'next/server';

// Configurar Edge Runtime para Cloudflare Workers
export const runtime = 'edge';

// Configurações WASenderAPI
const WA_SENDER_API_URL = "https://www.wasenderapi.com/api/send-message";
const WA_SENDER_API_KEY = "662f06bc6117892fe23d265f39d3ac3b5cac0f79538898361a8ed18c377a0264";

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
  } catch (error: unknown) {
    console.error('🔥 Erro Crítico WASenderAPI:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
