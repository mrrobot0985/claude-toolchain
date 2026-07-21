import { stdin, stdout } from 'node:process';
import type { Tool } from './types.js';

interface MenuItem {
  tool: Tool;
  selected: boolean;
}

function clearLines(count: number): void {
  for (let i = 0; i < count; i++) {
    stdout.moveCursor?.(0, -1);
    stdout.clearLine?.(0);
  }
}

function render(items: MenuItem[], cursorIndex: number): void {
  console.log('\nClaude Toolchain — Select tools to install:\n');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cursor = i === cursorIndex ? '>' : ' ';
    const box = item.selected ? '[x]' : '[ ]';
    const tag = item.tool.optional ? ' (optional)' : '';
    const pluginTag = item.tool.plugin ? ' [plugin]' : '';
    const desc = `    ${item.tool.description}`;

    console.log(`${cursor} ${box} ${item.tool.name}${tag}${pluginTag}`);
    console.log(`${desc}`);
    console.log('');
  }

  console.log('  ↑↓ navigate  SPACE toggle  ENTER confirm  a toggle all');
  console.log('');
}

export async function interactiveMenu(tools: Tool[]): Promise<Tool[]> {
  const items: MenuItem[] = tools.map((tool) => ({
    tool,
    selected: !tool.optional && !tool.plugin,
  }));

  let cursorIndex = 0;
  let lineCount = 0;

  return new Promise((resolve) => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const draw = (): void => {
      if (lineCount > 0) {
        clearLines(lineCount);
      }
      render(items, cursorIndex);
      lineCount = items.length * 3 + 4;
    };

    const handler = (key: string): void => {
      const bytes = Buffer.from(key);

      // Ctrl+C or q
      if (key === '' || key === 'q') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
        process.exit(0);
      }

      // Arrow keys
      if (bytes[0] === 0x1b && bytes[1] === 0x5b) {
        switch (bytes[2]) {
          case 0x41: // up
            cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : items.length - 1;
            draw();
            return;
          case 0x42: // down
            cursorIndex = cursorIndex < items.length - 1 ? cursorIndex + 1 : 0;
            draw();
            return;
        }
      }

      // Space
      if (key === ' ') {
        items[cursorIndex].selected = !items[cursorIndex].selected;
        draw();
        return;
      }

      // 'a' to toggle all
      if (key === 'a' || key === 'A') {
        const allSelected = items.every((i) => i.selected);
        for (const item of items) {
          item.selected = !allSelected;
        }
        draw();
        return;
      }

      // Enter
      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        clearLines(lineCount);

        const selected = items.filter((i) => i.selected).map((i) => i.tool);
        console.log(`Selected ${selected.length} tool(s): ${selected.map((t) => t.name).join(', ')}\n`);
        resolve(selected);
        return;
      }
    };

    stdin.on('data', handler);
    draw();
  });
}
