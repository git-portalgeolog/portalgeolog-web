import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitResponse,
  startWahaSession,
  unauthorizedResponse,
  validateAuth,
} from '@/lib/whatsapp';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 5, 60)) {
      return rateLimitResponse(request);
    }

    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const WAHA_API_URL = process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.WAHA_API_KEY;
    const WAHA_SESSION = process.env.WAHA_SESSION || 'default';

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'WAHA não configurada' },
        { status: 500 }
      );
    }

    const snapshot = await startWahaSession(WAHA_SESSION);

    return NextResponse.json(
      { success: true, instance: snapshot },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('🔥 Erro Restart WAHA:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: getRateLimitHeaders(request) }
    );
  }
}
