import { NextResponse } from 'next/server';
import { validateAuth, unauthorizedResponse } from '@/lib/whatsapp';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const WAHA_API_URL = process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.WAHA_API_KEY;
    const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
    const WHATSAPP_HOOK_HMAC_KEY = process.env.WHATSAPP_HOOK_HMAC_KEY || '';

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'WAHA não configurada' },
        { status: 500 }
      );
    }

    const webhookUrl = 'https://portalgeolog.com.br/api/whatsapp/webhook';

    // WAHA configura/atualiza a sessão via POST /api/sessions/start
    const startUrl = `${WAHA_API_URL}/api/sessions/start`;

    const startResponse = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify({
        name: WAHA_SESSION,
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events: ['session.status', 'message', 'message.any'],
              ...(WHATSAPP_HOOK_HMAC_KEY ? { hmac: { key: WHATSAPP_HOOK_HMAC_KEY } } : {}),
              retries: {
                policy: 'constant',
                delaySeconds: 2,
                attempts: 15,
              },
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!startResponse.ok) {
      const text = await startResponse.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: `WAHA returned ${startResponse.status}: ${text}`,
          url: startUrl,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configurado com sucesso',
      webhookUrl,
      events: ['session.status', 'message', 'message.any'],
    });
  } catch (error: unknown) {
    console.error('🔥 Erro ao configurar webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
