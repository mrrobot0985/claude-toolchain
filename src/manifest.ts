import type { Manifest } from './types.js';

/**
 * Declarative manifest of tools to install into the Claude environment.
 * This replaces the bash scripts and is the single source of truth.
 *
 * NOTE: MCP servers are NOT installed by this toolchain. They are ephemeral
 * stdio servers configured in ~/.claude/settings.json and launched on-demand
 * via npx -y. The devcontainer repo owns that configuration.
 */
export const MANIFEST: Manifest = {
  name: 'claude-toolchain',
  version: '0.3.0',
  tools: [
    {
      name: 'graphify',
      description: 'Knowledge graph builder for codebases',
      checkCommand: ['graphify', '--version'],
      installCommand: ['uv', 'tool', 'install', 'graphifyy'],
      uninstallCommand: ['uv', 'tool', 'uninstall', 'graphifyy'],
      postInstall: ['graphify', 'install'],
      projectFiles: [
        {
          path: '.graphifyignore',
          content: 'node_modules/\n__pycache__/\n*.pyc\n.venv/\nvenv/\n',
        },
        {
          path: '.claudeignore',
          content: 'graph.json\ngraphify-out/\n',
          appendIfExists: true,
          marker: 'graphify-out/',
        },
        {
          path: '.gitignore',
          content: '\n# graphify\ngraphify-out/cost.json\n',
          appendIfExists: true,
          marker: 'graphify-out/cost.json',
        },
      ],
    },
    {
      name: 'impeccable',
      description: 'Design system quality enforcer',
      checkCommand: ['npx', 'impeccable', '--version'],
      installCommand: ['npx', 'impeccable', 'install'],
      uninstallCommand: ['npm', 'uninstall', '-g', 'impeccable'],
      optional: true,
      projectFiles: [
        {
          path: '.gitignore',
          content: '\n# impeccable-ignore-start\n.impeccable/config.local.json\n.impeccable/hook.cache.json\n.impeccable/*.png\n.impeccable/live/sessions/\n.impeccable/live/previews/\n.impeccable/live/cache/\n# impeccable-ignore-end\n',
          appendIfExists: true,
          marker: 'impeccable-ignore-start',
        },
      ],
    },
    {
      name: 'claude-video',
      description: 'Video frame extraction and analysis plugin',
      checkCommand: ['node', '-e', "try { require('@bradautomates/claude-video'); console.log('ok') } catch { process.exit(1) }"],
      installCommand: [], // Agent-installed via /plugin
      plugin: {
        marketplaceAdd: 'bradautomates/claude-video',
        installCommand: 'watch@claude-video',
      },
    },
    {
      name: 'ponytail',
      description: 'Subagent rule injection and quality control plugin',
      checkCommand: ['node', '-e', "try { require('ponytail'); console.log('ok') } catch { process.exit(1) }"],
      installCommand: [], // Agent-installed via /plugin
      plugin: {
        marketplaceAdd: 'DietrichGebert/ponytail',
        installCommand: 'ponytail@ponytail',
      },
      env: {
        PONYTAIL_DEFAULT_MODE: 'full',
      },
    },
  ],
};
