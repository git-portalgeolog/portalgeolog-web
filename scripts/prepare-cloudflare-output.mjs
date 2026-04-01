import { cp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const cloudflareOutputDir = path.join(projectRoot, 'cloudflare-output');

const ignoredDirectories = new Set(['node_modules', '.git', '.next']);

async function findStaticOutput(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.name === 'static' && path.basename(directory) === 'output') {
      return entryPath;
    }

    const nestedResult = await findStaticOutput(entryPath);
    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

async function main() {
  const staticOutputDir = await findStaticOutput(projectRoot);

  if (!staticOutputDir) {
    throw new Error('Could not find the generated static output directory.');
  }

  await rm(cloudflareOutputDir, { recursive: true, force: true });
  await cp(staticOutputDir, cloudflareOutputDir, { recursive: true });

  const generatedOutputRoot = path.dirname(path.dirname(staticOutputDir));
  await rm(generatedOutputRoot, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
