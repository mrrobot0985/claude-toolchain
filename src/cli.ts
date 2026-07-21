#!/usr/bin/env node
import { MANIFEST } from './manifest.js';
import { isInstalled, installTool, applyProjectFiles, applyEnv } from './runner.js';
import { checkTool, printStatus } from './status.js';

const CMD = process.argv[2];
const INCLUDE_OPTIONAL = process.argv.includes('--include-optional');

async function setup(): Promise<void> {
  console.log(`=== ${MANIFEST.name} v${MANIFEST.version} ===`);

  const required = MANIFEST.tools.filter((t) => !t.optional);
  const optional = MANIFEST.tools.filter((t) => t.optional);

  console.log(`Installing ${required.length} required tool(s) into Claude environment...\n`);

  for (const tool of required) {
    await processTool(tool);
  }

  if (INCLUDE_OPTIONAL && optional.length > 0) {
    console.log(`Installing ${optional.length} optional tool(s)...\n`);
    for (const tool of optional) {
      await processTool(tool);
    }
  } else if (optional.length > 0) {
    console.log(`Skipped ${optional.length} optional tool(s) (use --include-optional to install):`);
    for (const tool of optional) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }
    console.log('');
  }

  // Report plugin-only tools that need manual /plugin commands
  const plugins = MANIFEST.tools.filter((t) => t.plugin);
  if (plugins.length > 0) {
    console.log('Plugin tools (install manually inside Claude):');
    for (const p of plugins) {
      console.log(`  /plugin marketplace add ${p.plugin!.marketplaceAdd}`);
      console.log(`  /plugin install ${p.plugin!.installCommand}`);
    }
  }

  console.log('\n=== Setup complete ===');
}

async function processTool(tool: ReturnType<typeof MANIFEST.tools.filter>[number]): Promise<void> {
  const already = await isInstalled(tool);
  if (already) {
    console.log(`SKIP: ${tool.name} — already installed`);
    return;
  }

  console.log(`INSTALL: ${tool.description}`);
  try {
    await installTool(tool);
    await applyProjectFiles(tool);
    await applyEnv(tool);
    console.log(`OK: ${tool.name}\n`);
  } catch (err) {
    console.error(`FAIL: ${tool.name} — ${(err as Error).message}\n`);
    // Continue with other tools; don't fail the whole run
  }
}

async function status(): Promise<void> {
  const results = await Promise.all(
    MANIFEST.tools.map((t) => checkTool(t).then((r) => ({ ...r, optional: t.optional })))
  );
  printStatus(results);

  // Plugin-only tools (agent-installed via /plugin) cannot be verified by this script
  const pluginNames = new Set(MANIFEST.tools.filter((t) => t.plugin).map((t) => t.name));
  const requiredMissing = results.filter(
    (r) => !r.optional && !r.installed && !pluginNames.has(r.name)
  );
  process.exit(requiredMissing.length === 0 ? 0 : 1);
}

async function main(): Promise<void> {
  switch (CMD) {
    case 'setup':
      await setup();
      break;
    case 'status':
      await status();
      break;
    default:
      console.error(`Usage: claude-toolchain <setup|status> [--include-optional]`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
