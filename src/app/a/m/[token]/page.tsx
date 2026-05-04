import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface PageProps {
  params: { token: string };
}

export default async function DriverShortLinkPage({ params }: PageProps): Promise<null> {
  const { token } = params;
  const supabase = createAdminClient();

  // 1. Tentar resolver como slug na tabela de shortcuts (com type='driver')
  const { data: shortcut } = await supabase
    .from('os_link_shortcuts')
    .select('os_id')
    .eq('slug', token)
    .eq('type', 'driver')
    .maybeSingle();

  if (shortcut?.os_id) {
    redirect(`/aceitar/${encodeURIComponent(shortcut.os_id)}`);
  }

  // 2. Fallback: pode ser o UUID da OS direto
  redirect(`/aceitar/${encodeURIComponent(token)}`);
}
