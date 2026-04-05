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
          // No-op in route handlers; the session is already refreshed by middleware.
        }
      }
    }
  );
}

export async function GET(request: Request) {
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
    
    const { data: notifications, error } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(notifications || []);

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

    const { title, message, type, targetAudience } = await request.json();

    if (!title || !message || !type || !targetAudience) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Buscar todos os usuários internos (equipe Geolog)
    const { data: internalUsers, error: usersError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('tipo_usuario', 'interno')
      .neq('id', user.id); // Não enviar para o próprio usuário que fez a ação

    if (usersError) {
      throw usersError;
    }

    // Criar notificações para todos os usuários internos
    const notifications = internalUsers?.map(userId => ({
      user_id: userId.id,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await adminClient
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notificação enviada para ${notifications.length} usuários internos` 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
