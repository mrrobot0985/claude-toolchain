# claude-toolchain

A declarative toolchain installer for the Claude environment. Runs **after** Claude CLI is available and sets up companion packages — graphify, impeccable, and plugins.

## Scope

| Concern | Handled by devcontainer repo | Handled by this package |
|---|---|---|
| Install Claude CLI | ✓ | ✗ |
| Manage `~/.claude/settings.json` (MCP servers, etc.) | ✓ | ✗ |
| Install `~/.claude/rules/` | ✓ | ✗ |
| Install graphify CLI + register skill | ✗ | ✓ |
| Install impeccable + scaffold project | ✗ | ✓ (optional) |
| Guide plugin installation (claude-video, ponytail) | ✗ | ✓ |
| Update `.gitignore` / `.claudeignore` | ✗ | ✓ |

**Important:** MCP servers are **not** installed by this toolchain. They are ephemeral stdio servers configured in `~/.claude/settings.json` and launched on-demand via `npx -y`. The devcontainer repo owns that configuration.

## Design

Everything is **declarative** in `src/manifest.ts`:

```ts
{
  name: 'graphify',
  description: 'Knowledge graph builder for codebases',
  checkCommand: ['graphify', '--version'],
  installCommand: ['uv', 'tool', 'install', 'graphifyy'],
  postInstall: ['graphify', 'install'],
  projectFiles: [
    { path: '.graphifyignore', content: '...' },
    { path: '.gitignore', content: '\n# graphify\n...', appendIfExists: true, marker: 'graphify' },
  ],
}
```

| Field | Purpose |
|---|---|
| `checkCommand` | How to verify if already installed |
| `installCommand` | How to install (npm global, npx, uv tool, etc.) |
| `postInstall` | Skill registration or init steps |
| `projectFiles` | Workspace-level file mutations |
| `plugin` | Agent-installed tools (prints `/plugin` commands) |
| `optional` | Skipped by default; use `--include-optional` |

## Usage

```bash
# Build
npm install
npm run build

# See what's installed
node dist/cli.js status

# Interactive setup (pick which tools to install)
node dist/cli.js setup

# Non-interactive: install required tools only
node dist/cli.js setup --non-interactive

# Non-interactive: install everything including optional tools
node dist/cli.js setup --non-interactive --include-optional

# Interactive uninstall (pick which tools to remove)
node dist/cli.js uninstall

# Non-interactive uninstall
node dist/cli.js uninstall --non-interactive
```

### Interactive menu

Inspired by [mattpocock/skills](https://github.com/mattpocock/skills), `setup` without flags launches an interactive checkbox menu:

```
Claude Toolchain — Select tools to install:

> [x] graphify
    Knowledge graph builder for codebases

  [ ] impeccable
    Design system quality enforcer (optional)

> [x] claude-video
    Video frame extraction and analysis plugin [plugin]

> [x] ponytail
    Subagent rule injection and quality control plugin [plugin]

  ↑↓ navigate  SPACE toggle  ENTER confirm  a toggle all
```

Navigate with arrow keys, toggle items with spacebar, press **a** to toggle all, **enter** to confirm.

## Tools managed

| Tool | Required | Install method | Post-install |
|---|---|---|---|
| graphify | Yes | `uv tool install graphifyy` | `graphify install` |
| impeccable | **No** | `npx impeccable install` | — |
| claude-video | Plugin | `/plugin marketplace add bradautomates/claude-video` | `/plugin install watch@claude-video` |
| ponytail | Plugin | `/plugin marketplace add DietrichGebert/ponytail` | `/plugin install ponytail@ponytail` |

## Why TypeScript?

- **Declarative manifest** beats bash scripts with hardcoded logic
- **No `jq` dependency** — plain JSON + Node APIs
- **Type safety** across check/install/post-install/project-file phases
- **Extensible** — add a tool by adding one entry to the manifest
- **PATH handling** — `~/.local/bin` is automatically included for uv-installed tools
