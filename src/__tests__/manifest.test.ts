import { describe, it, expect } from 'vitest';
import { MANIFEST } from '../manifest.js';

describe('MANIFEST', () => {
  it('has name and version', () => {
    expect(MANIFEST.name).toBe('claude-toolchain');
    expect(MANIFEST.version).toBe('0.2.1');
  });

  it('does not include MCP servers', () => {
    const names = MANIFEST.tools.map((t) => t.name);
    expect(names).not.toContain('mcp-server-github');
    expect(names).not.toContain('mcp-server-filesystem');
  });

  it('has graphify with postInstall', () => {
    const graphify = MANIFEST.tools.find((t) => t.name === 'graphify');
    expect(graphify).toBeDefined();
    expect(graphify!.postInstall).toEqual(['graphify', 'install']);
    expect(graphify!.installCommand).toEqual(['uv', 'tool', 'install', 'graphifyy']);
    expect(graphify!.optional).toBeUndefined();
  });

  it('marks impeccable as optional', () => {
    const impeccable = MANIFEST.tools.find((t) => t.name === 'impeccable');
    expect(impeccable).toBeDefined();
    expect(impeccable!.optional).toBe(true);
  });

  it('has 4 tools total', () => {
    expect(MANIFEST.tools).toHaveLength(4);
  });

  it('marks plugin-only tools with empty installCommand', () => {
    const plugins = MANIFEST.tools.filter((t) => t.plugin);
    expect(plugins).toHaveLength(2);
    for (const p of plugins) {
      expect(p.installCommand).toEqual([]);
    }
  });

  it('has graphify project files', () => {
    const graphify = MANIFEST.tools.find((t) => t.name === 'graphify')!;
    expect(graphify.projectFiles).toHaveLength(3);
    const paths = graphify.projectFiles!.map((f) => f.path);
    expect(paths).toContain('.graphifyignore');
    expect(paths).toContain('.claudeignore');
    expect(paths).toContain('.gitignore');
  });
});
