import { NextResponse } from 'next/server';
import { getRateLimitHeaders, rateLimitResponse, checkRateLimit } from '@/lib/whatsapp';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 30, 60)) {
      return rateLimitResponse(request);
    }

    const wahaUrl = process.env.WAHA_API_URL;
    const wahaKey = process.env.WAHA_API_KEY;

    if (!wahaUrl || !wahaKey) {
      return NextResponse.json(
        { success: false, error: 'WAHA não configurada', pingOk: false },
        { status: 200 }
      );
    }

    // Health check: verifica se a WAHA API está respondendo no VPS
    let pingOk = false;
    let stdout = 'error';

    try {
      const res = await fetch(`${wahaUrl}/api/sessions?all=true`, {
        method: 'GET',
        headers: {
          'X-Api-Key': wahaKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        pingOk = true;
        stdout = '/opt/waha';
      } else {
        stdout = `waha_error_${res.status}`;
      }
    } catch (error: unknown) {
      pingOk = false;
      stdout = `timeout/erro: ${error instanceof Error ? error.message : 'unknown'}`;
    }

    return NextResponse.json({
      success: true,
      pingOk,
      status: pingOk ? 200 : 0,
      stdout,
    }, { headers: getRateLimitHeaders(request) });
  } catch (error: unknown) {
    console.error('[ssh/ping] Error:', error);
    return NextResponse.json({
      success: true,
      pingOk: false,
      stdout: 'timeout/erro',
    }, { status: 200, headers: getRateLimitHeaders(request) });
  }
}
