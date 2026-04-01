import { createClient } from '@/lib/supabase/server'

// Configurar Edge Runtime para Cloudflare Workers
export const runtime = 'edge'

export default async function Page() {
  const supabase = await createClient()

  // This will check if the user is authenticated (using the middleware session)
  // Even if not logged in, it confirms the Supabase client is initialized.
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
      {user ? (
        <p className="text-green-500">Connected! User: {user.email}</p>
      ) : (
        <p className="text-yellow-500">Connected to Supabase, but no active session found.</p>
      )}
      <div className="p-4 bg-gray-100 rounded-lg dark:bg-gray-800">
        <p className="text-sm font-mono text-gray-500">Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      </div>
    </div>
  )
}
