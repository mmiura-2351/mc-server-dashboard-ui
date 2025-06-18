export interface MinecraftServer {
  id: number;
  name: string;
  description: string | null;
  minecraft_version: string;
  server_type: ServerType;
  status: ServerStatus;
  directory_path: string;
  port: number;
  max_memory: number; // MB
  max_players: number;
  owner_id: number;
  template_id: number | null;
  created_at: string;
  updated_at: string;
  process_info?: Record<string, unknown> | null;
  configurations?: ServerConfigurationResponse[];
}

export interface ServerConfigurationResponse {
  [key: string]: unknown;
}

export enum ServerType {
  VANILLA = "vanilla",
  FORGE = "forge",
  PAPER = "paper",
}

export enum ServerStatus {
  STOPPED = "stopped",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  ERROR = "error",
}

export interface ServerListResponse {
  servers: MinecraftServer[];
  total: number;
  page: number;
  size: number;
}

export interface ServerStatusResponse {
  server_id: number;
  status: ServerStatus;
  process_info?: Record<string, unknown> | null;
}

export interface ServerLogsResponse {
  server_id: number;
  logs: string[];
  total_lines: number;
}

export interface CreateServerRequest {
  name: string;
  description?: string | null;
  minecraft_version: string;
  server_type: ServerType;
  port?: number;
  max_memory?: number;
  max_players?: number;
  template_id?: number | null;
  server_properties?: Record<string, unknown> | null;
  attach_groups?: Record<string, number[]> | null;
}

export interface ServerUpdateRequest {
  name?: string | null;
  description?: string | null;
  max_memory?: number | null;
  max_players?: number | null;
  server_properties?: Record<string, unknown> | null;
}

export interface ServerCommandRequest {
  command: string;
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

export interface ServerBackup {
  id: number;
  server_id: number;
  name: string;
  description?: string;
  size_bytes: number | string; // Backend might return as string
  created_at: string;
  backup_type: "manual" | "scheduled" | "pre_update";
  file_path: string;
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

export interface ServerImportRequest {
  name: string;
  description?: string;
  file: File;
}

// MINECRAFT_VERSIONS removed - now dynamically fetched from API
// See getSupportedVersions() in src/services/server.ts
export type MinecraftVersion = string;
