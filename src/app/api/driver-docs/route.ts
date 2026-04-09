import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const DRIVER_DOCS_BUCKET = 'driver-docs';

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

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
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

    const formData = await request.formData();
    const driverId = String(formData.get('driverId') || '').trim();
    const file = formData.get('file');

    if (!driverId) {
      return NextResponse.json({ error: 'driverId é obrigatório' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const filePath = `${driverId}/${fileName}`;

    const { error: uploadError } = await adminClient.storage
      .from(DRIVER_DOCS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = adminClient.storage
      .from(DRIVER_DOCS_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { data: insertedDoc, error: dbError } = await adminClient
      .from('driver_documents')
      .insert({
        driver_id: driverId,
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
        path: filePath
      })
      .select('*')
      .single();

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true, document: insertedDoc, publicUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
