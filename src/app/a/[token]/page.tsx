import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

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

export default async function ShortAcceptAliasPage({
  params,
}: AliasPageProps): Promise<null> {
  const { token } = params;
  const supabase = createAdminClient();

  // 1. Tentar resolver como slug na tabela de shortcuts
  const shortcut = await supabase
    .from("os_link_shortcuts")
    .select("os_id, type")
    .eq("slug", token)
    .maybeSingle();

  if (shortcut.data?.os_id) {
    // Se o tipo for passageiro, o os_id na verdade é o token da confirmação
    redirect(`/aceitar/${encodeURIComponent(shortcut.data.os_id)}`);
  }

  // 2. Se não for slug, tentar ver se é um token de passageiro direto (UUID)
  const passengerConfirmation = await supabase
    .from("os_passenger_confirmations")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  if (passengerConfirmation.data?.id) {
    redirect(`/aceitar/${encodeURIComponent(token)}`);
  }

  // 3. Fallback final
  redirect(`/aceitar/${encodeURIComponent(token)}`);
}
