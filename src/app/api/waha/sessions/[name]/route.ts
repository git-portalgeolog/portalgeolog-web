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

export async function DELETE(
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

    const response = await fetch(
      `${WAHA_API_URL}/api/sessions/${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Sessão "${name}" removida` },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('[waha/sessions DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
