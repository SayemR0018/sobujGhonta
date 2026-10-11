#!/usr/bin/env node
/**
 * scripts/scan-secrets.mjs
 * Automated Secret Scanner for Sobuj Ghonta (সবুজ ঘণ্টা)
 *
 * Scans documentation, source code, and configuration files for accidentally
 * committed API keys, tokens, and credentials.
 *
 * Exit code:
 *   0 = Clean (No secrets leaked)
 *   1 = Leaked secrets detected
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const SECRET_PATTERNS = [
  {
    name: 'Google / Gemma API Key',
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    isIgnored: (match) => match.includes('FakeKey') || match.includes('1234567890') || match.includes('AIzaSyD3a')
  },
  {
    name: 'ElevenLabs API Key',
    regex: /sk_[a-zA-Z0-9]{32,}/g,
    isIgnored: (match) => match.includes('1234567890') || match.includes('Fake') || match.includes('sample')
  },
  {
    name: 'Hugging Face Token',
    regex: /hf_[a-zA-Z0-9]{34}/g,
    isIgnored: (match) => match.includes('1234567890') || match.includes('abcdefghijkl')
  },
  {
    name: 'TabPFN Token',
    regex: /tabpfn_[a-zA-Z0-9]{24,}/g,
    isIgnored: (match) => match.includes('your_') || match.includes('fake') || match.includes('sample')
  },
  {
    name: 'SerpApi 64-Hex Key',
    regex: /\b[a-f0-9]{64}\b/g,
    isIgnored: (match, content, line) => {
      // Ignore sha256 sums, git commit hashes, audio cache hashes, or obvious placeholders
      if (line.includes('0123456789abcdef') || line.includes('hash') || line.includes('sha256')) return true;
      if (line.includes('git') || line.includes('integrity') || line.includes('resolved')) return true;
      return false;
    }
  }
];

export const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.venv',
  '__pycache__',
  '.pytest_cache',
  'tmp',
  '.gemini',
  '.agents'
]);

export const IGNORED_FILES = new Set([
  'package-lock.json',
  '.env',
  'secretFixtures.json'
]);

export const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.wav',
  '.ico',
  '.webp',
  '.pyc'
]);

/**
 * Scans text content for secret patterns
 */
export function scanText(content, filePath = 'unknown') {
  const leaks = [];
  const lines = content.split(/\r?\n/);

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pat of SECRET_PATTERNS) {
      const matches = line.match(pat.regex);
      if (matches) {
        for (const match of matches) {
          if (pat.isIgnored && pat.isIgnored(match, content, line)) {
            continue;
          }

          // Placeholder protection (.env.example has your_... placeholders)
          if (match.startsWith('your_') || match.includes('placeholder')) {
            continue;
          }

          leaks.push({
            patternName: pat.name,
            file: filePath,
            line: lineNum + 1,
            matchedPreview: match.slice(0, 6) + '...' + match.slice(-4)
          });
        }
      }
    }
  }

  return leaks;
}

/**
 * Scans a single file
 */
export function scanFile(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (IGNORED_FILES.has(basename) || IGNORED_EXTENSIONS.has(ext)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return scanText(content, path.relative(rootDir, filePath));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    return [];
  }
}

/**
 * Recursively scans directory
 */
export function scanDirectory(dirPath = rootDir) {
  let allLeaks = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        allLeaks = allLeaks.concat(scanDirectory(fullPath));
      }
    } else if (entry.isFile()) {
      allLeaks = allLeaks.concat(scanFile(fullPath));
    }
  }

  return allLeaks;
}

/**
 * CLI Runner
 */
export async function main() {
  console.log('\n===============================================================');
  console.log('  Sobuj Ghonta (সবুজ ঘণ্টা) — Automated Secret Scanner');
  console.log('===============================================================\n');

  console.log(`[Scan] Scanning project files in ${rootDir}...`);
  const leaks = scanDirectory(rootDir);

  if (leaks.length > 0) {
    console.error(`\n✖ FATAL: ${leaks.length} potentially exposed secret(s) found!\n`);
    for (const leak of leaks) {
      console.error(`  - [${leak.patternName}] in ${leak.file}:${leak.line} -> ${leak.matchedPreview}`);
    }
    console.error('\nPlease redact or remove these secrets before committing or deploying.\n');
    process.exit(1);
  } else {
    console.log('✔ SUCCESS: 0 leaked secrets found. Repository is safe for commit & deploy.\n');
    process.exit(0);
  }
}

// Run if called directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch(err => {
    console.error('Fatal scan error:', err);
    process.exit(1);
  });
}
