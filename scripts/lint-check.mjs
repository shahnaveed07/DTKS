import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function walkFiles(dir, extensions, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, results);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

async function runLint() {
  const sourceFiles = [
    ...walkFiles(path.join(ROOT_DIR, 'src'), ['.js', '.jsx']),
    ...walkFiles(path.join(ROOT_DIR, 'scripts'), ['.js', '.mjs']),
  ];

  const errors = [];

  for (const filePath of sourceFiles) {
    const relPath = path.relative(ROOT_DIR, filePath);
    const code = fs.readFileSync(filePath, 'utf8');
    const isJsx = filePath.endsWith('.jsx');
    const isTestFile = filePath.endsWith('.test.js');

    try {
      await esbuild.transform(code, {
        loader: isJsx ? 'jsx' : 'js',
        jsx: 'automatic',
        sourcefile: relPath,
        format: 'esm',
        target: 'es2022',
      });
    } catch (err) {
      errors.push(`[Syntax/JSX Error] ${relPath}: ${err.message}`);
    }

    // Disallow blocking browser dialogs in application source
    if (relPath.startsWith('src/') && !isTestFile) {
      if (/\bwindow\.(alert|confirm|prompt)\s*\(/.test(code)) {
        errors.push(`[Forbidden Dialog API] ${relPath}: Avoid window.alert/confirm/prompt.`);
      }
      if (/https?:\/\/dtks\.pages\.dev/i.test(code)) {
        errors.push(`[Domain Policy] ${relPath}: Contains legacy dtks.pages.dev hostname.`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('JS/JSX Lint Check failed with errors:');
    for (const err of errors) {
      console.error('  -', err);
    }
    process.exit(1);
  }

  console.log(`JS/JSX Lint Check passed (${sourceFiles.length} files verified).`);
}

runLint();
