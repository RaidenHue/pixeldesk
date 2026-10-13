import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/renderer', { recursive: true });

const common = { bundle: true, logLevel: 'info', target: 'es2022' };

await build({ ...common, entryPoints: ['src/main/main.ts'], outfile: 'dist/main/main.js',
  platform: 'node', format: 'cjs', external: ['electron'] });
// Sandboxed preload must be one self-contained file that only requires 'electron'.
await build({ ...common, entryPoints: ['src/preload/preload.ts'], outfile: 'dist/preload/preload.js',
  platform: 'node', format: 'cjs', external: ['electron'] });
await build({ ...common, entryPoints: ['src/renderer/app.ts'], outfile: 'dist/renderer/app.js',
  platform: 'browser', format: 'iife' });

await cp('src/renderer/index.html', 'dist/renderer/index.html');
await cp('src/renderer/styles.css', 'dist/renderer/styles.css');
if (existsSync('assets/fonts')) await cp('assets/fonts', 'dist/renderer/fonts', { recursive: true });
