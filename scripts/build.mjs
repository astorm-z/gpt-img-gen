import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(distDir, 'assets');

const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'src', 'styles.css');
const jsPath = path.join(root, 'src', 'main.js');
const runtimeConfigPath = path.join(root, 'app.config.json');
const runtimeConfigExamplePath = path.join(root, 'app.config.example.json');

await rm(distDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

const [htmlSource, cssSource, jsSource] = await Promise.all([
  readFile(htmlPath, 'utf8'),
  readFile(cssPath, 'utf8'),
  readFile(jsPath, 'utf8')
]);

const cssOutput = minifyCss(cssSource);
const jsOutput = await minifyJs(jsSource);

const cssFileName = `${hashContent(cssOutput)}.css`;
const jsFileName = `${hashContent(jsOutput)}.js`;

await Promise.all([
  writeFile(path.join(assetsDir, cssFileName), cssOutput, 'utf8'),
  writeFile(path.join(assetsDir, jsFileName), jsOutput, 'utf8')
]);

const distHtml = htmlSource
  .replace(
    /\s*<link rel="stylesheet" href="\/src\/styles\.css">\s*/,
    `\n  <link rel="stylesheet" href="./assets/${cssFileName}">\n`
  )
  .replace(
    /<script src="\/src\/main\.js" defer><\/script>/,
    `<script src="./assets/${jsFileName}" defer></script>`
  );

await writeFile(path.join(distDir, 'index.html'), distHtml, 'utf8');
await copyRuntimeConfig();

console.log(`built dist/index.html`);
console.log(`built dist/assets/${cssFileName} (${formatBytes(cssOutput.length)})`);
console.log(`built dist/assets/${jsFileName} (${formatBytes(jsOutput.length)})`);

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

async function copyRuntimeConfig() {
  const sourcePath = await pathExists(runtimeConfigPath) ? runtimeConfigPath : runtimeConfigExamplePath;
  if (!await pathExists(sourcePath)) return;

  const configOutput = await readFile(sourcePath, 'utf8');
  await writeFile(path.join(distDir, 'app.config.json'), configOutput, 'utf8');
  console.log(`built dist/app.config.json`);
}

async function pathExists(filePath) {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function minifyJs(source) {
  const terserOutput = await tryTerserMinify(source);
  if (terserOutput) return terserOutput;

  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
    .join('\n');
}

async function tryTerserMinify(source) {
  try {
    const { minify } = await import('terser');
    const result = await minify(source, {
      compress: {
        passes: 2,
        toplevel: true
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    });
    return result.code || '';
  } catch {
    return '';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
