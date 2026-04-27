import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const publicEnvDefines = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  );

  return {
    define: publicEnvDefines,
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
