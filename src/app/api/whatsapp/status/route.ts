import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  fetchWahaSessionState,
  getRateLimitHeaders,
  rateLimitResponse,
  unauthorizedResponse,
  validateAuth,
} from '@/lib/whatsapp';

export const runtime = 'edge';

async function syncTable(state: 'open' | 'connecting' | 'close', ownerJid: string | null): Promise<void> {
  const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await sb.from('whatsapp_status').upsert(
      {
        instance_name: WAHA_SESSION,
        state,
        owner_jid: ownerJid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'instance_name' }
    );
  } catch (e) {
    console.error('[whatsapp/status] syncTable error:', e);
  }
}

export async function GET(request: Request) {
  try {
    if (!checkRateLimit(request, 20, 60)) {
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

    try {
      const snapshot = await fetchWahaSessionState(WAHA_SESSION);
      await syncTable(snapshot.state, snapshot.ownerJid);

      return NextResponse.json(
        {
          success: true,
          instance: {
            instanceName: snapshot.sessionName,
            state: snapshot.state,
            ownerJid: snapshot.ownerJid,
            meId: snapshot.meId,
            rawStatus: snapshot.rawStatus,
          },
        },
        { headers: getRateLimitHeaders(request) }
      );
    } catch {
      // WAHA fora do ar → marcar como close
      await syncTable('close', null);
      return NextResponse.json(
        { success: true, instance: { instanceName: WAHA_SESSION, state: 'close' } },
        { headers: getRateLimitHeaders(request) }
      );
    }
  } catch (error: unknown) {
    console.error('🔥 Erro Status WAHA:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: getRateLimitHeaders(request) }
    );
  }
}
