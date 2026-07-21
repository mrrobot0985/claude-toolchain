#!/usr/bin/env node
import { checkDeps, isAvailable } from './check.js';
import { createConfigFiles } from './install.js';
import type { Tool, SystemDep } from './types.js';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

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
      autoInstall: ['sudo', 'apt', 'install', '-y', 'ffmpeg'],
    },
    {
      name: 'yt-dlp',
      description: 'Video downloading from YouTube and other platforms',
      checkCommand: ['yt-dlp', '--version'],
      installHint: 'pip install yt-dlp',
      autoInstall: ['pip', 'install', '--user', 'yt-dlp'],
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

async function installSystemDep(dep: SystemDep): Promise<boolean> {
  if (!dep.autoInstall) return false;

  const [cmd, ...args] = dep.autoInstall;
  console.log(`  INSTALL: ${dep.name} (${cmd} ${args.join(' ')})`);

  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: false });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

async function installPlugin(tool: Tool): Promise<boolean> {
  const claudeAvailable = await isAvailable('claude', ['--version']);
  if (!claudeAvailable) {
    console.log('  SKIP: claude CLI not found — install plugin manually');
    return false;
  }

  console.log('  Installing plugin via Claude CLI...');
  for (const command of tool.pluginCommands) {
    const args = command.replace(/^\//, '').split(' ');
    const output = await new Promise<{ ok: boolean; stdout: string }>((resolve) => {
      let stdout = '';
      const proc = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
      proc.stdout?.on('data', (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on('data', (d) => {
        stdout += d.toString();
      });
      proc.on('error', () => resolve({ ok: false, stdout }));
      proc.on('close', (code) => resolve({ ok: code === 0, stdout }));
    });
    if (!output.ok) {
      console.log(`  Plugin command failed: ${command}`);
      console.log(`  Output: ${output.stdout.trim()}`);
      return false;
    }
  }
  return true;
}

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
      console.log(`Install missing deps, then run:\n  claude-toolchain setup`);
    } else {
      console.log(`All deps ready. Run:\n  claude-toolchain setup`);
    }
    return;
  }

  if (cmd === 'setup') {
    console.log(`=== Setting up ${CLAUDE_VIDEO.name} ===\n`);
    const results = await checkDeps(CLAUDE_VIDEO.systemDeps);
    const missing = results.filter((r) => !r.available);

    if (missing.length > 0) {
      console.log(`Missing ${missing.length} system dependency(ies). Attempting auto-install...\n`);
      for (const m of missing) {
        const dep = CLAUDE_VIDEO.systemDeps.find((d) => d.name === m.name)!;
        const ok = await installSystemDep(dep);
        if (!ok) {
          console.log(`\nAuto-install failed for ${dep.name}. Install manually:\n  ${dep.installHint}`);
          process.exit(1);
        }
      }
      console.log('');
    }

    // Re-check after installation
    const recheck = await checkDeps(CLAUDE_VIDEO.systemDeps);
    const stillMissing = recheck.filter((r) => !r.available);
    if (stillMissing.length > 0) {
      console.log('Still missing after auto-install:');
      for (const m of stillMissing) {
        const dep = CLAUDE_VIDEO.systemDeps.find((d) => d.name === m.name)!;
        console.log(`  ${dep.name}: ${dep.installHint}`);
      }
      process.exit(1);
    }

    console.log('Creating config files...');
    await createConfigFiles(CLAUDE_VIDEO);

    console.log('\nInstalling plugin...');
    const pluginOk = await installPlugin(CLAUDE_VIDEO);
    if (pluginOk) {
      console.log('\n=== Setup complete — plugin installed ===');
    } else {
      console.log('\n=== Setup complete ===');
      console.log(`Install the plugin manually inside Claude Code:\n  ${CLAUDE_VIDEO.pluginCommands.join('\n  ')}`);
    }
    return;
  }

  console.error('Usage: claude-toolchain <check|setup>');
  process.exit(1);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
