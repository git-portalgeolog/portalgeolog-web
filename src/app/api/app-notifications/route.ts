import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function createAdminClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op in route handlers; middleware keeps the session fresh.
        }
      }
    }
  );
}

type CreateAppNotificationBody = {
  type?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message?: string;
  targetAudience?: 'interno' | 'gestor' | 'all';
  targetUserId?: string | null;
};

export async function GET() {
  try {
    const authClient = await createAuthClient();
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single();

    const tipoUsuario = roleRow?.tipo_usuario ?? 'interno';

    const { data, error } = await adminClient
      .from('app_notifications')
      .select('*')
      .in('target_audience', [tipoUsuario, 'all'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthClient();
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = (await request.json()) as CreateAppNotificationBody;
    const type = body.type;
    const title = body.title?.trim();
    const message = body.message?.trim();
    const targetAudience = body.targetAudience ?? 'all';
    const targetUserId = body.targetUserId ?? null;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('app_notifications').insert({
      type,
      title,
      message,
      target_audience: targetAudience,
      target_user_id: targetUserId,
      empresa_id: null
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
