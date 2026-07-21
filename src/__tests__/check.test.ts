import { describe, it, expect, vi } from 'vitest';
import { isAvailable, checkDeps } from '../check.js';
import type { SystemDep } from '../types.js';

describe('isAvailable', () => {
  it('returns true for commands that exist', async () => {
    const result = await isAvailable('node', ['--version']);
    expect(result).toBe(true);
  });

  it('returns false for commands that do not exist', async () => {
    const result = await isAvailable('definitely-not-a-real-command-xyz');
    expect(result).toBe(false);
  });
});

describe('checkDeps', () => {
  it('checks all deps and returns availability', async () => {
    const deps: SystemDep[] = [
      { name: 'node', description: 'Node.js', checkCommand: ['node', '--version'], installHint: 'nvm install node' },
      { name: 'not-real', description: 'Fake', checkCommand: ['not-real-xyz'], installHint: 'none' },
    ];
    const results = await checkDeps(deps);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ name: 'node', available: true });
    expect(results[1]).toEqual({ name: 'not-real', available: false });
  });
});
