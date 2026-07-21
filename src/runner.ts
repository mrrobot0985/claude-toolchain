import { spawn } from 'node:child_process';
import { access, appendFile, writeFile, unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Tool } from './types.js';

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/**
 * Augment PATH with common uv/pipx tool directories so that
 * tools installed during this session are discoverable by
 * subsequent checks and post-install steps.
 */
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

export async function isInstalled(tool: Tool): Promise<boolean> {
  return new Promise((resolve) => {
    const [cmd, ...args] = tool.checkCommand;
    const proc = spawn(cmd, args, { stdio: 'ignore', shell: false, env: getEnv() });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

export async function installTool(tool: Tool): Promise<void> {
  if (tool.installCommand.length === 0) {
    console.log(`  SKIP: ${tool.name} — agent-installed plugin, run manually`);
    return;
  }

  const [cmd, ...args] = tool.installCommand;
  console.log(`  RUN: ${cmd} ${args.join(' ')}`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: false, env: getEnv() });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${tool.name} install exited with code ${code}`));
    });
  });

  if (tool.postInstall) {
    const [postCmd, ...postArgs] = tool.postInstall;
    console.log(`  POST: ${postCmd} ${postArgs.join(' ')}`);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(postCmd, postArgs, { stdio: 'inherit', shell: false, env: getEnv() });
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${tool.name} post-install exited with code ${code}`));
      });
    });
  }
}

export async function applyProjectFiles(tool: Tool): Promise<void> {
  if (!tool.projectFiles) return;

  for (const file of tool.projectFiles) {
    const fullPath = join(PROJECT_ROOT, file.path);
    const exists = await fileExists(fullPath);

    if (exists && file.appendIfExists) {
      if (file.marker) {
        const content = await readFile(fullPath);
        if (content.includes(file.marker)) {
          console.log(`  SKIP: ${file.path} already has ${tool.name} entries`);
          continue;
        }
      }
      await appendFile(fullPath, file.content);
      console.log(`  APPEND: ${file.path}`);
    } else {
      await writeFile(fullPath, file.content);
      console.log(`  WRITE: ${file.path}`);
    }
  }
}

export async function removeProjectFiles(tool: Tool): Promise<void> {
  if (!tool.projectFiles) return;

  for (const file of tool.projectFiles) {
    const fullPath = join(PROJECT_ROOT, file.path);
    const exists = await fileExists(fullPath);
    if (!exists) continue;

    if (file.appendIfExists && file.marker) {
      // Remove the appended block by reading and filtering lines
      const content = await readFile(fullPath);
      const lines = content.split('\n');
      const filtered: string[] = [];
      let inBlock = false;

      for (const line of lines) {
        // Detect start of our block
        if (line.includes(file.marker)) {
          inBlock = true;
          continue;
        }
        // Detect end marker for impeccable
        if (inBlock && line.includes('# impeccable-ignore-end')) {
          inBlock = false;
          continue;
        }
        if (!inBlock) {
          filtered.push(line);
        }
      }

      const newContent = filtered.join('\n');
      if (newContent !== content) {
        await writeFile(fullPath, newContent);
        console.log(`  CLEAN: removed ${tool.name} entries from ${file.path}`);
      }
    } else {
      // File was created by us — delete it
      await unlink(fullPath);
      console.log(`  REMOVE: ${file.path}`);
    }
  }
}

export async function uninstallTool(tool: Tool): Promise<void> {
  if (tool.plugin) {
    console.log(`  SKIP: ${tool.name} — agent-installed plugin, remove manually`);
    return;
  }

  if (!tool.uninstallCommand || tool.uninstallCommand.length === 0) {
    console.log(`  SKIP: ${tool.name} — no uninstall command defined`);
    return;
  }

  const [cmd, ...args] = tool.uninstallCommand;
  console.log(`  RUN: ${cmd} ${args.join(' ')}`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: false, env: getEnv() });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${tool.name} uninstall exited with code ${code}`));
    });
  });
}

export async function applyEnv(tool: Tool): Promise<void> {
  if (!tool.env) return;
  for (const [key, val] of Object.entries(tool.env)) {
    console.log(`  ENV: export ${key}=${val}`);
    // In a real scenario you'd write to shell profile; here we just log
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readFile(path: string): Promise<string> {
  const { readFile: rf } = await import('node:fs/promises');
  return rf(path, 'utf-8');
}
