import { NextResponse } from 'next/server';
import { sendWhatsAppList, validateAuth, unauthorizedResponse } from '@/lib/whatsapp';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export async function POST(request: Request) {
  try {
    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const { phone, question, options, osId } = (await request.json()) as {
      phone: string;
      question: string;
      options: string[];
      osId?: string;
    };

    const result = await sendWhatsAppList(
      phone,
      'Confirmação da OS',
      question,
      'Abrir opções',
      options.map((option) => ({
        id: option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'),
        title: option,
      })),
      'Selecione uma opção'
    );

    // Se tem osId, salva o poll no banco
    if (osId && result.id) {
      const supabase = createAdminClient();
      const { error } = await supabase.from('os_driver_polls').insert({
        os_id: osId,
        poll_id: result.id,
        phone: phone.replace(/\D/g, ''),
        question,
        options,
        status: 'pending',
      });

      if (error) {
        console.error('[test-poll] Error saving poll:', error);
      }
    }

    return NextResponse.json({
      success: true,
      poll: result,
    });
  } catch (error: unknown) {
    console.error('🔥 Erro no teste de poll:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
