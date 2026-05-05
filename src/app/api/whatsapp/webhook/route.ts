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

const WAHA_API_URL = process.env.WAHA_API_URL || '';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';

function resolveReplyChatId(chatId: string, fallbackPhoneDigits: string): string {
  const trimmedChatId = chatId.trim();

  if (trimmedChatId.endsWith('@c.us') || trimmedChatId.endsWith('@g.us')) {
    return trimmedChatId;
  }

  if (trimmedChatId.endsWith('@s.whatsapp.net')) {
    return trimmedChatId.replace('@s.whatsapp.net', '@c.us');
  }

  if (fallbackPhoneDigits) {
    return `${fallbackPhoneDigits}@c.us`;
  }

  return trimmedChatId;
}

async function sendBotReply(chatId: string, text: string): Promise<void> {
  if (!WAHA_API_URL || !WAHA_API_KEY) {
    console.error('[whatsapp/webhook] WAHA não configurada para enviar respostas');
    return;
  }
  try {
    console.log(`[whatsapp/webhook] Sending bot reply to ${chatId}`);
    const response = await fetch(`${WAHA_API_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify({
        session: WAHA_SESSION,
        chatId,
        text,
      }),
    });
    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new Error(`WAHA reply error ${response.status}: ${responseText}`);
    }
    console.log(`[whatsapp/webhook] Bot reply sent with status ${response.status}`);
  } catch (err) {
    console.error('[whatsapp/webhook] Falha ao enviar resposta do bot:', err);
  }
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
    console.log('[whatsapp/webhook] RAW BODY:', bodyText.substring(0, 2000));

    let authorized = false;

    if (WAHA_WEBHOOK_HMAC_KEY) {
      const signature = request.headers.get('X-Webhook-Hmac') ?? '';
      const algorithm = request.headers.get('X-Webhook-Hmac-Algorithm');
      authorized = await verifyWebhookHmac(bodyText, signature, algorithm);
    } else if (WAHA_WEBHOOK_API_KEY) {
      const apiKey = request.headers.get('X-Api-Key') ?? request.headers.get('apikey') ?? '';
      authorized = Boolean(apiKey && apiKey === WAHA_WEBHOOK_API_KEY);
    } else if (process.env.NODE_ENV !== 'production') {
      authorized = true;
    }

    if (!authorized) {
      console.warn('[whatsapp/webhook] Unauthorized webhook request', {
        hasHmacKey: Boolean(WAHA_WEBHOOK_HMAC_KEY),
        hasApiKey: Boolean(WAHA_WEBHOOK_API_KEY),
        nodeEnv: process.env.NODE_ENV,
      });
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
    console.log(`[whatsapp/webhook] Event type: "${event}"`);

    // Log persistente no Supabase para debug
    try {
      const supabaseLog = createAdminClient();
      await supabaseLog.from('webhook_logs').insert({
        source: 'waha',
        event_type: event || 'unknown',
        payload: body,
      });
    } catch {
      // ignore log errors
    }

    if (event === 'message' || event === 'message.any') {
      const messagePayload = (body.payload ?? body.data ?? body) as {
        id?: string;
        from?: string;
        body?: string;
        text?: string;
        message?: { body?: string; text?: string } | null;
        replyTo?: { id?: string | null } | null;
        participant?: string | null;
        fromMe?: boolean;
      } | null;

      const rawPayloadForDebug = JSON.stringify({
        event,
        session: body.session,
        from: messagePayload?.from,
        fromMe: messagePayload?.fromMe,
        body: messagePayload?.body,
        text: messagePayload?.text,
        replyTo: messagePayload?.replyTo?.id,
      });

      if (messagePayload?.fromMe === true) {
        console.log(`[whatsapp/webhook] Ignored fromMe message: ${rawPayloadForDebug}`);
        return NextResponse.json({ ignored: true, reason: 'fromMe' });
      }

      const selectedText = (
        messagePayload?.body ||
        messagePayload?.text ||
        messagePayload?.message?.body ||
        messagePayload?.message?.text ||
        ''
      ).trim();
      const fromJid = messagePayload?.from || messagePayload?.participant || '';
      const replyToId = messagePayload?.replyTo?.id || null;
      const normalizedChoice = selectedText.toLowerCase();
      const isNumericChoice = /^\d+$/.test(selectedText);
      const expectedStates =
        normalizedChoice === '1' || normalizedChoice === '0'
          ? ['awaiting_accept']
          : normalizedChoice === 'iniciar'
            ? ['awaiting_start']
            : normalizedChoice === 'finalizar'
              ? ['awaiting_finish']
              : isNumericChoice
                ? ['awaiting_km_start', 'awaiting_km_finish']
                : [];

      console.log(`[whatsapp/webhook] Received message: text="${selectedText}" from="${fromJid}" replyTo="${replyToId ?? 'null'}"`);

      if (!fromJid) {
        console.log('[whatsapp/webhook] Ignored: no fromJid');
        return NextResponse.json({ ignored: true, reason: 'no fromJid' });
      }

      const phoneDigits = fromJid.replace(/\D/g, '').replace(/@.*$/, '');
      console.log(`[whatsapp/webhook] Extracted phone digits: "${phoneDigits}" (len=${phoneDigits.length})`);
      const replyChatId = resolveReplyChatId(fromJid, phoneDigits);

      if (phoneDigits.length < 10) {
        console.log(`[whatsapp/webhook] Ignored: phone too short (${phoneDigits.length})`);
        return NextResponse.json({ ignored: true, reason: 'phone too short' });
      }

      const supabase = createAdminClient();

      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name, phone')
        .or(`phone.ilike.%${phoneDigits.slice(-10)}%,phone.ilike.%${phoneDigits.slice(-11)}%`)
        .limit(5);

      console.log(`[whatsapp/webhook] Found ${drivers?.length ?? 0} drivers for phone ${phoneDigits}`);

      const driver = drivers?.find((d) => {
        const dPhone = (d.phone || '').replace(/\D/g, '');
        return dPhone === phoneDigits || dPhone.endsWith(phoneDigits.slice(-10)) || dPhone.endsWith(phoneDigits.slice(-11));
      });

      console.log(`[whatsapp/webhook] Matched driver: ${driver ? driver.name : 'NONE'}`);

      if (!driver) {
        return NextResponse.json({ ignored: true, reason: 'driver not found', phoneDigits });
      }

      if (expectedStates.length === 0) {
        console.log(`[whatsapp/webhook] Mensagem ignorada: comando sem estado esperado (${normalizedChoice})`);
        return NextResponse.json({ ignored: true, reason: 'no expected state', choice: normalizedChoice });
      }

      const { data: osList } = await supabase
        .from('ordens_servico')
        .select('id, status_operacional, motorista, veiculo_id, driver_whatsapp_state, protocolo, os_number')
        .eq('motorista', driver.name)
        .in('driver_whatsapp_state', expectedStates)
        .order('updated_at', { ascending: false })
        .limit(1);

      console.log(`[whatsapp/webhook] Found ${osList?.length ?? 0} OS for driver ${driver.name}`);

      const os = osList?.[0];

      if (!os || !os.driver_whatsapp_state) {
        console.log(`[whatsapp/webhook] Ignored: no OS in expected states for driver ${driver.name}`);
        return NextResponse.json({ ignored: true, reason: 'no os in expected state', driver: driver.name, expectedStates });
      }

      console.log(`[whatsapp/webhook] Processing OS ${os.id} state=${os.driver_whatsapp_state} choice="${normalizedChoice}"`);
      const now = new Date().toISOString();
      const fmtKm = (n: number) => n.toLocaleString('pt-BR');

      if (os.driver_whatsapp_state === 'awaiting_accept') {
        if (normalizedChoice === '1') {
          const { error: acceptError } = await supabase.from('ordens_servico').update({
            status_operacional: 'Aguardando',
            driver_accepted_at: now,
            driver_whatsapp_state: 'awaiting_start',
            updated_at: now,
          }).eq('id', os.id);

          if (acceptError) {
            console.error('[whatsapp/webhook] Error updating accept state:', acceptError);
            return NextResponse.json({ error: 'accept update failed' }, { status: 500 });
          }

          await sendBotReply(replyChatId, '✅ *Serviço aceito com sucesso!*\n\nQuando for iniciar a rota, digite: *INICIAR*');
          return NextResponse.json({ success: true, action: 'accept', osId: os.id });
        }

        if (normalizedChoice === '0') {
          const { error: rejectError } = await supabase.from('ordens_servico').update({
            status_operacional: 'Cancelado',
            driver_whatsapp_state: null,
            updated_at: now,
          }).eq('id', os.id);

          if (rejectError) {
            console.error('[whatsapp/webhook] Error updating reject state:', rejectError);
            return NextResponse.json({ error: 'reject update failed' }, { status: 500 });
          }

          await sendBotReply(replyChatId, '❌ *Serviço recusado.*');
          return NextResponse.json({ success: true, action: 'reject', osId: os.id });
        }

        await sendBotReply(replyChatId, '⚠️ Digite *1* para aceitar ou *0* para recusar.');
        return NextResponse.json({ ignored: true, reason: 'invalid choice' });
      }

      if (os.driver_whatsapp_state === 'awaiting_start') {
        if (normalizedChoice === 'iniciar') {
          let vehicleText = '';
          if (os.veiculo_id) {
            const { data: v } = await supabase
              .from('veiculos')
              .select('marca, modelo, placa')
              .eq('id', os.veiculo_id)
              .single();
            if (v) vehicleText = `\n🚘 *Veículo:* ${v.marca} ${v.modelo}\n📝 *Placa:* ${v.placa}`;
          }

          const { error: startPromptError } = await supabase.from('ordens_servico').update({
            driver_whatsapp_state: 'awaiting_km_start',
            updated_at: now,
          }).eq('id', os.id);

          if (startPromptError) {
            console.error('[whatsapp/webhook] Error updating start prompt state:', startPromptError);
            return NextResponse.json({ error: 'start prompt update failed' }, { status: 500 });
          }

          await sendBotReply(replyChatId, `🚦 *Iniciar Rota*${vehicleText}\n\n📋 *Protocolo:* ${os.protocolo || os.os_number || 'Não informado'}\n\nDigite a *quilometragem inicial* do veículo:`);
          return NextResponse.json({ success: true, action: 'start_prompt', osId: os.id });
        }

        await sendBotReply(replyChatId, '⚠️ Digite *INICIAR* quando for começar a rota.');
        return NextResponse.json({ ignored: true, reason: 'expected iniciar' });
      }

      if (os.driver_whatsapp_state === 'awaiting_km_start') {
        const km = Number(selectedText.replace(/\D/g, ''));
        if (Number.isFinite(km) && km >= 0 && selectedText.replace(/\D/g, '').length > 0) {
          const { error: kmStartError } = await supabase.from('ordens_servico').update({
            status_operacional: 'Em Rota',
            route_started_at: now,
            route_started_km: km,
            driver_whatsapp_state: 'awaiting_finish',
            updated_at: now,
          }).eq('id', os.id);

          if (kmStartError) {
            console.error('[whatsapp/webhook] Error updating route start km:', kmStartError);
            return NextResponse.json({ error: 'route start update failed' }, { status: 500 });
          }

          await sendBotReply(replyChatId, `✅ *Rota iniciada!*\n\nKM inicial: *${fmtKm(km)}*\n\nAo finalizar a viagem, digite: *FINALIZAR*`);
          return NextResponse.json({ success: true, action: 'route_started', osId: os.id, km });
        }

        await sendBotReply(replyChatId, '⚠️ Informe apenas *números* para a quilometragem inicial.');
        return NextResponse.json({ ignored: true, reason: 'expected numeric km_start' });
      }

      if (os.driver_whatsapp_state === 'awaiting_finish') {
        if (normalizedChoice === 'finalizar') {
          const { error: finishPromptError } = await supabase.from('ordens_servico').update({
            driver_whatsapp_state: 'awaiting_km_finish',
            updated_at: now,
          }).eq('id', os.id);

          if (finishPromptError) {
            console.error('[whatsapp/webhook] Error updating finish prompt state:', finishPromptError);
            return NextResponse.json({ error: 'finish prompt update failed' }, { status: 500 });
          }

          await sendBotReply(replyChatId, `🏁 *Finalizar Viagem*\n\n📋 *Protocolo:* ${os.protocolo || os.os_number || 'Não informado'}\n\nDigite a *quilometragem final* do veículo:`);
          return NextResponse.json({ success: true, action: 'finish_prompt', osId: os.id });
        }

        await sendBotReply(replyChatId, '⚠️ Digite *FINALIZAR* para encerrar a viagem.');
        return NextResponse.json({ ignored: true, reason: 'expected finalizar' });
      }

      if (os.driver_whatsapp_state === 'awaiting_km_finish') {
        const km = Number(selectedText.replace(/\D/g, ''));
        if (Number.isFinite(km) && km >= 0 && selectedText.replace(/\D/g, '').length > 0) {
          const { data: currentOs } = await supabase
            .from('ordens_servico')
            .select('route_started_km')
            .eq('id', os.id)
            .single();

          const startKm = currentOs?.route_started_km ?? 0;
          const diff = km - startKm;

          const { error: finishError } = await supabase.from('ordens_servico').update({
            status_operacional: 'Concluído',
            route_finished_at: now,
            route_finished_km: km,
            driver_whatsapp_state: 'completed',
            updated_at: now,
          }).eq('id', os.id);

          if (finishError) {
            console.error('[whatsapp/webhook] Error finishing route:', finishError);
            return NextResponse.json({ error: 'route finish update failed' }, { status: 500 });
          }

          const diffText = diff > 0 ? `\n📏 *KM percorrido:* ${fmtKm(diff)}` : '';
          await sendBotReply(
            replyChatId,
            `✅ *Serviço finalizado com sucesso!*${diffText}\n\nKM final: *${fmtKm(km)}*\n\n🌟 *Portal Geolog agradece seus serviços!*\nSua dedicação faz toda a diferença. 🤝🚗\n\nAté a próxima! �`
          );
          return NextResponse.json({ success: true, action: 'route_finished', osId: os.id, km });
        }

        await sendBotReply(replyChatId, '⚠️ Informe apenas *números* para a quilometragem final.');
        return NextResponse.json({ ignored: true, reason: 'expected numeric km_finish' });
      }

      return NextResponse.json({ ignored: true, reason: 'unhandled driver state', state: os.driver_whatsapp_state });
    }

    if (event !== 'session.status' && event !== 'connection.update') {
      const isKnownChoice = body.event === 'message' || body.event === 'message.any';
      if (!isKnownChoice) {
        return NextResponse.json({ ignored: true, event });
      }
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
