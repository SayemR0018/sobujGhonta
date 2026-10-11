#!/usr/bin/env node
/**
 * scripts/setup-keys.mjs
 * Secure Interactive CLI Key Setup for Sobuj Ghonta (সবুজ ঘণ্টা)
 *
 * Security Invariants:
 * 1. Verifies that .gitignore contains .env before writing anything.
 * 2. Prompts user with masked keystrokes (*) so keys are not visible in terminal history.
 * 3. Trims whitespace and validates key length (>= 10 chars) & provider prefixes.
 * 4. Confirms before overwriting existing .env (supports --force flag).
 * 5. Enforces restrictive file permissions: mode 0600 (owner read/write only).
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Validates a key input string
 */
export function validateKeyInput(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Empty key' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 10) {
    return { valid: false, error: 'Key too short (must be at least 10 characters)' };
  }
  return { valid: true, key: trimmed };
}

/**
 * Validates provider prefix requirements
 */
export function validateKeyPrefix(provider, key) {
  if (!key) return true;
  if (provider === 'gemma' && !key.startsWith('AIza')) return false;
  if (provider === 'elevenlabs' && !key.startsWith('sk_')) return false;
  return true;
}

/**
 * Masks input string for display
 */
export function maskInput(input) {
  if (!input) return '';
  return '*'.repeat(input.length);
}

/**
 * Determines whether .env can be written given existence and force flag
 */
export function canWriteEnv(fileExists, force = false) {
  if (fileExists && !force) return false;
  return true;
}

/**
 * Checks that .gitignore contains .env
 */
export function verifyGitignore(rootDirPath = rootDir) {
  const gitignorePath = path.join(rootDirPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    throw new Error('.gitignore file is missing in project root!');
  }
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const hasEnv = lines.some(l => l === '.env' || l === '/.env' || l.startsWith('.env'));
  if (!hasEnv) {
    throw new Error('.gitignore does not contain .env! Aborting to prevent accidental commit.');
  }
  return true;
}

function promptMasked(query) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    let input = '';
    process.stdout.write(query);

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (chunk) => {
      const char = chunk.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(input.trim());
      } else if (char === '\u007f' || char === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else {
        input += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Main interactive runner
 */
async function main() {
  const isForce = process.argv.includes('--force');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  console.log('\n===============================================================');
  console.log('  Sobuj Ghonta (সবুজ ঘণ্টা) — Secure Key Setup Wizard');
  console.log('===============================================================\n');

  // Step 1: Verify .gitignore
  try {
    verifyGitignore(rootDir);
    console.log('✔ .gitignore verification passed (.env is safely ignored).\n');
  } catch (err) {
    console.error(`✖ Security Error: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Check if .env already exists
  const envExists = fs.existsSync(envPath);
  if (envExists && !isForce) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(res => {
      rl.question('.env already exists. Overwrite? (y/N): ', a => {
        rl.close();
        res(a.trim().toLowerCase());
      });
    });

    if (answer !== 'y' && answer !== 'yes') {
      console.log('Aborted. Existing .env was preserved.');
      process.exit(0);
    }
  }

  // Read .env.example template as base
  let template = '';
  if (fs.existsSync(envExamplePath)) {
    template = fs.readFileSync(envExamplePath, 'utf8');
  }

  console.log('Enter keys below (inputs are masked with *). Press ENTER to skip any key.\n');

  const keysToCollect = [
    { key: 'GEMMA_API_KEY', label: '1. Gemma / Google AI Studio Key (starts with AIza):', provider: 'gemma' },
    { key: 'SERPAPI_API_KEY', label: '2. SerpApi API Key (64-character hex):', provider: 'serpapi' },
    { key: 'SERPER_API_KEY', label: '3. Serper.dev API Key (Alternative Search):', provider: 'serper' },
    { key: 'TABPFN_TOKEN', label: '4. Prior Labs TabPFN Token (tabpfn_...):', provider: 'tabpfn' },
    { key: 'ELEVENLABS_API_KEY', label: '5. ElevenLabs API Key (starts with sk_):', provider: 'elevenlabs' },
    { key: 'HF_TOKEN', label: '6. Hugging Face Token (Meta MMS-TTS, starts with hf_):', provider: 'hf' }
  ];

  const answers = {};

  for (const item of keysToCollect) {
    let valid = false;
    while (!valid) {
      const val = await promptMasked(`${item.label} `);
      if (!val) {
        answers[item.key] = '';
        valid = true;
        break;
      }

      const inputCheck = validateKeyInput(val);
      if (!inputCheck.valid) {
        console.log(`  ⚠ ${inputCheck.error}. Please re-enter or press Enter to skip.`);
        continue;
      }

      if (!validateKeyPrefix(item.provider, inputCheck.key)) {
        console.log(`  ⚠ Invalid prefix for ${item.provider}. Expected prefix format.`);
        continue;
      }

      answers[item.key] = inputCheck.key;
      valid = true;
    }
  }

  // Build new .env content
  let outputEnv = template;
  for (const [k, v] of Object.entries(answers)) {
    if (v) {
      const regex = new RegExp(`^${k}=.*$`, 'm');
      if (regex.test(outputEnv)) {
        outputEnv = outputEnv.replace(regex, `${k}=${v}`);
      } else {
        outputEnv += `\n${k}=${v}`;
      }
    }
  }

  // Write file with restrictive permissions (0o600)
  fs.writeFileSync(envPath, outputEnv, { mode: 0o600 });
  try {
    fs.chmodSync(envPath, 0o600);
  } catch {
    // Windows chmod fallback
  }

  console.log('\n✔ .env generated successfully with 0600 permissions (owner read/write).');
  console.log('✔ Secrets will be automatically redacted from server logs.');
  console.log('You can now start the application with: npm start or npm run dev:server\n');
}

// Run if called directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch(err => {
    console.error('Fatal setup error:', err);
    process.exit(1);
  });
}
