import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Tool } from '../types.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { checkTool, printStatus } from '../status.js';

function mockSpawnStdout(stdout: string, exitCode: number | null = 0, error?: Error) {
  const proc = new EventEmitter();
  (proc as any).stdout = new EventEmitter();
  (proc as any).stderr = new EventEmitter();

  vi.mocked(spawn).mockImplementation(() => {
    if (error) {
      setImmediate(() => proc.emit('error', error));
    } else {
      setImmediate(() => {
        (proc as any).stdout.emit('data', Buffer.from(stdout));
        proc.emit('close', exitCode);
      });
    }
    return proc as any;
  });
}

const dummyTool: Tool = {
  name: 'dummy',
  description: 'a dummy tool',
  checkCommand: ['dummy', '--version'],
  installCommand: [],
};

describe('checkTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns installed=true with version on exit 0', async () => {
    mockSpawnStdout('1.2.3\n', 0);
    const result = await checkTool(dummyTool);
    expect(result).toEqual({
      name: 'dummy',
      installed: true,
      optional: undefined,
      version: '1.2.3',
    });
  });

  it('returns installed=false on non-zero exit', async () => {
    mockSpawnStdout('', 1);
    const result = await checkTool(dummyTool);
    expect(result.installed).toBe(false);
    expect(result.version).toBeUndefined();
  });

  it('returns installed=false on spawn error', async () => {
    mockSpawnStdout('', null, new Error('ENOENT'));
    const result = await checkTool(dummyTool);
    expect(result.installed).toBe(false);
  });

  it('preserves optional flag', async () => {
    mockSpawnStdout('1.0.0\n', 0);
    const result = await checkTool({ ...dummyTool, optional: true });
    expect(result.optional).toBe(true);
  });
});

describe('printStatus', () => {
  it('prints summary without throwing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printStatus([
      { name: 'graphify', installed: true, version: '0.9.22' },
      { name: 'impeccable', installed: true, optional: true, version: '2.3.2' },
      { name: 'claude-video', installed: false },
    ]);

    // Should print header, installed, missing, and footer
    const calls = spy.mock.calls.map((c) => c[0] as string);
    expect(calls.some((c) => c.includes('graphify'))).toBe(true);
    expect(calls.some((c) => c.includes('impeccable'))).toBe(true);
    expect(calls.some((c) => c.includes('claude-video'))).toBe(true);
    expect(calls.some((c) => c.includes('2/3 tools ready'))).toBe(true);

    spy.mockRestore();
  });
});
