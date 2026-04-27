import { readFile, writeFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const wranglerConfigPath = new URL('../dist/client/wrangler.json', import.meta.url);

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(wranglerConfigPath))) {
    console.log('[fix-vinext-wrangler] dist/client/wrangler.json não encontrado, nada para ajustar.');
    return;
  }

  const raw = await readFile(wranglerConfigPath, 'utf8');
  const config = JSON.parse(raw);

  const unsupportedTopLevelFields = [
    'definedEnvironments',
    'ai_search_namespaces',
    'ai_search',
    'secrets_store_secrets',
    'artifacts',
    'unsafe_hello_world',
    'flagship',
    'worker_loaders',
    'ratelimits',
    'vpc_services',
    'vpc_networks',
    'python_modules',
    'assets',
  ];

  for (const field of unsupportedTopLevelFields) {
    if (field in config) {
      delete config[field];
    }
  }

  if (config.dev && typeof config.dev === 'object' && !Array.isArray(config.dev)) {
    delete config.dev.enable_containers;
    delete config.dev.generate_types;
  }

  const triggers = config.triggers;
  if (!triggers || typeof triggers !== 'object' || Array.isArray(triggers)) {
    config.triggers = { crons: [] };
  } else if (!Array.isArray(triggers.crons)) {
    config.triggers = { ...triggers, crons: [] };
  }

  await writeFile(wranglerConfigPath, `${JSON.stringify(config)}\n`, 'utf8');
  console.log('[fix-vinext-wrangler] wrangler.json ajustado para compatibilidade com Pages.');
}

await main();
