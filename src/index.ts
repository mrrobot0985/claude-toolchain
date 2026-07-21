#!/usr/bin/env node
import { checkDeps } from './check.js';
import { createConfigFiles } from './install.js';
import type { Tool } from './types.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const CLAUDE_VIDEO: Tool = {
  name: 'claude-video',
  description: 'Video frame extraction and analysis plugin for Claude Code',
  systemDeps: [
    {
      name: 'ffmpeg',
      description: 'Frame extraction from video files',
      checkCommand: ['ffmpeg', '-version'],
      installHint: 'sudo apt install ffmpeg',
    },
    {
      name: 'yt-dlp',
      description: 'Video downloading from YouTube and other platforms',
      checkCommand: ['yt-dlp', '--version'],
      installHint: 'pip install yt-dlp',
    },
  ],
  configFiles: [
    {
      path: '~/.config/watch/.env',
      content: '# API keys here — never commit this file\n# Example:\n# OPENAI_API_KEY=sk-...\n',
      chmod: 0o600,
    },
  ],
  pluginCommands: [
    '/plugin marketplace add bradautomates/claude-video',
    '/plugin install watch@claude-video',
  ],
};

async function main(): Promise<void> {
  const cmd = process.argv[2];

  if (cmd === '--version' || cmd === '-v') {
    console.log(`claude-toolchain v${pkg.version}`);
    return;
  }

  if (cmd === 'check') {
    console.log(`=== Checking ${CLAUDE_VIDEO.name} ===\n`);
    const results = await checkDeps(CLAUDE_VIDEO.systemDeps);
    for (const r of results) {
      const dep = CLAUDE_VIDEO.systemDeps.find((d) => d.name === r.name)!;
      if (r.available) {
        console.log(`  ✓ ${dep.name} — ${dep.description}`);
      } else {
        console.log(`  ✗ ${dep.name} — missing (install: ${dep.installHint})`);
      }
    }
    console.log('');
    const missing = results.filter((r) => !r.available);
    if (missing.length > 0) {
      console.log(`Install missing deps, then run:\n  ${CLAUDE_VIDEO.pluginCommands.join('\n  ')}`);
    } else {
      console.log(`All deps ready. Install the plugin:\n  ${CLAUDE_VIDEO.pluginCommands.join('\n  ')}`);
    }
    return;
  }

  if (cmd === 'setup') {
    console.log(`=== Setting up ${CLAUDE_VIDEO.name} ===\n`);
    const results = await checkDeps(CLAUDE_VIDEO.systemDeps);
    const missing = results.filter((r) => !r.available);
    if (missing.length > 0) {
      console.log('Missing system dependencies:');
      for (const m of missing) {
        const dep = CLAUDE_VIDEO.systemDeps.find((d) => d.name === m.name)!;
        console.log(`  ${dep.name}: ${dep.installHint}`);
      }
      console.log('\nInstall them first, then re-run.');
      process.exit(1);
    }

    console.log('Creating config files...');
    await createConfigFiles(CLAUDE_VIDEO);
    console.log('\n=== Setup complete ===');
    console.log(`Install the plugin inside Claude Code:\n  ${CLAUDE_VIDEO.pluginCommands.join('\n  ')}`);
    return;
  }

  console.error('Usage: claude-toolchain <check|setup>');
  process.exit(1);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
