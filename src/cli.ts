#!/usr/bin/env node
import { MANIFEST } from './manifest.js';
import { isInstalled, installTool, applyProjectFiles, applyEnv, uninstallTool, removeProjectFiles } from './runner.js';
import { checkTool, printStatus } from './status.js';
import { interactiveMenu } from './menu.js';

const CMD = process.argv[2];
const INCLUDE_OPTIONAL = process.argv.includes('--include-optional');
const NON_INTERACTIVE = process.argv.includes('--non-interactive') || process.argv.includes('-y');
const SHOW_VERSION = process.argv.includes('--version') || process.argv.includes('-v');

async function setup(): Promise<void> {
  console.log(`=== ${MANIFEST.name} v${MANIFEST.version} ===\n`);

  let toolsToInstall: typeof MANIFEST.tools;

  if (NON_INTERACTIVE) {
    // Legacy behavior: install required + optional if --include-optional
    toolsToInstall = MANIFEST.tools.filter((t) => !t.optional || INCLUDE_OPTIONAL);
    console.log(`Non-interactive mode: installing ${toolsToInstall.length} tool(s)\n`);
  } else {
    toolsToInstall = await interactiveMenu(MANIFEST.tools);
  }

  for (const tool of toolsToInstall) {
    await processTool(tool);
  }

  // Report plugin-only tools that need manual /plugin commands
  const selectedPlugins = toolsToInstall.filter((t) => t.plugin);
  if (selectedPlugins.length > 0) {
    console.log('Plugin tools (install manually inside Claude):');
    for (const p of selectedPlugins) {
      console.log(`  /plugin marketplace add ${p.plugin!.marketplaceAdd}`);
      console.log(`  /plugin install ${p.plugin!.installCommand}`);
    }
    console.log('');
  }

  console.log('=== Setup complete ===');
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

async function uninstall(): Promise<void> {
  console.log(`=== ${MANIFEST.name} v${MANIFEST.version} ===\n`);

  let toolsToRemove: typeof MANIFEST.tools;

  if (NON_INTERACTIVE) {
    toolsToRemove = MANIFEST.tools.filter((t) => !t.optional || INCLUDE_OPTIONAL);
    console.log(`Non-interactive mode: uninstalling ${toolsToRemove.length} tool(s)\n`);
  } else {
    toolsToRemove = await interactiveMenu(MANIFEST.tools);
  }

  for (const tool of toolsToRemove) {
    await processUninstall(tool);
  }

  // Report plugin-only tools that need manual /plugin commands
  const selectedPlugins = toolsToRemove.filter((t) => t.plugin);
  if (selectedPlugins.length > 0) {
    console.log('Plugin tools (remove manually inside Claude):');
    for (const p of selectedPlugins) {
      console.log(`  /plugin remove ${p.plugin!.installCommand}`);
    }
    console.log('');
  }

  console.log('=== Uninstall complete ===');
}

async function processUninstall(tool: ReturnType<typeof MANIFEST.tools.filter>[number]): Promise<void> {
  const already = await isInstalled(tool);
  if (!already) {
    console.log(`SKIP: ${tool.name} — not installed`);
    return;
  }

  console.log(`UNINSTALL: ${tool.description}`);
  try {
    await uninstallTool(tool);
    await removeProjectFiles(tool);
    console.log(`OK: ${tool.name} removed\n`);
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
  if (SHOW_VERSION) {
    console.log(`${MANIFEST.name} v${MANIFEST.version}`);
    process.exit(0);
  }

  switch (CMD) {
    case 'setup':
      await setup();
      break;
    case 'uninstall':
      await uninstall();
      break;
    case 'status':
      await status();
      break;
    default:
      console.error(`Usage: claude-toolchain <setup|uninstall|status> [--non-interactive] [--include-optional]`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
