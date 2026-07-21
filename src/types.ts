export interface SystemDep {
  name: string;
  description: string;
  checkCommand: string[];
  installHint: string;
  autoInstall?: string[];
}

export interface ConfigFile {
  path: string;
  content: string;
  chmod: number;
}

export interface Tool {
  name: string;
  description: string;
  systemDeps: SystemDep[];
  configFiles: ConfigFile[];
  pluginCommands: string[];
}
