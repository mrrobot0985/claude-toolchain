import { spawn } from 'node:child_process';
import type { SystemDep } from './types.js';

export async function isAvailable(command: string, args: string[] = ['--version']): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'ignore', shell: false });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

export async function checkDeps(deps: SystemDep[]): Promise<{ name: string; available: boolean }[]> {
  return Promise.all(
    deps.map(async (dep) => ({
      name: dep.name,
      available: await isAvailable(dep.checkCommand[0], dep.checkCommand.slice(1)),
    }))
  );
}
