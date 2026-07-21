import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Tool } from '../types.js';

// Mock child_process before importing runner
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  appendFile: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { access, readFile, appendFile, writeFile } from 'node:fs/promises';
import { isInstalled, installTool, applyProjectFiles, applyEnv } from '../runner.js';

function mockSpawn(exitCode: number | null = 0, error?: Error) {
  const proc = new EventEmitter();
  (proc as any).stdout = new EventEmitter();
  (proc as any).stderr = new EventEmitter();

  vi.mocked(spawn).mockImplementation(() => {
    if (error) {
      setImmediate(() => proc.emit('error', error));
    } else {
      setImmediate(() => proc.emit('close', exitCode));
    }
    return proc as any;
  });
}

const dummyTool: Tool = {
  name: 'dummy',
  description: 'a dummy tool',
  checkCommand: ['dummy', '--version'],
  installCommand: ['npm', 'install', '-g', 'dummy'],
  postInstall: ['dummy', 'init'],
};

describe('isInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when checkCommand exits 0', async () => {
    mockSpawn(0);
    const result = await isInstalled(dummyTool);
    expect(result).toBe(true);
  });

  it('returns false when checkCommand exits non-zero', async () => {
    mockSpawn(1);
    const result = await isInstalled(dummyTool);
    expect(result).toBe(false);
  });

  it('returns false when spawn errors', async () => {
    mockSpawn(null, new Error('ENOENT'));
    const result = await isInstalled(dummyTool);
    expect(result).toBe(false);
  });
});

describe('installTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs install command and post-install', async () => {
    let callCount = 0;
    vi.mocked(spawn).mockImplementation(() => {
      const proc = new EventEmitter();
      (proc as any).stdout = new EventEmitter();
      (proc as any).stderr = new EventEmitter();
      setImmediate(() => proc.emit('close', 0));
      callCount++;
      return proc as any;
    });

    await installTool(dummyTool);
    expect(callCount).toBe(2); // install + postInstall
  });

  it('throws when install exits non-zero', async () => {
    mockSpawn(1);
    await expect(installTool(dummyTool)).rejects.toThrow('exited with code 1');
  });

  it('skips plugin-only tools', async () => {
    const pluginTool: Tool = { ...dummyTool, installCommand: [], plugin: { marketplaceAdd: 'test/test', installCommand: 'test@test' } };
    await installTool(pluginTool);
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('applyProjectFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('writes file when it does not exist', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(writeFile).mockResolvedValue(undefined);

    const tool: Tool = {
      ...dummyTool,
      projectFiles: [{ path: '.testignore', content: 'test/' }],
    };

    await applyProjectFiles(tool);
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.testignore'),
      'test/'
    );
  });

  it('appends when file exists and marker not found', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue('existing content');
    vi.mocked(appendFile).mockResolvedValue(undefined);

    const tool: Tool = {
      ...dummyTool,
      projectFiles: [
        { path: '.testignore', content: '\nnew/', appendIfExists: true, marker: 'new/' },
      ],
    };

    await applyProjectFiles(tool);
    expect(appendFile).toHaveBeenCalledWith(
      expect.stringContaining('.testignore'),
      '\nnew/'
    );
  });

  it('skips append when marker already present', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue('already has new/ marker');
    vi.mocked(appendFile).mockResolvedValue(undefined);

    const tool: Tool = {
      ...dummyTool,
      projectFiles: [
        { path: '.testignore', content: '\nnew/', appendIfExists: true, marker: 'new/' },
      ],
    };

    await applyProjectFiles(tool);
    expect(appendFile).not.toHaveBeenCalled();
  });
});

describe('applyEnv', () => {
  it('logs env vars without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tool: Tool = {
      ...dummyTool,
      env: { TEST_KEY: 'test_value' },
    };

    await applyEnv(tool);
    expect(consoleSpy).toHaveBeenCalledWith('  ENV: export TEST_KEY=test_value');
    consoleSpy.mockRestore();
  });
});
