import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Tool, StatusResult } from './types.js';

const CHECK_TIMEOUT_MS = 10_000;

function getEnv(): NodeJS.ProcessEnv {
  const home = homedir();
  const extraPaths = [
    join(home, '.local', 'bin'),
    join(home, 'bin'),
  ];
  const currentPath = process.env.PATH || '';
  return {
    ...process.env,
    PATH: [...extraPaths, currentPath].join(':'),
  };
}

export async function checkTool(tool: Tool): Promise<StatusResult> {
  return new Promise((resolve) => {
    const [cmd, ...args] = tool.checkCommand;
    const proc = spawn(cmd, args, { stdio: 'pipe', shell: false, env: getEnv() });
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ name: tool.name, installed: false, optional: tool.optional });
    }, CHECK_TIMEOUT_MS);

    let stdout = '';
    proc.stdout?.on('data', (d) => {
      stdout += d.toString();
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      resolve({ name: tool.name, installed: false, optional: tool.optional });
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        name: tool.name,
        installed: code === 0,
        optional: tool.optional,
        version: code === 0 ? stdout.trim().split('\n')[0] : undefined,
      });
    });
  });
}

export function printStatus(results: StatusResult[]): void {
  console.log('\nToolchain status:');
  console.log('─'.repeat(50));

  const installed = results.filter((r) => r.installed);
  const missing = results.filter((r) => !r.installed);

  for (const r of installed) {
    const tag = r.optional ? ' [optional]' : '';
    console.log(`  ✓ ${r.name.padEnd(25)} ${r.version || ''}${tag}`);
  }
  for (const r of missing) {
    const tag = r.optional ? ' [optional]' : '';
    console.log(`  ✗ ${r.name.padEnd(25)} not installed${tag}`);
  }

  console.log('─'.repeat(50));
  console.log(`${installed.length}/${results.length} tools ready`);
}
