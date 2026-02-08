import { build } from 'esbuild';
import { execSync } from 'child_process';
import { cpSync, mkdirSync, existsSync } from 'fs';

async function buildExtension() {
  console.log('=== Building Jawad ===\n');

  // Step 1: Build sidebar React app with Vite
  console.log('[1/4] Building sidebar...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Step 2: Build background script with esbuild
  console.log('\n[2/4] Building background script...');
  await build({
    entryPoints: ['src/background/index.ts'],
    bundle: true,
    outfile: 'dist/background.js',
    format: 'iife',
    target: ['es2020'],
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  // Step 3: Build content script with esbuild
  console.log('[3/4] Building content script...');
  await build({
    entryPoints: ['src/content/index.ts'],
    bundle: true,
    outfile: 'dist/content.js',
    format: 'iife',
    target: ['es2020'],
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  // Step 4: Copy static assets
  console.log('[4/4] Copying assets...');
  cpSync('manifest.json', 'dist/manifest.json');

  if (existsSync('icons')) {
    mkdirSync('dist/icons', { recursive: true });
    cpSync('icons', 'dist/icons', { recursive: true });
  }

  console.log('\n=== Build complete! ===');
  console.log('Load dist/ folder as a temporary extension in Firefox:');
  console.log('  1. Open Firefox Developer Edition');
  console.log('  2. Go to about:debugging#/runtime/this-firefox');
  console.log('  3. Click "Load Temporary Add-on"');
  console.log('  4. Select dist/manifest.json');
  console.log('  5. Open sidebar: View > Sidebar > Jawad');
}

buildExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

