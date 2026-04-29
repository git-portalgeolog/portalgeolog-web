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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('os_id');

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
      .from('ordens_servico')
      .select('id, status_operacional, motorista, protocolo, os_number, trecho')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    const alreadyFinished = os.status_operacional === 'Finalizado';

    return NextResponse.json({
      success: true,
      os,
      alreadyFinished,
      canFinish: os.status_operacional === 'Em Rota',
      message: alreadyFinished ? 'Rota já finalizada anteriormente.' : undefined,
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-finish-route preview:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { os_id?: string; km_final?: number };
    const osId = body.os_id;
    const kmFinal = body.km_final;

    if (!osId) {
      return NextResponse.json({ success: false, error: 'ID da OS não informado.' }, { status: 400 });
    }
    if (typeof kmFinal !== 'number' || kmFinal < 0 || !Number.isFinite(kmFinal)) {
      return NextResponse.json({ success: false, error: 'Quilometragem final inválida.' }, { status: 400 });
    }

    const { data: os, error: findError } = await getAdmin()
      .from('ordens_servico')
      .select('id, status_operacional, driver_km_initial, route_started_km')
      .eq('id', osId)
      .single();

    if (findError || !os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada.' },
        { status: 404 }
      );
    }

    if (os.status_operacional === 'Finalizado') {
      return NextResponse.json({ success: true, alreadyFinished: true, message: 'Rota já finalizada anteriormente.' });
    }

    if (os.status_operacional !== 'Em Rota') {
      return NextResponse.json({ success: false, error: 'A viagem ainda não foi iniciada.' }, { status: 400 });
    }

    const startKm = os.route_started_km ?? os.driver_km_initial ?? 0;
    if (kmFinal < startKm) {
      return NextResponse.json({ success: false, error: 'A quilometragem final não pode ser menor que a inicial.' }, { status: 400 });
    }

    const { error: updateError } = await getAdmin()
      .from('ordens_servico')
      .update({
        status_operacional: 'Finalizado',
        route_finished_at: new Date().toISOString(),
        route_finished_km: kmFinal,
      })
      .eq('id', osId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao finalizar a rota.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rota finalizada! Obrigado.',
    });
  } catch (error: unknown) {
    console.error('🔥 Erro os-finish-route POST:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
