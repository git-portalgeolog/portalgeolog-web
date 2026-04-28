import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitResponse,
  unauthorizedResponse,
  sendWhatsAppMessage,
  validateAuth,
} from '@/lib/whatsapp';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 30, 60)) {
      return rateLimitResponse(request);
    }

    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const { phone, message } = (await request.json()) as { phone: string; message: string };

    const data = await sendWhatsAppMessage(phone, message);

    return NextResponse.json(
      { success: true, api_response: data },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('🔥 Erro Crítico WAHA:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: getRateLimitHeaders(request) }
    );
  }
}
