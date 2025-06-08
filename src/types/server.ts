export interface MinecraftServer {
  id: string;
  name: string;
  version: string;
  type: ServerType;
  status: ServerStatus;
  memory: number; // MB
  players: {
    online: number;
    max: number;
  };
  port: number;
  createdAt: string;
  lastStarted?: string;
  description?: string;
}

export enum ServerType {
  VANILLA = "vanilla",
  FORGE = "forge",
  PAPER = "paper",
}

export enum ServerStatus {
  RUNNING = "running",
  STOPPED = "stopped",
  STARTING = "starting",
  STOPPING = "stopping",
  ERROR = "error",
}

export interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ServerType;
  memory: number;
  isPublic: boolean;
  createdBy: string;
}

export interface CreateServerRequest {
  name: string;
  version: string;
  type: ServerType;
  memory: number;
  description?: string;
  templateId?: string;
}

export interface ServerBackup {
  id: string;
  serverId: string;
  name: string;
  size: number; // bytes
  createdAt: string;
  isAutomatic: boolean;
}

export interface BackupSettings {
  enabled: boolean;
  interval: number; // hours
  maxBackups: number;
}

export interface ServerPlayer {
  name: string;
  uuid: string;
  isOp: boolean;
  isWhitelisted: boolean;
  lastSeen?: string;
}

export interface ServerProperties {
  [key: string]: string | number | boolean;
}

export const MINECRAFT_VERSIONS = [
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.2",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.5",
  "1.20.4",
  "1.20.3",
  "1.20.2",
  "1.20.1",
  "1.20",
  "1.19.4",
  "1.19.3",
  "1.19.2",
  "1.19.1",
  "1.19",
  "1.18.2",
  "1.18.1",
  "1.18",
  "1.17.1",
  "1.17",
  "1.16.5",
  "1.16.4",
  "1.16.3",
  "1.16.2",
  "1.16.1",
  "1.16",
  "1.15.2",
  "1.15.1",
  "1.15",
  "1.14.4",
  "1.14.3",
  "1.14.2",
  "1.14.1",
  "1.14",
  "1.13.2",
  "1.13.1",
  "1.13",
  "1.12.2",
  "1.12.1",
  "1.12",
  "1.11.2",
  "1.11.1",
  "1.11",
  "1.10.2",
  "1.10.1",
  "1.10",
  "1.9.4",
  "1.9.3",
  "1.9.2",
  "1.9.1",
  "1.9",
  "1.8.9",
  "1.8.8",
  "1.8.7",
  "1.8.6",
  "1.8.5",
  "1.8.4",
  "1.8.3",
  "1.8.2",
  "1.8.1",
  "1.8",
] as const;

export type MinecraftVersion = (typeof MINECRAFT_VERSIONS)[number];
