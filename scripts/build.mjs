import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
// Only the generated dist directory may be replaced by this build.
if (relative(root, output) !== 'dist') throw new Error('Invalid build output path');
for (const name of ['index.html', 'src']) {
  await stat(resolve(root, name));
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const files = ['index.html', 'styles.css', 'src', 'assets', 'favicon.svg', '.nojekyll'];
for (const name of files) {
  try {
    await stat(resolve(root, name));
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
console.log('Built static site in dist/ — no dependencies, bundler, or API keys required.');
