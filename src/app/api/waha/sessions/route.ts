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

export async function GET(request: Request) {
  try {
    if (!checkRateLimit(request, 30, 60)) {
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

    const response = await fetch(`${WAHA_API_URL}/api/sessions?all=true`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const sessions = Array.isArray(data) ? data : (data.sessions || []);

    return NextResponse.json(
      { success: true, sessions },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('[waha/sessions GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const sessionName = 'default';

    const listResponse = await fetch(`${WAHA_API_URL}/api/sessions?all=true`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!listResponse.ok) {
      const text = await listResponse.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${listResponse.status}: ${text}` },
        { status: 502 }
      );
    }

    const payload = await listResponse.json().catch(() => null) as
      | Array<{ name?: string }>
      | { sessions?: Array<{ name?: string }> }
      | null;

    const sessions = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.sessions)
        ? payload.sessions
        : [];

    const deleteTargets = sessions.filter((session) => session?.name && session.name !== sessionName);

    for (const session of deleteTargets) {
      try {
        await fetch(`${WAHA_API_URL}/api/sessions/${encodeURIComponent(session.name || '')}`, {
          method: 'DELETE',
          headers: {
            'X-Api-Key': WAHA_API_KEY,
            Accept: 'application/json',
          },
        });
      } catch (deleteError) {
        console.warn('[waha/sessions POST] Failed to delete extra session:', session.name, deleteError);
      }
    }

    const existingDefault = sessions.find((session) => session?.name === sessionName);

    if (existingDefault) {
      return NextResponse.json(
        { success: true, session: existingDefault },
        { headers: getRateLimitHeaders(request) }
      );
    }

    const response = await fetch(`${WAHA_API_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify({
        name: sessionName,
        start: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `WAHA error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      { success: true, session: data || { name: sessionName } },
      { headers: getRateLimitHeaders(request) }
    );
  } catch (error: unknown) {
    console.error('[waha/sessions POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
