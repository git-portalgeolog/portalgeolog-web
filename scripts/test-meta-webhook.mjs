/**
 * Teste automatizado de envio de template Meta WhatsApp + webhook de botão
 * Envia template "appointment_scheduling" para um número de teste e simula
 * o clique no botão "Detalhes do Serviço" para validar o fluxo end-to-end.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env" });

const TEST_PHONE = "5522992495653";
const OS_ID = "5e8c567b-9b8b-4411-9cb1-952f2973ee5a";
const PASSAGEIRO_ID = "0b0c5051-df31-4edc-9e6b-9209f1e479ba";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

const log = (label, data) =>
  console.log(
    `\n[${label}]`,
    typeof data === "object" ? JSON.stringify(data, null, 2) : data,
  );
const error = (label, data) =>
  console.error(
    `\n[${label}]`,
    typeof data === "object" ? JSON.stringify(data, null, 2) : data,
  );

async function sendTemplate() {
  if (!META_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error(
      "META_WHATSAPP_ACCESS_TOKEN ou META_PHONE_NUMBER_ID ausentes no .env",
    );
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: TEST_PHONE,
    type: "template",
    template: {
      name: "appointment_scheduling",
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: "Motorista Teste" }],
        },
      ],
    },
  };

  log("SEND", { url, phone: TEST_PHONE, template: "appointment_scheduling" });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${META_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    error("META ERROR", { status: res.status, data });
    throw new Error(data.error?.message || "Erro ao enviar template");
  }

  const messageId = data.messages?.[0]?.id;
  log("META OK", { messageId, data });
  return messageId;
}

async function saveConfirmation(messageId) {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Variáveis do Supabase ausentes");
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Upsert: se já existir token para esse os+passageiro, atualiza; senão, cria novo
  const newToken = crypto.randomUUID();
  const { data: existing } = await admin
    .from("os_passenger_confirmations")
    .select("id, token")
    .eq("os_id", OS_ID)
    .eq("passageiro_id", PASSAGEIRO_ID)
    .maybeSingle();

  let token;
  if (existing) {
    token = existing.token;
    const { error: upErr } = await admin
      .from("os_passenger_confirmations")
      .update({ template_message_id: messageId })
      .eq("token", token);
    if (upErr) throw upErr;
    log("DB UPDATE", { token, messageId });
  } else {
    token = newToken;
    const { error: insErr } = await admin
      .from("os_passenger_confirmations")
      .insert({
        os_id: OS_ID,
        passageiro_id: PASSAGEIRO_ID,
        token,
        template_message_id: messageId,
      });
    if (insErr) throw insErr;
    log("DB INSERT", { token, messageId });
  }

  return token;
}

async function simulateWebhook(messageId) {
  const webhookPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "BUSINESS_TEST",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "55" + TEST_PHONE.slice(2),
                phone_number_id: PHONE_NUMBER_ID,
              },
              contacts: [
                {
                  profile: { name: "Teste Webhook" },
                  wa_id: TEST_PHONE,
                },
              ],
              messages: [
                {
                  id: "msg_test_" + Date.now(),
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  from: TEST_PHONE,
                  type: "interactive",
                  interactive: {
                    type: "button_reply",
                    button_reply: {
                      id: "details_request",
                      title: "Detalhes do Serviço",
                    },
                  },
                  context: {
                    id: messageId,
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  log("WEBHOOK SIMULATION", webhookPayload);

  // Tenta chamar o webhook localmente (se dev server estiver rodando)
  const localUrl = "http://localhost:3000/api/meta-webhook";
  try {
    const res = await fetch(localUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });
    const data = await res.json();
    log("WEBHOOK LOCAL", { status: res.status, data });
  } catch (err) {
    error("WEBHOOK LOCAL", err.message);
    log(
      "TIP",
      "Servidor local não está rodando. Use o payload acima para testar via curl ou console da Meta.",
    );
  }

  // Também tenta na URL de produção
  const prodUrl = "https://portalgeolog.com.br/api/meta-webhook";
  try {
    const res = await fetch(prodUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });
    const data = await res.json();
    log("WEBHOOK PROD", { status: res.status, data });
  } catch (err) {
    error("WEBHOOK PROD", err.message);
  }
}

async function main() {
  console.log("🚀 Iniciando teste automatizado Meta WhatsApp Webhook");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    log("CONFIG", {
      phone: TEST_PHONE,
      osId: OS_ID,
      passageiroId: PASSAGEIRO_ID,
      hasMetaToken: !!META_TOKEN,
      hasPhoneId: !!PHONE_NUMBER_ID,
    });

    const messageId = await sendTemplate();
    const token = await saveConfirmation(messageId);

    console.log("\n⏳ Aguardando 3s antes de simular o webhook...");
    await new Promise((r) => setTimeout(r, 3000));

    await simulateWebhook(messageId);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Teste concluído!");
    console.log(`📱 Número de teste: +${TEST_PHONE}`);
    console.log(`📨 Message ID: ${messageId}`);
    console.log(`🔗 Token de confirmação: ${token}`);
    console.log(
      '\n💡 Agora clique no botão "Detalhes do Serviço" no WhatsApp do número de teste.',
    );
    console.log("   O webhook real da Meta deve chegar em /api/meta-webhook");
  } catch (err) {
    error("FATAL", err.message);
    process.exit(1);
  }
}

main();
