/**
 * Webhook da Meta (WhatsApp Business API)
 *
 * Recebe notificações quando o motorista clica nos botões CTA do template.
 *
 * Fluxo:
 * 1. Meta envia GET com hub.verify_token para validação do webhook
 * 2. Meta envia POST quando o usuário clica em um botão do template
 * 3. Extraímos o payload (os_id, ação) e processamos o aceite/recusa
 *
 * Configuração no Meta Business Manager:
 * - Callback URL: https://portalgeolog.com.br/api/meta-webhook
 * - Verify token: mesmo valor de META_WEBHOOK_VERIFY_TOKEN
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processDriverAccept } from "@/lib/driver-accept";
import { sendWhatsAppMessage } from "@/lib/meta";
import {
  buildPassengerDetailsMessage,
  type ItineraryGroup,
  type ItineraryStop,
} from "@/lib/os-messages";

interface OSRecord {
  id?: string;
  protocolo?: string | null;
  os_number?: string | null;
  data?: string | null;
  hora?: string | null;
  motorista?: string | null;
  cliente_id?: string | null;
  solicitante?: string | null;
  centro_custo?: string | null;
  veiculo_id?: string | null;
}

interface WaypointRecord {
  id?: string;
  label?: string | null;
  comment?: string | null;
  itinerary_index?: number;
  hora?: string | null;
  data?: string | null;
  position?: number;
}

export const runtime = "edge";

function parseDriverActionPayload(
  payload: string,
): { osId: string; cycleIndex?: number } | null {
  const [action, osId, cycleIndexRaw] = payload.split("_");

  if (action !== "accept" && action !== "reject") {
    return null;
  }

  if (!osId) {
    return null;
  }

  const cycleIndex =
    cycleIndexRaw !== undefined && cycleIndexRaw !== ""
      ? Number(cycleIndexRaw)
      : undefined;

  return {
    osId,
    ...(Number.isFinite(cycleIndex) ? { cycleIndex } : {}),
  };
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
const getAdmin = () => {
  if (!_supabaseAdmin)
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  return _supabaseAdmin;
};

function numeroParaOrdinal(n: number): string {
  const unidades = [
    "",
    "Primeiro",
    "Segundo",
    "Terceiro",
    "Quarto",
    "Quinto",
    "Sexto",
    "Sétimo",
    "Oitavo",
    "Nono",
  ];
  const especiais: Record<number, string> = {
    10: "Décimo",
    11: "Décimo Primeiro",
    12: "Décimo Segundo",
    13: "Décimo Terceiro",
    14: "Décimo Quarto",
    15: "Décimo Quinto",
    16: "Décimo Sexto",
    17: "Décimo Sétimo",
    18: "Décimo Oitavo",
    19: "Décimo Nono",
  };
  const dezenas: Record<number, string> = {
    2: "Vigésimo",
    3: "Trigésimo",
    4: "Quadragésimo",
    5: "Quinquagésimo",
    6: "Sexagésimo",
    7: "Septuagésimo",
    8: "Octogésimo",
    9: "Nonagésimo",
  };
  if (n >= 1 && n <= 9) return unidades[n];
  if (n >= 10 && n <= 19) return especiais[n] || "";
  if (n >= 20 && n <= 99) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    const dt = dezenas[d] || "";
    const ut = u > 0 ? unidades[u] : "";
    if (dt && ut) return `${dt} ${ut}`;
    return dt || ut || String(n);
  }
  if (n === 100) return "Centésimo";
  return String(n);
}

function formatDate(value?: string | null): string {
  if (!value) return "Não informado";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return value;
}

function formatTime(value?: string | null): string {
  if (!value) return "Não informado";
  return value.slice(0, 5);
}

function formatDateTime(date?: string | null, time?: string | null): string {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  if (formattedDate === "Não informado" && formattedTime === "Não informado")
    return "Não informado";
  if (formattedDate === "Não informado") return formattedTime;
  if (formattedTime === "Não informado") return formattedDate;
  return `${formattedDate} - ${formattedTime}`;
}

async function handlePassengerDetailsRequest(phone: string, contextId: string) {
  try {
    console.log("[meta-webhook] Buscando OS pelo contextId:", contextId);

    const { data: confirmation } = await getAdmin()
      .from("os_passenger_confirmations")
      .select("os_id, passageiro_id")
      .eq("template_message_id", contextId)
      .maybeSingle();

    let osId: string;

    if (confirmation) {
      osId = (confirmation as { os_id: string; passageiro_id: string | null })
        .os_id;
    } else {
      console.log(
        "[meta-webhook] Confirmação de passageiro não encontrada, tentando lookup por driver_template_message_id...",
      );
      const { data: driverOS } = await getAdmin()
        .from("ordens_servico")
        .select("id")
        .eq("driver_template_message_id", contextId)
        .maybeSingle();

      if (!driverOS) {
        console.warn(
          "[meta-webhook] Nenhum registro encontrado para contextId:",
          contextId,
        );
        return;
      }
      osId = (driverOS as { id: string }).id;
      console.log(
        "[meta-webhook] OS encontrada via driver_template_message_id:",
        osId,
      );
    }

    let osData: OSRecord | null = null;

    const [, { data: vehicleData }, { data: waypointsData }] =
      await Promise.all([
        getAdmin()
          .from("ordens_servico")
          .select(
            "protocolo, os_number, data, hora, motorista, cliente_id, solicitante, centro_custo, veiculo_id",
          )
          .eq("id", osId)
          .maybeSingle()
          .then(({ data }) => {
            osData = data as OSRecord | null;
            return { data: osData };
          }),
        getAdmin()
          .from("ordens_servico")
          .select("veiculo_id")
          .eq("id", osId)
          .maybeSingle()
          .then(async ({ data: osVehicle }) => {
            const vehicle = osVehicle as { veiculo_id?: string | null } | null;
            if (!vehicle?.veiculo_id) return { data: null };
            return getAdmin()
              .from("veiculos")
              .select("marca, modelo, placa, tipo")
              .eq("id", vehicle.veiculo_id)
              .maybeSingle();
          }),
        getAdmin()
          .from("os_waypoints")
          .select("id, label, comment, itinerary_index, hora, data, position")
          .eq("ordem_servico_id", osId)
          .order("position"),
      ]);

    const waypointIds = (waypointsData || []).map(
      (wp: Record<string, unknown>) => String(wp.id),
    );
    let paxRows: Record<string, unknown>[] = [];
    if (waypointIds.length > 0) {
      const { data: paxData } = await getAdmin()
        .from("os_waypoint_passengers")
        .select("passageiro_id, waypoint_id")
        .in("waypoint_id", waypointIds);
      paxRows = (paxData || []) as Record<string, unknown>[];
    }

    let driverPhone = "Não informado";
    const osRecord = osData as OSRecord | null;
    if (osRecord?.motorista) {
      const normalized = osRecord.motorista
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const { data: candidates } = await getAdmin()
        .from("drivers")
        .select("name, phone")
        .ilike("name", `%${osRecord.motorista.trim()}%`)
        .limit(10);
      const matched = (candidates || []).find((c: Record<string, unknown>) => {
        const n = String(c.name || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        return n === normalized || n.includes(normalized);
      });
      if (matched)
        driverPhone = String(
          (matched as { phone?: string }).phone || driverPhone,
        );
    }

    let empresa = "Não informado";
    if (osRecord?.cliente_id) {
      const { data: cliente } = await getAdmin()
        .from("clientes")
        .select("nome")
        .eq("id", osRecord.cliente_id)
        .maybeSingle();
      empresa = (cliente as { nome?: string } | null)?.nome || empresa;
    }

    const passengerIds = new Set<string>();
    (paxRows || []).forEach((row: Record<string, unknown>) => {
      const pid = String(row.passageiro_id || "");
      if (pid) passengerIds.add(pid);
    });

    const { data: passageirosData } = await getAdmin()
      .from("passageiros")
      .select("id, nome_completo, celular")
      .in("id", Array.from(passengerIds));

    const passageiros = (passageirosData || []).map(
      (p: Record<string, unknown>) => ({
        nome: String(p.nome_completo || ""),
        celular: String(p.celular || ""),
      }),
    );

    const itineraryGroups = new Map<
      number,
      { firstIndex: number; stops: ItineraryStop[] }
    >();
    (waypointsData || []).forEach((wp: Record<string, unknown>) => {
      const idx =
        typeof wp.itinerary_index === "number" ? wp.itinerary_index : 0;
      if (!itineraryGroups.has(idx)) {
        itineraryGroups.set(idx, {
          firstIndex: Number(wp.position ?? 0),
          stops: [],
        });
      }
      const group = itineraryGroups.get(idx);
      if (!group) return;
      group.stops.push({
        label: String(wp.label || "Não informado"),
        comment: wp.comment ? String(wp.comment) : null,
        isOrigin: false,
        isDestination: false,
        isPassengerAddress: false,
        dateTime:
          wp.data || wp.hora
            ? formatDateTime(String(wp.data || null), String(wp.hora || null))
            : null,
      });
      if (typeof wp.position === "number" && wp.position < group.firstIndex) {
        group.firstIndex = wp.position;
      }
    });

    const sortedGroups = Array.from(itineraryGroups.entries())
      .sort((a, b) => a[1].firstIndex - b[1].firstIndex)
      .map(([index, group]) => {
        const stops = group.stops;
        if (stops.length > 0) {
          stops[0].isOrigin = true;
          stops[stops.length - 1].isDestination = true;
        }
        const kind = index < 0 ? "return" : "itinerary";
        const ordinal = kind === "return" ? Math.abs(index) : index + 1;
        const title =
          kind === "return"
            ? `🔄 *${numeroParaOrdinal(ordinal)} Retorno*`
            : `📍 *${numeroParaOrdinal(ordinal)} Itinerário*`;
        const firstWp = (waypointsData || []).find(
          (w: Record<string, unknown>) => w.itinerary_index === index,
        ) as WaypointRecord | undefined;
        const dateTime = formatDateTime(
          String(firstWp?.data || osRecord?.data || null),
          String(firstWp?.hora || osRecord?.hora || null),
        );
        return {
          index,
          title: `${title} — ${dateTime}`,
          dateTime: undefined,
          stops,
        } as ItineraryGroup;
      });

    const message = buildPassengerDetailsMessage({
      protocolo: osRecord?.protocolo || "N/A",
      osNumber: osRecord?.os_number || null,
      fornecedor: "Geolog Transporte Executivo",
      empresa,
      solicitante: osRecord?.solicitante || null,
      motorista: osRecord?.motorista || "Não informado",
      motoristaTelefone: driverPhone,
      veiculoTipo:
        (vehicleData as { tipo?: string | null } | null)?.tipo || null,
      veiculoMarcaModelo: vehicleData
        ? `${(vehicleData as { marca?: string | null }).marca || ""} ${(vehicleData as { modelo?: string | null }).modelo || ""}`.trim()
        : null,
      veiculoPlaca:
        (vehicleData as { placa?: string | null } | null)?.placa || null,
      passageiros,
      itineraries: sortedGroups,
    });

    await sendWhatsAppMessage(phone, message);
    console.log(
      "[meta-webhook] Mensagem de detalhes enviada com sucesso para",
      phone,
    );
  } catch (err) {
    console.error("[meta-webhook] Erro ao enviar detalhes:", err);
  }
}

/**
 * GET: Verificação do webhook (Meta envia hub.mode, hub.verify_token, hub.challenge)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  console.log("[meta-webhook] GET verification:", {
    mode,
    token: token ? "***" : null,
    hasChallenge: !!challenge,
  });

  if (!verifyToken) {
    console.error("[meta-webhook] META_WEBHOOK_VERIFY_TOKEN não configurado");
    return new Response("Webhook verify token not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[meta-webhook] Webhook verificado com sucesso");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[meta-webhook] Falha na verificação:", {
    mode,
    tokenMatch: token === verifyToken,
  });
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST: Recebe notificações de eventos do WhatsApp (ex: botão clicado)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(
      "[meta-webhook] POST recebido:",
      JSON.stringify(body).slice(0, 500),
    );

    // Verificar se é uma notificação de mensagem (botão clicado)
    const entries = body?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        const value = change?.value;

        // Mensagens recebidas (inclui cliques em botões interativos)
        const messages = value?.messages || [];

        for (const message of messages) {
          const msgType = message?.type;
          const contextId = message?.context?.id; // ID da mensagem original (template)
          const phone = message?.from;

          // Verificar se é uma resposta interativa (botão clicado)
          const interactive = message?.interactive;
          if (interactive) {
            const buttonReply = interactive?.button_reply;
            if (!buttonReply) continue;

            const buttonId = buttonReply?.id;
            const buttonTitle = buttonReply?.title?.toLowerCase();

            console.log("[meta-webhook] Botão clicado:", {
              buttonId,
              buttonTitle,
              contextId,
              from: phone,
            });

            // O button_id deve conter o ID da OS e opcionalmente o índice do ciclo
            // Formato esperado: "accept_{osId}" ou "accept_{osId}_{cycleIndex}"
            const parsedAction = buttonId
              ? parseDriverActionPayload(buttonId)
              : null;

            if (buttonId?.startsWith("accept_") && parsedAction) {
              console.log(
                "[meta-webhook] Processando aceite para OS:",
                parsedAction.osId,
                "cycle_index:",
                parsedAction.cycleIndex,
              );

              const result = await processDriverAccept(
                parsedAction.osId,
                parsedAction.cycleIndex,
              );

              if (result.success) {
                console.log(
                  "[meta-webhook] Aceite processado com sucesso:",
                  result.message,
                );
              } else {
                console.error(
                  "[meta-webhook] Erro ao processar aceite:",
                  result.error,
                );
              }
            } else if (buttonId?.startsWith("reject_")) {
              const osId = buttonId.split("_")[1];
              console.log("[meta-webhook] Motorista recusou OS:", osId);
              // TODO: Implementar lógica de recusa (atualizar status para recusado)
            } else {
              // Se for o botão "Detalhes do Serviço"
              if (phone && contextId) {
                console.log(
                  "[meta-webhook] Processando solicitação de detalhes para:",
                  phone,
                );
                await handlePassengerDetailsRequest(phone, contextId);
              } else {
                console.warn(
                  "[meta-webhook] Telefone ou contextId ausente para detalhes:",
                  { phone, contextId },
                );
              }
            }
          } else if (msgType === "button") {
            // Quick reply de template: Meta envia type="button" com button.payload e button.text
            const buttonPayload = String(message?.button?.payload || "");
            console.log("[meta-webhook] Quick reply de template:", {
              buttonPayload,
              from: phone,
              contextId,
            });

            const parsedPayload = parseDriverActionPayload(buttonPayload);

            if (buttonPayload.startsWith("accept_") && parsedPayload) {
              console.log(
                "[meta-webhook] Aceite via quick reply para OS:",
                parsedPayload.osId,
                "cycle_index:",
                parsedPayload.cycleIndex,
              );
              const result = await processDriverAccept(
                parsedPayload.osId,
                parsedPayload.cycleIndex,
              );
              if (result.success) {
                console.log(
                  "[meta-webhook] Aceite processado:",
                  result.message,
                );
              } else {
                console.error(
                  "[meta-webhook] Erro ao processar aceite:",
                  result.error,
                );
              }
            } else if (buttonPayload.startsWith("reject_")) {
              const osId = buttonPayload.split("_")[1];
              console.log(
                "[meta-webhook] Motorista recusou OS via quick reply:",
                osId,
              );
              // TODO: Implementar lógica de recusa (atualizar status para recusado)
            } else if (phone && contextId) {
              console.log(
                "[meta-webhook] Detalhes via quick reply de template:",
                { phone, contextId },
              );
              await handlePassengerDetailsRequest(phone, contextId);
            }
          } else if (msgType === "text" && contextId) {
            // Fallback: mensagens de texto com context.id também disparam detalhes
            // (útil para testar via console da Meta com payload padrão "Incoming Message")
            console.log(
              "[meta-webhook] Mensagem de texto com contextId detectada, tratando como detalhes:",
              { phone, contextId },
            );
            if (phone) {
              await handlePassengerDetailsRequest(phone, contextId);
            }
          }
        }
      }
    }

    // Sempre retornar 200 para o Meta não reenviar
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[meta-webhook] Erro ao processar webhook:", error);
    // Retornar 200 mesmo em erro para evitar reenvios do Meta
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
