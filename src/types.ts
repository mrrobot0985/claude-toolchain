export interface Tool {
  name: string;
  description: string;
  checkCommand: string[];          // e.g. ['claude', '--version']
  installCommand: string[];        // e.g. ['npm', 'install', '-g', '@anthropic-ai/claude-code']
  postInstall?: string[];          // e.g. ['graphify', 'install']
  projectFiles?: ProjectFile[];    // .gitignore / .claudeignore entries
  env?: Record<string, string>;    // Environment variables to set
  optional?: boolean;              // Skipped by default; use --include-optional
  plugin?: {                       // For agent-installed plugins
    marketplaceAdd: string;
    installCommand: string;
  };
}

export interface ProjectFile {
  path: string;
  content: string;
  appendIfExists?: boolean;
  marker?: string;                 // If appendIfExists, only append if marker not found
}

export interface Manifest {
  name: string;
  version: string;
  tools: Tool[];
}

export interface StatusResult {
  name: string;
  installed: boolean;
  version?: string;
  optional?: boolean;
}
