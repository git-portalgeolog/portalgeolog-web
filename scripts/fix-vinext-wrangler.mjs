import { readFile, writeFile, copyFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distClient = path.join(root, 'dist/client');
const distServer = path.join(root, 'dist/server');

async function main() {
  if (!existsSync(distClient) || !existsSync(distServer)) {
    console.error('[fix-vinext] dist/client ou dist/server não encontrado. Rode vinext build primeiro.');
    process.exit(1);
  }

  // 1. Copiar entry do Worker como _worker.js no output do Pages
  await copyFile(
    path.join(distServer, 'index.js'),
    path.join(distClient, '_worker.js')
  );
  console.log('[fix-vinext] Copiado dist/server/index.js → dist/client/_worker.js');

  // 2. Copiar manifest do servidor (importado pelo Worker)
  await copyFile(
    path.join(distServer, '__vite_rsc_assets_manifest.js'),
    path.join(distClient, '__vite_rsc_assets_manifest.js')
  );
  console.log('[fix-vinext] Copiado __vite_rsc_assets_manifest.js');

  // 3. Copiar módulo SSR completo (importado dinamicamente pelo Worker)
  const ssrDest = path.join(distClient, 'ssr');
  await cp(path.join(distServer, 'ssr'), ssrDest, { recursive: true });
  console.log('[fix-vinext] Copiado dist/server/ssr/ → dist/client/ssr/');

  // 4. Substituir wrangler.json por config mínima válida para Cloudflare Pages
  const cleanConfig = {
    name: 'portalgeolog-web',
    compatibility_date: '2025-03-31',
    compatibility_flags: ['nodejs_compat'],
    pages_build_output_dir: 'dist/client',
    triggers: { crons: [] },
  };
  await writeFile(
    path.join(distClient, 'wrangler.json'),
    `${JSON.stringify(cleanConfig, null, 2)}\n`,
    'utf8'
  );
  console.log('[fix-vinext] wrangler.json substituído por config limpa para Pages.');
}

await main();
