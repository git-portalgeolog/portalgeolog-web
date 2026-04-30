import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitResponse,
  unauthorizedResponse,
  validateAuth,
} from '@/lib/whatsapp';

export const runtime = 'edge';

function getWahaConfig() {
  return {
    url: process.env.WAHA_API_URL,
    key: process.env.WAHA_API_KEY,
  };
}

function getWebhookConfig() {
  const webhookUrl = 'https://portalgeolog.com.br/api/whatsapp/webhook';
  const hookHmacKey = process.env.WHATSAPP_HOOK_HMAC_KEY || process.env.WAHA_WEBHOOK_HMAC_KEY || '';

  return {
    url: webhookUrl,
    events: ['session.status', 'message', 'message.any'],
    ...(hookHmacKey ? { hmac: { key: hookHmacKey } } : {}),
    retries: {
      policy: 'constant',
      delaySeconds: 2,
      attempts: 15,
    },
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    if (!checkRateLimit(request, 10, 60)) {
      return rateLimitResponse(request);
    }

    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const { url: WAHA_API_URL, key: WAHA_API_KEY } = getWahaConfig();

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'WAHA não configurada' },
        { status: 500 }
      );
    }

    const { name } = await params;

    const startSession = async (endpoint: string, body: unknown) => {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_API_KEY,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    let response = await startSession(
      `${WAHA_API_URL}/api/sessions/${encodeURIComponent(name)}/start`,
      {
        name,
        config: {
          webhooks: [getWebhookConfig()],
        },
      }
    );

    if (response.status === 404) {
      response = await startSession(`${WAHA_API_URL}/api/sessions/start`, {
        name,
        config: {
          webhooks: [getWebhookConfig()],
        },
      });
    }

    if (!response.ok && response.status !== 422) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Sessão "${name}" iniciada` },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('[waha/sessions/start] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
