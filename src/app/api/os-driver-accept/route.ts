import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('os_id');
    const preview = searchParams.get('preview') === '1';

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
      .from('ordens_servico')
      .select('id, status_operacional, motorista, veiculo_id, protocolo, os_number, trecho, data, hora')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    if (!preview) {
      return NextResponse.json(
        { success: false, error: 'Use o formulário para aceitar a viagem.' },
        { status: 405 }
      );
    }

    let vehicle = null;
    if (os.veiculo_id) {
      const { data: v } = await getAdmin()
        .from('veiculos')
        .select('marca, modelo, placa')
        .eq('id', os.veiculo_id)
        .single();
      vehicle = v;
    }

    const alreadyAccepted = os.status_operacional !== 'Pendente' && os.status_operacional !== 'Cancelado';

    return NextResponse.json({
      success: true,
      preview: true,
      os,
      vehicle,
      alreadyAccepted,
      message: alreadyAccepted ? 'Viagem já aceita pelo motorista anteriormente.' : undefined,
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-driver-accept preview:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { os_id?: string; km_initial?: number };
    const osId = body.os_id;
    const kmInitial = body.km_initial;

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }
    if (typeof kmInitial !== 'number' || kmInitial < 0 || !Number.isFinite(kmInitial)) {
      return NextResponse.json({ success: false, error: 'Quilometragem inicial inválida.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
      .from('ordens_servico')
      .select('id, status_operacional, motorista')
      .eq('id', osId)
      .single();

    console.log('[os-driver-accept] OS encontrada:', os?.id, 'motorista:', os?.motorista, 'status:', os?.status_operacional);

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    if (os.status_operacional !== 'Pendente' && os.status_operacional !== 'Cancelado') {
      return NextResponse.json({ success: true, alreadyAccepted: true, message: 'Viagem já aceita pelo motorista anteriormente.' });
    }

    const { error: updateError } = await getAdmin()
      .from('ordens_servico')
      .update({
        status_operacional: 'Aguardando',
        driver_accepted_at: new Date().toISOString(),
        driver_km_initial: kmInitial,
      })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao registrar aceite do motorista.' },
        { status: 500 }
      );
    }

    let messageSent = false;
    try {
      if (os.motorista) {
        const motoristaNormalized = normalizeName(os.motorista);

        const { data: driverCandidates, error: driverError } = await getAdmin()
          .from('drivers')
          .select('name, phone')
          .ilike('name', `%${escapeLikePattern(os.motorista.trim())}%`)
          .limit(10);

        const matchedDriver =
          driverCandidates?.find((candidate) => normalizeName(candidate.name || '') === motoristaNormalized) ||
          driverCandidates?.find((candidate) => normalizeName(candidate.name || '').includes(motoristaNormalized));

        const driverPhone = matchedDriver?.phone?.trim();

        console.log('[os-driver-accept] Driver lookup:', {
          name: os.motorista,
          matchedName: matchedDriver?.name,
          phone: driverPhone,
          candidates: driverCandidates?.length || 0,
          error: driverError?.message,
        });

        if (driverPhone) {
          const startRouteLink = `https://portalgeolog.com.br/iniciar-rota/${osId}`;

          const acceptMessage =
            `✅ *Viagem aceita!*\n\n` +
            `Obrigado.\n\n` +
            `Quando for iniciar a rota, clique aqui:\n` +
            `${startRouteLink}`;

          console.log('[os-driver-accept] Enviando msg para', driverPhone);
          await sendWhatsAppMessage(driverPhone, acceptMessage);
          messageSent = true;
          console.log('[os-driver-accept] Msg enviada');
        } else {
          console.warn('[os-driver-accept] Telefone do motorista não encontrado', {
            motorista: os.motorista,
            candidates: driverCandidates?.map((candidate) => candidate.name),
          });
        }
      } else {
        console.warn('[os-driver-accept] OS sem motorista definido');
      }
    } catch (notifyErr) {
      console.error('[os-driver-accept] Erro ao enviar WhatsApp:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: messageSent ? 'Viagem aceita. Mensagens enviadas ao motorista.' : 'Viagem aceita.',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-driver-accept POST:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
