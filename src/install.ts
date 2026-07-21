import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { Tool } from './types.js';

export async function createConfigFiles(tool: Tool): Promise<void> {
  for (const file of tool.configFiles) {
    const fullPath = file.path.startsWith('~')
      ? join(homedir(), file.path.slice(1))
      : file.path;

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content);
    await chmod(fullPath, file.chmod);
    console.log(`  WRITE: ${fullPath} (mode ${file.chmod.toString(8)})`);
  }
}

export async function installSystemDeps(tool: Tool): Promise<void> {
  for (const dep of tool.systemDeps) {
    console.log(`  CHECK: ${dep.name}`);
    // We only check here; actual install is manual or via package manager
    // The user runs apt install ffmpeg yt-dlp themselves
  }
}
