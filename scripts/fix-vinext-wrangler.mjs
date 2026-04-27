import { writeFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distClient = path.join(root, 'dist/client');
const distServer = path.join(root, 'dist/server');

async function main() {
  if (!existsSync(distClient) || !existsSync(distServer)) {
    console.error('[fix-vinext] dist/client ou dist/server não encontrado. Rode vinext build primeiro.');
    process.exit(1);
  }

  // 1. Bundlar dist/server/index.js (+ ssr/ + assets) em um único _worker.js
  //    O Cloudflare Pages exige um _worker.js autocontido — sem imports relativos externos.
  console.log('[fix-vinext] Bundlando servidor para _worker.js...');
  await build({
    entryPoints: [path.join(distServer, 'index.js')],
    bundle: true,
    outfile: path.join(distClient, '_worker.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    conditions: ['workerd', 'worker', 'browser'],
    // Manter módulos Node.js como externos (resolvidos via nodejs_compat)
    external: [
      'node:async_hooks',
      'node:buffer',
      'node:crypto',
      'node:events',
      'node:fs',
      'node:http',
      'node:https',
      'node:net',
      'node:os',
      'node:path',
      'node:process',
      'node:stream',
      'node:string_decoder',
      'node:url',
      'node:util',
      'node:zlib',
      'node:perf_hooks',
    ],
    minify: false,
    logLevel: 'warning',
  });
  console.log('[fix-vinext] _worker.js bundlado com sucesso.');

  // 2. Limpar ssr/ que não deve ficar no output final
  const ssrDir = path.join(distClient, 'ssr');
  if (existsSync(ssrDir)) {
    await rm(ssrDir, { recursive: true, force: true });
  }

  // 3. Escrever wrangler.json mínimo e válido para Cloudflare Pages
  const cleanConfig = {
    name: 'portalgeolog-web',
    compatibility_date: '2025-03-31',
    compatibility_flags: ['nodejs_compat'],
    pages_build_output_dir: '.',
    triggers: { crons: [] },
  };
  await writeFile(
    path.join(distClient, 'wrangler.json'),
    `${JSON.stringify(cleanConfig, null, 2)}\n`,
    'utf8'
  );
  console.log('[fix-vinext] wrangler.json gerado para Pages.');
}

await main();
