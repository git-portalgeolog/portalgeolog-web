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

interface AliasPageProps {
  params: { token: string };
}

export default async function ShortAcceptAliasPage({ params }: AliasPageProps): Promise<null> {
  const { token } = params;

  // Se o token parece UUID, redireciona direto
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  if (isUUID) {
    redirect(`/aceitar/${encodeURIComponent(token)}`);
  }

  // Tenta resolver slug curto na tabela
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('os_link_shortcuts')
    .select('os_id')
    .eq('slug', token)
    .single();

  if (data?.os_id) {
    redirect(`/aceitar/${encodeURIComponent(data.os_id)}`);
  }

  // Fallback: redireciona como UUID mesmo assim
  redirect(`/aceitar/${encodeURIComponent(token)}`);
}
