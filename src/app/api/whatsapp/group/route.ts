import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  sendAdminOSHistoryToGroup,
  findWahaGroupByName,
  rateLimitResponse,
  unauthorizedResponse,
  validateAuth,
  sendWhatsAppGroupMessage,
} from '@/lib/whatsapp';

export const runtime = 'edge';

const ADMIN_GROUP_NAME = 'Programações Solicitadas';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 30, 60)) {
      return rateLimitResponse(request);
    }

    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const body = (await request.json()) as {
      message?: string;
      osId?: string;
      event?: 'cancelada' | 'reaberta' | 'arquivada' | 'concluida';
    };

    if (body.osId && body.event) {
      const data = await sendAdminOSHistoryToGroup(body.osId, body.event, WAHA_SESSION);

      return NextResponse.json(
        { success: true, api_response: data },
        { headers: getRateLimitHeaders(request) }
      );
    }

    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mensagem não pode estar vazia' },
        { status: 400, headers: getRateLimitHeaders(request) }
      );
    }

    const groupId = await findWahaGroupByName(ADMIN_GROUP_NAME, WAHA_SESSION);

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: `Grupo "${ADMIN_GROUP_NAME}" não encontrado na sessão WAHA.` },
        { status: 404, headers: getRateLimitHeaders(request) }
      );
    }

    const data = await sendWhatsAppGroupMessage(groupId, message, WAHA_SESSION);

    return NextResponse.json(
      { success: true, api_response: data },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('🔥 Erro Crítico WAHA Grupo:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: getRateLimitHeaders(request) }
    );
  }
}
