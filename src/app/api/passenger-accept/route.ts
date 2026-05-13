import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/meta";

export const runtime = "edge";

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

const formatTime = (value?: string | null): string => {
  if (!value) return "Não informado";
  return value.slice(0, 5);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token não informado." },
        { status: 400 },
      );
    }

    const { data: confirmation, error: findError } = await getAdmin()
      .from("os_passenger_confirmations")
      .select("id, os_id, passageiro_id, aceito, aceito_em")
      .eq("token", token)
      .single();

    if (findError || !confirmation) {
      return NextResponse.json(
        { success: false, error: "Link de confirmação inválido ou expirado." },
        { status: 404 },
      );
    }

    if (confirmation.aceito) {
      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
        message: "Viagem já confirmada anteriormente.",
      });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await getAdmin()
      .from("os_passenger_confirmations")
      .update({ aceito: true, aceito_em: now })
      .eq("id", confirmation.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Erro ao registrar confirmação." },
        { status: 500 },
      );
    }

    let messageSent = false;
    try {
      const { data: passengerData } = (await getAdmin()
        .from("passageiros")
        .select("nome_completo, celular")
        .eq("id", confirmation.passageiro_id)
        .maybeSingle()) as {
        data: { nome_completo: string; celular: string } | null;
      };

      const { data: osData } = await getAdmin()
        .from("ordens_servico")
        .select("motorista, hora")
        .eq("id", confirmation.os_id)
        .maybeSingle();

      // Busca o hora do waypoint vinculado ao passageiro (fonte mais precisa)
      let passengerWaypointHora: string | null = null;
      try {
        const { data: waypointsData } = await getAdmin()
          .from("os_waypoints")
          .select("id, hora, position")
          .eq("ordem_servico_id", confirmation.os_id)
          .order("position");

        if (waypointsData && waypointsData.length > 0) {
          const { data: wpPassengers } = await getAdmin()
            .from("os_waypoint_passengers")
            .select("waypoint_id")
            .in(
              "waypoint_id",
              waypointsData.map((w) => w.id),
            )
            .eq("passageiro_id", confirmation.passageiro_id);

          if (wpPassengers && wpPassengers.length > 0) {
            const linkedIds = new Set(
              wpPassengers.map((r: Record<string, unknown>) =>
                String(r.waypoint_id),
              ),
            );
            const firstLinked = waypointsData.find((w) => linkedIds.has(w.id));
            passengerWaypointHora = firstLinked?.hora ?? null;
          }
        }
      } catch {
        // ignora erro, cai no fallback
      }

      if (passengerData?.celular) {
        const passengerName =
          passengerData.nome_completo?.split(" ")[0] || "Passageiro";
        const driverName = osData?.motorista?.split(" ")[0] || "Motorista";
        const itineraryTime = formatTime(passengerWaypointHora ?? osData?.hora);
        const thanksMessage =
          `✅ *Confirmação recebida!*\n\n` +
          `Obrigado, *${passengerName}*! Sua viagem foi confirmada com sucesso.\n\n` +
          `🚗 *Motorista:* ${driverName}\n` +
          `⏰ *Horário:* ${itineraryTime}\n\n` +
          `Aguarde a chegada do veículo no local combinado. Qualquer alteração, entraremos em contato.\n\n` +
          `_Portal Geolog - Sua viagem, nossa prioridade._`;

        await sendWhatsAppMessage(passengerData.celular, thanksMessage);
        console.log("[passenger-accept] Mensagem WhatsApp enviada com sucesso");
        messageSent = true;
      }
    } catch (notifyErr) {
      console.error(
        "[passenger-accept] Erro ao enviar mensagem (Meta API):",
        notifyErr,
      );
    }

    return NextResponse.json({
      success: true,
      message: messageSent
        ? "Viagem confirmada com sucesso! O motorista será notificado."
        : "Viagem confirmada com sucesso!",
    });
  } catch (error: unknown) {
    console.error("🔥 Erro passenger-accept:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
