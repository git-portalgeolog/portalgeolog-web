import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Injetar TODAS as variáveis de ambiente que começam com NEXT_PUBLIC_ ou WAHA_ ou SUPABASE_
  // Isso garante que todas as variáveis necessárias estejam disponíveis
  const envDefines = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) =>
        key.startsWith('NEXT_PUBLIC_') ||
        key.startsWith('WAHA_') ||
        key.startsWith('SUPABASE_') ||
        key === 'RESEND_API_KEY'
      )
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  );

  return {
    define: envDefines,
    plugins: [
      vinext(),
      tailwindcss(),
      ...(command === 'build'
        ? [
            cloudflare({
              viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
            }),
          ]
        : []),
    ],
  };
});
