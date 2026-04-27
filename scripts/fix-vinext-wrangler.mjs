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

  const triggers = config.triggers;
  if (!triggers || typeof triggers !== 'object' || Array.isArray(triggers)) {
    config.triggers = { crons: [] };
  } else if (!Array.isArray(triggers.crons)) {
    config.triggers = { ...triggers, crons: [] };
  }

  await writeFile(wranglerConfigPath, `${JSON.stringify(config)}\n`, 'utf8');
  console.log('[fix-vinext-wrangler] wrangler.json ajustado com triggers.crons.');
}

await main();
