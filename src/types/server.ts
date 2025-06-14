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
  id: string;
  server_id: number;
  name: string;
  description?: string;
  size_bytes: number;
  created_at: string;
  backup_type: "manual" | "scheduled" | "pre_update";
  file_path: string;
}

export interface BackupSettings {
  enabled: boolean;
  interval: number; // hours
  maxBackups: number;
}

// Enhanced backup scheduling interfaces
export interface BackupSchedule {
  id: string;
  server_id: number;
  name: string;
  description?: string;
  enabled: boolean;
  cron_expression: string;
  interval_hours?: number;
  max_backups: number;
  only_when_running: boolean;
  backup_type: "scheduled" | "manual";
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  next_run_at?: string;
  created_by: number;
}

export interface BackupScheduleCreateRequest {
  server_id: number;
  name: string;
  description?: string;
  enabled: boolean;
  cron_expression?: string;
  interval_hours?: number;
  max_backups: number;
  only_when_running: boolean;
}

export interface BackupScheduleUpdateRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  cron_expression?: string;
  interval_hours?: number;
  max_backups?: number;
  only_when_running?: boolean;
}

export interface BackupScheduleLog {
  id: string;
  schedule_id: string;
  server_id: number;
  backup_id?: string;
  status: "success" | "failed" | "running" | "cancelled";
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  backup_size_bytes?: number;
  logs?: string[];
}

export interface SchedulerStatus {
  running: boolean;
  total_schedules: number;
  active_schedules: number;
  last_check_at?: string;
  next_check_at?: string;
  current_jobs: SchedulerJob[];
}

export interface SchedulerJob {
  id: string;
  schedule_id: string;
  server_id: number;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  progress_percentage?: number;
  estimated_completion_at?: string;
}

export enum BackupScheduleInterval {
  HOURLY = 1,
  EVERY_6_HOURS = 6,
  EVERY_12_HOURS = 12,
  DAILY = 24,
  EVERY_2_DAYS = 48,
  WEEKLY = 168,
  CUSTOM = -1,
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
