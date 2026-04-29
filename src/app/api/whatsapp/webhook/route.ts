import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const WAHA_WEBHOOK_HMAC_KEY = process.env.WHATSAPP_HOOK_HMAC_KEY || process.env.WAHA_WEBHOOK_HMAC_KEY || '';
const WAHA_WEBHOOK_API_KEY = process.env.WAHA_WEBHOOK_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeSignature(value: string): string {
  return value.replace(/^sha(256|512)[:=]/i, '').trim().toLowerCase();
}

async function verifyWebhookHmac(bodyText: string, signatureHeader: string, algorithmHeader: string | null): Promise<boolean> {
  if (!WAHA_WEBHOOK_HMAC_KEY || !signatureHeader) {
    return false;
  }

  const algorithm = (algorithmHeader || 'sha512').toLowerCase();
  const hashName = algorithm === 'sha256' ? 'SHA-256' : 'SHA-512';
  const keyData = new TextEncoder().encode(WAHA_WEBHOOK_HMAC_KEY);
  const bodyData = new TextEncoder().encode(bodyText);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: hashName },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
  const expected = toHex(signatureBuffer);
  const received = normalizeSignature(signatureHeader);

  if (expected.length !== received.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }

  return mismatch === 0;
}

function mapWahaState(rawStatus: string | null | undefined, rawEngineState: string | null | undefined): 'open' | 'connecting' | 'close' {
  const status = rawStatus?.toUpperCase() ?? '';
  const engineState = rawEngineState?.toUpperCase() ?? '';

  if (status === 'WORKING' || status === 'CONNECTED' || engineState === 'CONNECTED') {
    return 'open';
  }

  if (
    status === 'STARTING' ||
    status === 'SCAN_QR_CODE' ||
    status === 'WAITING' ||
    status === 'CONNECTING'
  ) {
    return 'connecting';
  }

  return 'close';
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();

    // Prioridade: HMAC da WAHA; fallback transitório para X-Api-Key
    let authorized = false;

    if (WAHA_WEBHOOK_HMAC_KEY) {
      const signature = request.headers.get('X-Webhook-Hmac') ?? '';
      const algorithm = request.headers.get('X-Webhook-Hmac-Algorithm');
      authorized = await verifyWebhookHmac(bodyText, signature, algorithm);
    } else if (WAHA_WEBHOOK_API_KEY) {
      const apiKey = request.headers.get('X-Api-Key') ?? request.headers.get('apikey') ?? '';
      authorized = Boolean(apiKey && apiKey === WAHA_WEBHOOK_API_KEY);
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(bodyText) as {
      event?: string;
      session?: string;
      instance?: string;
      payload?: {
        session?: string;
        event?: string;
        status?: string;
        state?: string;
        me?: { id?: string | null } | null;
        data?: { status?: string; state?: string; me?: { id?: string | null } | null } | null;
      } | null;
      data?: {
        state?: string;
        status?: string;
        me?: { id?: string | null } | null;
      } | null;
      status?: string;
      state?: string;
      me?: { id?: string | null } | null;
    };

    const event = body.event ?? body.payload?.event;

    // Processa respostas da lista de opções via eventos de mensagem
    if (event === 'message' || event === 'message.any') {
      const messagePayload = body.payload as {
        id?: string;
        from?: string;
        body?: string;
        replyTo?: { id?: string | null } | null;
      } | null;

      const selectedText = messagePayload?.body?.trim() || '';
      const replyToId = messagePayload?.replyTo?.id || null;

      const normalizedChoice = selectedText.toLowerCase();
      const isKnownChoice = normalizedChoice === 'aceitar' || normalizedChoice === 'recusar';

      if (!isKnownChoice || !replyToId) {
        return NextResponse.json({ ignored: true, reason: 'not a list reply' });
      }

      const supabase = createAdminClient();

      const { data: listRecord, error: listError } = await supabase
        .from('os_driver_polls')
        .select('os_id, id')
        .eq('poll_id', replyToId)
        .single();

      if (listError || !listRecord) {
        console.error('[whatsapp/webhook] List message not found:', replyToId, listError);
        return NextResponse.json({ ignored: true, reason: 'list message not found' });
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('os_driver_polls')
        .update({
          status: 'voted',
          voted_option: selectedText,
          voted_at: now,
          updated_at: now,
        })
        .eq('id', listRecord.id);

      if (updateError) {
        console.error('[whatsapp/webhook] Error updating list record:', updateError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }

      const operationalStatus = normalizedChoice === 'aceitar' ? 'Aguardando' : 'Cancelado';

      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({
          status_operacional: operationalStatus,
          updated_at: now,
        })
        .eq('id', listRecord.os_id);

      if (osError) {
        console.error('[whatsapp/webhook] Error updating OS:', osError);
      }

      return NextResponse.json({
        success: true,
        choice: selectedText,
        osId: listRecord.os_id,
        operationalStatus,
      });
    }

    // Só processa eventos de status da sessão
    if (event !== 'session.status' && event !== 'connection.update') {
      return NextResponse.json({ ignored: true, event });
    }

    const sessionName = body.session ?? body.payload?.session ?? body.instance ?? 'default';
    const rawStatus = body.payload?.status ?? body.payload?.state ?? body.status ?? body.data?.status ?? body.data?.state ?? null;
    const rawEngineState = body.payload?.data?.status ?? body.payload?.data?.state ?? null;
    const ownerJid = body.payload?.me?.id ?? body.payload?.data?.me?.id ?? body.me?.id ?? null;

    const mappedState = mapWahaState(rawStatus, rawEngineState);

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('whatsapp_status')
      .upsert(
        {
          instance_name: sessionName,
          state: mappedState,
          owner_jid: ownerJid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'instance_name' }
      );

    if (error) {
      console.error('[whatsapp/webhook] Supabase upsert error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, instance: sessionName, state: mappedState, ownerJid });
  } catch (err) {
    console.error('[whatsapp/webhook] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
