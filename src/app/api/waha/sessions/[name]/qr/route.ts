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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    if (!checkRateLimit(request, 200, 60)) {
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

    // Tentar endpoint v2 primeiro, fallback para v1
    let response = await fetch(
      `${WAHA_API_URL}/api/sessions/${encodeURIComponent(name)}/auth/qr`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          Accept: 'application/json',
        },
      }
    );

    if (response.status === 404) {
      response = await fetch(
        `${WAHA_API_URL}/api/${encodeURIComponent(name)}/auth/qr`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': WAHA_API_KEY,
            Accept: 'application/json',
          },
        }
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'QR code não disponível. Sessão pode já estar conectada.' },
          { status: 404 }
        );
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => null) as { qr?: string; mimetype?: string; data?: string; value?: string } | null;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'WAHA não retornou QR code válido' },
        { status: 502 }
      );
    }

    const qrCode = data.qr || (data.data || data.value ? `data:${data.mimetype || 'image/png'};base64,${data.data || data.value}` : null);
    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: 'QR code indisponível no momento' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, qrCode },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('[waha/sessions/qr] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
