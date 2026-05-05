import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitResponse,
  sendWhatsAppMessage,
  unauthorizedResponse,
  validateAuth,
} from '@/lib/whatsapp';
import { buildPassengerNotificationMessage } from '@/lib/os-messages';

export const runtime = 'edge';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
const getAdmin = () => {
  if (!_supabaseAdmin) _supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return _supabaseAdmin;
};

function numeroParaOrdinal(n: number): string {
  const unidades = ['', 'Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto', 'Sexto', 'Sétimo', 'Oitavo', 'Nono'];
  const especiais: Record<number, string> = {
    10: 'Décimo', 11: 'Décimo Primeiro', 12: 'Décimo Segundo', 13: 'Décimo Terceiro',
    14: 'Décimo Quarto', 15: 'Décimo Quinto', 16: 'Décimo Sexto', 17: 'Décimo Sétimo',
    18: 'Décimo Oitavo', 19: 'Décimo Nono',
  };
  const dezenas: Record<number, string> = {
    2: 'Vigésimo', 3: 'Trigésimo', 4: 'Quadragésimo', 5: 'Quinquagésimo',
    6: 'Sexagésimo', 7: 'Septuagésimo', 8: 'Octogésimo', 9: 'Nonagésimo',
  };
  if (n >= 1 && n <= 9) return unidades[n];
  if (n >= 10 && n <= 19) return especiais[n] || '';
  if (n >= 20 && n <= 99) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    const dt = dezenas[d] || '';
    const ut = u > 0 ? unidades[u] : '';
    if (dt && ut) return `${dt} ${ut}`;
    return dt || ut || String(n);
  }
  if (n === 100) return 'Centésimo';
  return String(n);
}

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
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

    const body = await request.json();
    console.log('[notify-passenger] body:', JSON.stringify(body));
    const { type, passengerEmail, passengerPhone, passengerName, osProtocol, osId, passageiroId, acceptUrl } = body;

    const results: { email?: boolean; whatsapp?: boolean } = {};

    const formatDate = (value?: string | null): string => {
      if (!value) return 'Não informado';
      if (value.includes('/')) return value;
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return value;
    };

    const formatTime = (value?: string | null): string => {
      if (!value) return 'Não informado';
      return value.slice(0, 5);
    };

    const formatDateTime = (date?: string | null, time?: string | null): string => {
      const formattedDate = formatDate(date);
      const formattedTime = formatTime(time);
      if (formattedDate === 'Não informado' && formattedTime === 'Não informado') {
        return 'Não informado';
      }
      if (formattedDate === 'Não informado') {
        return formattedTime;
      }
      if (formattedTime === 'Não informado') {
        return formattedDate;
      }
      return `${formattedDate} - ${formattedTime}`;
    };

    const buildVehicleLabel = (vehicle: { marca?: string | null; modelo?: string | null } | null): string => {
      if (!vehicle) return 'Não informado';
      const parts = [vehicle.marca, vehicle.modelo].filter(Boolean).map(String);
      return parts.length > 0 ? parts.join(' ') : 'Não informado';
    };

    const normalizeName = (value: string): string => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

    let token: string | undefined;

    if (osId && passageiroId) {
      const { data: existing, error: existingError } = await getAdmin()
        .from('os_passenger_confirmations')
        .select('id, token')
        .eq('os_id', osId)
        .eq('passageiro_id', passageiroId)
        .single();

      console.log('[notify-passenger] existing token lookup:', existing, existingError);

      if (existing) {
        token = (existing as { id: string; token: string }).token;
      } else {
        const newToken = crypto.randomUUID(); // Usar UUID padrão
        const confirmationInsert: { os_id: string; passageiro_id: string; token: string } = {
          os_id: osId,
          passageiro_id: passageiroId,
          token: newToken,
        };
        const { data: inserted, error: insertError } = await getAdmin()
          .from('os_passenger_confirmations')
          .insert(confirmationInsert)
          .select('token')
          .single();
        console.log('[notify-passenger] inserted token:', inserted, insertError);
        if (inserted) token = (inserted as { token: string }).token;
      }
    }

    let shortSlug = token;
    if (token) {
      try {
        const { data: existingShortcut } = await getAdmin()
          .from('os_link_shortcuts')
          .select('slug')
          .eq('os_id', token)
          .eq('type', 'passenger')
          .maybeSingle();

        if (existingShortcut) {
          shortSlug = (existingShortcut as { slug: string }).slug;
        } else {
          const newSlug = Math.random().toString(36).slice(2, 17);
          const shortcutInsert: { os_id: string; slug: string; type: 'passenger' } = {
            os_id: token,
            slug: newSlug,
            type: 'passenger',
          };
          const { data: insertedShortcut } = await getAdmin()
            .from('os_link_shortcuts')
            .insert(shortcutInsert)
            .select('slug')
            .maybeSingle();

          if (insertedShortcut) {
            shortSlug = (insertedShortcut as { slug: string }).slug;
          }
        }
      } catch {
        shortSlug = token;
      }
    }

    const confirmationLink = shortSlug && acceptUrl
      ? `${acceptUrl}/${shortSlug}`
      : undefined;
    console.log('[notify-passenger] confirmationLink:', confirmationLink);

    let driverName = 'Não informado';
    let driverPhone = 'Não informado';
    let vehicleLabel = 'Não informado';
    let vehiclePlate = 'Não informado';
    let passengerAddress = 'Não informado';
    let itinerarySummary = 'Não informado';

    if (osId) {
      const [{ data: osData }, { data: passengerData }, { data: vehicleData }, { data: waypointsData }] = await Promise.all([
        getAdmin()
          .from('ordens_servico')
          .select('id, motorista, veiculo_id, data, hora, protocolo, os_number')
          .eq('id', osId)
          .maybeSingle(),
        passageiroId
          ? getAdmin()
            .from('passageiros')
            .select('id, nome_completo, celular, passageiro_enderecos(id, rotulo, endereco_completo, referencia)')
            .eq('id', passageiroId)
            .maybeSingle()
          : Promise.resolve({ data: null }),
        getAdmin()
          .from('ordens_servico')
          .select('veiculo_id')
          .eq('id', osId)
          .maybeSingle()
          .then(async ({ data: osVehicle }) => {
            if (!osVehicle?.veiculo_id) return { data: null };
            return getAdmin()
              .from('veiculos')
              .select('marca, modelo, placa')
              .eq('id', osVehicle.veiculo_id)
              .maybeSingle();
          }),
        getAdmin()
          .from('os_waypoints')
          .select('id, label, comment, itinerary_index, hora, data, position')
          .eq('ordem_servico_id', osId)
          .order('position'),
      ]);

      if (osData?.motorista) {
        driverName = osData.motorista;
        const motoristaNormalized = normalizeName(osData.motorista);

        const { data: driverCandidates } = await getAdmin()
          .from('drivers')
          .select('name, phone')
          .ilike('name', `%${escapeLikePattern(osData.motorista.trim())}%`)
          .limit(10);

        const matchedDriver =
          driverCandidates?.find((candidate) => normalizeName(candidate.name || '') === motoristaNormalized) ||
          driverCandidates?.find((candidate) => normalizeName(candidate.name || '').includes(motoristaNormalized));

        if (matchedDriver) {
          driverName = matchedDriver.name || driverName;
          driverPhone = matchedDriver.phone || driverPhone;
        }
      }

      if (vehicleData) {
        vehicleLabel = buildVehicleLabel(vehicleData as { marca?: string | null; modelo?: string | null } | null);
        vehiclePlate = (vehicleData as { placa?: string | null }).placa || 'Não informado';
      }

      const passengerAddresses = ((passengerData as {
        passageiro_enderecos?: Array<{ rotulo?: string | null; endereco_completo?: string | null; referencia?: string | null }>;
      } | null)?.passageiro_enderecos || [])
        .map((address) => {
          const label = address.rotulo ? `${address.rotulo}: ` : '';
          const reference = address.referencia ? ` (${address.referencia})` : '';
          return `${label}${address.endereco_completo || 'Não informado'}${reference}`;
        })
        .filter(Boolean);

      if (passengerAddresses.length > 0) {
        passengerAddress = passengerAddresses[0];
      }

      const passengerWaypointIds = new Set<string>();
      if (passageiroId && waypointsData && waypointsData.length > 0) {
        const { data: wpPassengers } = await getAdmin()
          .from('os_waypoints_passageiros')
          .select('waypoint_id')
          .in('waypoint_id', waypointsData.map((wp) => wp.id))
          .eq('passageiro_id', passageiroId);

        (wpPassengers || []).forEach((row: Record<string, unknown>) => {
          const id = String(row.waypoint_id || '');
          if (id) passengerWaypointIds.add(id);
        });
      }

      const waypointItineraryMap = new Map<string, number>();
      const itineraryGroups = new Map<number, { firstIndex: number; waypoints: Array<{ id: string; label?: string | null; data?: string | null; hora?: string | null }> }>();
      (waypointsData || []).forEach((waypoint) => {
        const itineraryIndex = typeof waypoint.itinerary_index === 'number' ? waypoint.itinerary_index : 0;
        waypointItineraryMap.set(waypoint.id, itineraryIndex);
        if (!itineraryGroups.has(itineraryIndex)) {
          itineraryGroups.set(itineraryIndex, { firstIndex: waypoint.position ?? 0, waypoints: [] });
        }
        const group = itineraryGroups.get(itineraryIndex);
        if (!group) return;
        group.waypoints.push({ id: waypoint.id, label: waypoint.label, data: waypoint.data, hora: waypoint.hora });
        if (typeof waypoint.position === 'number' && waypoint.position < group.firstIndex) {
          group.firstIndex = waypoint.position;
        }
      });

      const passengerItineraryIndices = new Set<number>();
      passengerWaypointIds.forEach((wpId) => {
        const idx = waypointItineraryMap.get(wpId);
        if (typeof idx === 'number') passengerItineraryIndices.add(idx);
      });

      const filteredGroups = Array.from(itineraryGroups.entries())
        .filter(([index]) => passengerItineraryIndices.has(index))
        .sort((a, b) => a[1].firstIndex - b[1].firstIndex);

      const itineraryLines: string[] = [];
      filteredGroups.forEach(([index, group]) => {
        const title = index < 0
          ? `🔄 *${numeroParaOrdinal(Math.abs(index))} Retorno*`
          : `� *${numeroParaOrdinal(index + 1)} Itinerário*`;
        const firstWaypoint = group.waypoints[0];
        const dateTime = formatDateTime(firstWaypoint?.data || osData?.data || null, firstWaypoint?.hora || osData?.hora || null);
        itineraryLines.push('────────────────');
        itineraryLines.push(`${title} — ${dateTime}`);

        group.waypoints.forEach((wp, wpIndex) => {
          const prefix = wpIndex === 0 ? '▶️ Origem' : wpIndex === group.waypoints.length - 1 ? '🏁 Destino final' : `⏹️ Parada ${wpIndex}`;
          const wpDateTime = wp.data || wp.hora ? ` (${formatDateTime(wp.data, wp.hora)})` : '';
          const marker = passengerWaypointIds.has(wp.id) ? ' 📍 (seu endereço)' : '';
          itineraryLines.push(`   ${prefix}: ${wp.label || 'Não informado'}${wpDateTime}${marker}`);
        });

        itineraryLines.push('');
      });

      if (itineraryLines.length > 0) {
        itinerarySummary = itineraryLines.join('\n');
      } else if (itineraryGroups.size > 0) {
        itinerarySummary = 'Itinerário geral disponível. Consulte o link para detalhes completos.';
      }
    }

    if ((type === 'whatsapp' || type === 'both') && !confirmationLink) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível gerar o link de confirmação do passageiro.',
          results,
          token,
        },
        { status: 400, headers: getRateLimitHeaders(request) }
      );
    }

    if ((type === 'email' || type === 'both') && passengerEmail) {
      const resend = createResendClient();
      if (resend) {
        await resend.emails.send({
          from: 'Portal Geolog <suporte@portalgeolog.com.br>',
          to: passengerEmail,
          subject: `Revise os dados da sua viagem - ${osProtocol || 'N/A'}`,
          html: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Portal Geolog</h2>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.5;">Olá, <strong>${passengerName || 'Passageiro'}</strong>!</p>
              <p style="font-size: 16px; line-height: 1.5;">Para garantir sua reserva e nos ajudar na organização do trajeto, pedimos que revise os dados da viagem antes de confirmar.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin: 20px 0; font-size: 14px; line-height: 1.6;">
                <p style="margin: 0 0 8px 0;"><strong>Motorista:</strong> ${driverName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Contato:</strong> ${driverPhone}</p>
                <p style="margin: 0 0 8px 0;"><strong>Veículo:</strong> ${vehicleLabel}</p>
                <p style="margin: 0 0 8px 0;"><strong>Placa:</strong> ${vehiclePlate}</p>
                <p style="margin: 0 0 8px 0;"><strong>Seu endereço:</strong> ${passengerAddress}</p>
                <p style="margin: 0;"><strong>Itinerários:</strong><br>${String(itinerarySummary).replace(/\n/g, '<br>')}</p>
              </div>
              <p style="font-size: 16px; line-height: 1.5;">Clique no botão abaixo para revisar e confirmar sua viagem:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${confirmationLink || '#'}" style="display: inline-block; background-color: #16a34a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Revisar dados da viagem</a>
              </div>
              <p style="font-size: 12px; color: #64748b; text-align: center;">Se o botão não funcionar, copie e cole este link:<br>${confirmationLink || 'N/A'}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #64748b;">
              Portal Geolog - Sistema de Gestão de Transporte
            </div>
          </div>`,
        });
        results.email = true;
      }
    }

    if ((type === 'whatsapp' || type === 'both') && passengerPhone) {
      let cleanPhone = passengerPhone.replace(/\D/g, '');
      if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
      }

      const text = buildPassengerNotificationMessage({
        passengerName: passengerName || null,
        osProtocol: osProtocol || null,
        driverName,
        driverPhone,
        vehicleLabel,
        vehiclePlate,
        passengerAddress,
        itinerarySummary,
        confirmationLink: confirmationLink || '',
      });

      console.log('[notify-passenger] sending WhatsApp to', passengerPhone, 'text length', text.length);

      try {
        await sendWhatsAppMessage(passengerPhone, text);
        results.whatsapp = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ Erro WAHA:', msg);
        results.whatsapp = false;
        return NextResponse.json(
          { success: false, error: msg, results, token },
          { status: 502, headers: getRateLimitHeaders(request) }
        );
      }
    }

    return NextResponse.json({ success: true, results, token }, { headers: getRateLimitHeaders(request) });
  } catch (error: unknown) {
    console.error('🔥 Erro Crítico notify-passenger:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: getRateLimitHeaders(request) }
    );
  }
}
