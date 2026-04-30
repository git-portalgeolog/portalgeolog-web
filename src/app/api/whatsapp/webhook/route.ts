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

async function sendBotReply(chatId: string, text: string): Promise<void> {
  if (!WAHA_API_URL || !WAHA_API_KEY) {
    console.error('[whatsapp/webhook] WAHA não configurada para enviar respostas');
    return;
  }
  try {
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
      console.error('[whatsapp/webhook] Erro ao enviar resposta do bot:', response.status);
    }
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

    // Processa mensagens de texto do motorista (fluxo por respostas)
    if (event === 'message' || event === 'message.any') {
      const messagePayload = body.payload as {
        id?: string;
        from?: string;
        body?: string;
        replyTo?: { id?: string | null } | null;
      } | null;

      const selectedText = (messagePayload?.body || '').trim();
      const fromJid = messagePayload?.from || '';
      const replyToId = messagePayload?.replyTo?.id || null;
      const normalizedChoice = selectedText.toLowerCase();

      const supabase = createAdminClient();

      // --- NOVO FLUXO: respostas de texto (1/0, INICIAR, FINALIZAR, números) ---
      if (fromJid) {
        const phoneDigits = fromJid.replace(/\D/g, '').replace(/@.*$/, '');

        if (phoneDigits.length >= 10) {
          // Busca motorista pelo telefone (comparação flexível)
          const { data: drivers } = await supabase
            .from('drivers')
            .select('id, name, phone')
            .or(`phone.ilike.%${phoneDigits.slice(-10)}%,phone.ilike.%${phoneDigits.slice(-11)}%`)
            .limit(5);

          const driver = drivers?.find((d) => {
            const dPhone = (d.phone || '').replace(/\D/g, '');
            return dPhone === phoneDigits || dPhone.endsWith(phoneDigits.slice(-10)) || dPhone.endsWith(phoneDigits.slice(-11));
          });

          if (driver) {
            // Busca OS mais recente do motorista com driver_whatsapp_state ativo
            const { data: osList } = await supabase
              .from('ordens_servico')
              .select('id, status_operacional, motorista, veiculo_id, driver_whatsapp_state, protocolo, os_number, trecho')
              .eq('motorista', driver.name)
              .not('driver_whatsapp_state', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1);

            const os = osList?.[0];

            if (os && os.driver_whatsapp_state) {
              const now = new Date().toISOString();

              // Helper para formatar KM
              const fmtKm = (n: number) => n.toLocaleString('pt-BR');

              // --- ESTADO: aguardando aceite (1 ou 0) ---
              if (os.driver_whatsapp_state === 'awaiting_accept') {
                if (normalizedChoice === '1') {
                  await supabase.from('ordens_servico').update({
                    status_operacional: 'Aguardando',
                    driver_accepted_at: now,
                    driver_whatsapp_state: 'awaiting_start',
                    updated_at: now,
                  }).eq('id', os.id);

                  await sendBotReply(fromJid, '✅ *Aceite registrado!*\n\nQuando for iniciar a rota, digite: *INICIAR*');
                  return NextResponse.json({ success: true, action: 'accept', osId: os.id });
                }
                if (normalizedChoice === '0') {
                  await supabase.from('ordens_servico').update({
                    status_operacional: 'Cancelado',
                    driver_whatsapp_state: null,
                    updated_at: now,
                  }).eq('id', os.id);

                  await sendBotReply(fromJid, '❌ *Serviço recusado.*');
                  return NextResponse.json({ success: true, action: 'reject', osId: os.id });
                }
                await sendBotReply(fromJid, '⚠️ Digite *1* para aceitar ou *0* para recusar.');
                return NextResponse.json({ ignored: true, reason: 'invalid choice' });
              }

              // --- ESTADO: aguardando INICIAR ---
              if (os.driver_whatsapp_state === 'awaiting_start') {
                if (normalizedChoice === 'iniciar') {
                  // Busca veículo para confirmar
                  let vehicleText = '';
                  if (os.veiculo_id) {
                    const { data: v } = await supabase
                      .from('veiculos')
                      .select('marca, modelo, placa')
                      .eq('id', os.veiculo_id)
                      .single();
                    if (v) vehicleText = `\n🚘 *Veículo:* ${v.marca} ${v.modelo}\n📝 *Placa:* ${v.placa}`;
                  }

                  await supabase.from('ordens_servico').update({
                    driver_whatsapp_state: 'awaiting_km_start',
                    updated_at: now,
                  }).eq('id', os.id);

                  await sendBotReply(fromJid, `🚦 *Iniciar Rota*${vehicleText}\n\nDigite a *quilometragem inicial* do veículo:`);
                  return NextResponse.json({ success: true, action: 'start_prompt', osId: os.id });
                }
                await sendBotReply(fromJid, '⚠️ Digite *INICIAR* quando for começar a rota.');
                return NextResponse.json({ ignored: true, reason: 'expected iniciar' });
              }

              // --- ESTADO: aguardando KM inicial ---
              if (os.driver_whatsapp_state === 'awaiting_km_start') {
                const km = Number(selectedText.replace(/\D/g, ''));
                if (Number.isFinite(km) && km >= 0 && selectedText.replace(/\D/g, '').length > 0) {
                  await supabase.from('ordens_servico').update({
                    status_operacional: 'Em Rota',
                    route_started_at: now,
                    route_started_km: km,
                    driver_whatsapp_state: 'awaiting_finish',
                    updated_at: now,
                  }).eq('id', os.id);

                  await sendBotReply(fromJid, `✅ *Rota iniciada!*\n\nKM inicial: *${fmtKm(km)}*\n\nAo finalizar a viagem, digite: *FINALIZAR*`);
                  return NextResponse.json({ success: true, action: 'route_started', osId: os.id, km });
                }
                await sendBotReply(fromJid, '⚠️ Informe apenas *números* para a quilometragem inicial.');
                return NextResponse.json({ ignored: true, reason: 'expected numeric km_start' });
              }

              // --- ESTADO: aguardando FINALIZAR ---
              if (os.driver_whatsapp_state === 'awaiting_finish') {
                if (normalizedChoice === 'finalizar') {
                  await supabase.from('ordens_servico').update({
                    driver_whatsapp_state: 'awaiting_km_finish',
                    updated_at: now,
                  }).eq('id', os.id);

                  await sendBotReply(fromJid, '🏁 *Finalizar Viagem*\n\nDigite a *quilometragem final* do veículo:');
                  return NextResponse.json({ success: true, action: 'finish_prompt', osId: os.id });
                }
                await sendBotReply(fromJid, '⚠️ Digite *FINALIZAR* para encerrar a viagem.');
                return NextResponse.json({ ignored: true, reason: 'expected finalizar' });
              }

              // --- ESTADO: aguardando KM final ---
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

                  await supabase.from('ordens_servico').update({
                    status_operacional: 'Concluído',
                    route_finished_at: now,
                    route_finished_km: km,
                    driver_whatsapp_state: 'completed',
                    updated_at: now,
                  }).eq('id', os.id);

                  const diffText = diff > 0 ? `\n📏 *KM percorrido:* ${fmtKm(diff)}` : '';
                  await sendBotReply(fromJid, `✅ *OS finalizada com sucesso!*${diffText}\n\nKM final: *${fmtKm(km)}*\n\nObrigado! 🙏`);
                  return NextResponse.json({ success: true, action: 'route_finished', osId: os.id, km });
                }
                await sendBotReply(fromJid, '⚠️ Informe apenas *números* para a quilometragem final.');
                return NextResponse.json({ ignored: true, reason: 'expected numeric km_finish' });
              }
            }
          }
        }
      }

      // --- FALLBACK: lógica antiga de lista interativa ---
      const isKnownChoice = normalizedChoice === 'aceitar' || normalizedChoice === 'recusar';
      if (!isKnownChoice || !replyToId) {
        return NextResponse.json({ ignored: true, reason: 'not a recognized command' });
      }

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

      await supabase.from('os_driver_polls').update({
        status: 'voted',
        voted_option: selectedText,
        voted_at: now,
        updated_at: now,
      }).eq('id', listRecord.id);

      const operationalStatus = normalizedChoice === 'aceitar' ? 'Aguardando' : 'Cancelado';

      await supabase.from('ordens_servico').update({
        status_operacional: operationalStatus,
        updated_at: now,
      }).eq('id', listRecord.os_id);

      return NextResponse.json({ success: true, choice: selectedText, osId: listRecord.os_id, operationalStatus });
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
