import { ok, err, type Result } from "neverthrow";
import type {
  MinecraftServer,
  CreateServerRequest,
  ServerTemplate,
  ServerBackup,
  BackupSettings,
  ServerPlayer,
  ServerProperties,
} from "@/types/server";
import type { AuthError } from "@/types/auth";

// Mock data for development
const mockServers: MinecraftServer[] = [
  {
    id: "server-1",
    name: "Survival World",
    version: "1.21.5",
    type: "paper" as any,
    status: "running" as any,
    memory: 4096,
    players: { online: 3, max: 20 },
    port: 25565,
    createdAt: "2024-01-15T10:00:00Z",
    lastStarted: "2024-01-20T08:30:00Z",
    description: "Main survival server for the community",
  },
  {
    id: "server-2",
    name: "Creative Build",
    version: "1.21.3",
    type: "vanilla" as any,
    status: "stopped" as any,
    memory: 2048,
    players: { online: 0, max: 10 },
    port: 25566,
    createdAt: "2024-01-10T14:00:00Z",
    description: "Creative building server",
  },
  {
    id: "server-3",
    name: "Modded Adventure",
    version: "1.20.1",
    type: "forge" as any,
    status: "starting" as any,
    memory: 8192,
    players: { online: 0, max: 15 },
    port: 25567,
    createdAt: "2024-01-05T16:00:00Z",
    description: "Modded server with adventure mods",
  },
];

const mockTemplates: ServerTemplate[] = [
  {
    id: "template-1",
    name: "Vanilla Survival",
    description: "Standard vanilla survival server",
    version: "1.21.5",
    type: "vanilla" as any,
    memory: 2048,
    isPublic: true,
    createdBy: "admin",
  },
  {
    id: "template-2",
    name: "Paper Performance",
    description: "Optimized Paper server for better performance",
    version: "1.21.5",
    type: "paper" as any,
    memory: 4096,
    isPublic: true,
    createdBy: "admin",
  },
];

const mockBackups: ServerBackup[] = [
  {
    id: "backup-1",
    serverId: "server-1",
    name: "Daily Backup - 2024-01-20",
    size: 1024 * 1024 * 500, // 500MB
    createdAt: "2024-01-20T02:00:00Z",
    isAutomatic: true,
  },
  {
    id: "backup-2",
    serverId: "server-1",
    name: "Manual Backup - Before Update",
    size: 1024 * 1024 * 480, // 480MB
    createdAt: "2024-01-19T15:30:00Z",
    isAutomatic: false,
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getServers(): Promise<
  Result<MinecraftServer[], AuthError>
> {
  await delay(500);
  return ok([...mockServers]);
}

export async function getServer(
  id: string
): Promise<Result<MinecraftServer, AuthError>> {
  await delay(300);
  const server = mockServers.find((s) => s.id === id);
  if (!server) {
    return err({ message: "Server not found", status: 404 });
  }
  return ok(server);
}

export async function createServer(
  data: CreateServerRequest
): Promise<Result<MinecraftServer, AuthError>> {
  await delay(1000);

  const newServer: MinecraftServer = {
    id: `server-${Date.now()}`,
    name: data.name,
    version: data.version,
    type: data.type,
    status: "stopped" as any,
    memory: data.memory,
    players: { online: 0, max: 20 },
    port: 25565 + mockServers.length,
    createdAt: new Date().toISOString(),
    description: data.description,
  };

  mockServers.push(newServer);
  return ok(newServer);
}

export async function startServer(
  id: string
): Promise<Result<void, AuthError>> {
  await delay(2000);
  const server = mockServers.find((s) => s.id === id);
  if (!server) {
    return err({ message: "Server not found", status: 404 });
  }

  server.status = "running" as any;
  server.lastStarted = new Date().toISOString();
  return ok(undefined);
}

export async function stopServer(id: string): Promise<Result<void, AuthError>> {
  await delay(1500);
  const server = mockServers.find((s) => s.id === id);
  if (!server) {
    return err({ message: "Server not found", status: 404 });
  }

  server.status = "stopped" as any;
  return ok(undefined);
}

export async function deleteServer(
  id: string
): Promise<Result<void, AuthError>> {
  await delay(800);
  const index = mockServers.findIndex((s) => s.id === id);
  if (index === -1) {
    return err({ message: "Server not found", status: 404 });
  }

  mockServers.splice(index, 1);
  return ok(undefined);
}

export async function getServerTemplates(): Promise<
  Result<ServerTemplate[], AuthError>
> {
  await delay(300);
  return ok([...mockTemplates]);
}

export async function getServerBackups(
  serverId: string
): Promise<Result<ServerBackup[], AuthError>> {
  await delay(400);
  const backups = mockBackups.filter((b) => b.serverId === serverId);
  return ok(backups);
}

export async function createBackup(
  serverId: string,
  name: string
): Promise<Result<ServerBackup, AuthError>> {
  await delay(3000);

  const newBackup: ServerBackup = {
    id: `backup-${Date.now()}`,
    serverId,
    name,
    size: Math.floor(Math.random() * 1024 * 1024 * 600), // Random size up to 600MB
    createdAt: new Date().toISOString(),
    isAutomatic: false,
  };

  mockBackups.push(newBackup);
  return ok(newBackup);
}

export async function restoreBackup(
  backupId: string
): Promise<Result<void, AuthError>> {
  await delay(5000);
  const backup = mockBackups.find((b) => b.id === backupId);
  if (!backup) {
    return err({ message: "Backup not found", status: 404 });
  }

  return ok(undefined);
}

export async function getBackupSettings(
  serverId: string
): Promise<Result<BackupSettings, AuthError>> {
  await delay(200);
  return ok({
    enabled: true,
    interval: 24,
    maxBackups: 7,
  });
}

export async function updateBackupSettings(
  serverId: string,
  settings: BackupSettings
): Promise<Result<void, AuthError>> {
  await delay(500);
  return ok(undefined);
}

export async function getServerPlayers(
  serverId: string
): Promise<Result<ServerPlayer[], AuthError>> {
  await delay(300);
  const mockPlayers: ServerPlayer[] = [
    {
      name: "Steve",
      uuid: "069a79f4-44e9-4726-a5be-fca90e38aaf5",
      isOp: true,
      isWhitelisted: true,
      lastSeen: "2024-01-20T10:30:00Z",
    },
    {
      name: "Alex",
      uuid: "853c80ef-3c37-49fd-aa49-938b674adae6",
      isOp: false,
      isWhitelisted: true,
      lastSeen: "2024-01-20T09:15:00Z",
    },
  ];

  return ok(mockPlayers);
}

export async function addPlayerToWhitelist(
  serverId: string,
  playerName: string
): Promise<Result<void, AuthError>> {
  await delay(500);
  return ok(undefined);
}

export async function removePlayerFromWhitelist(
  serverId: string,
  playerName: string
): Promise<Result<void, AuthError>> {
  await delay(500);
  return ok(undefined);
}

export async function giveOpPermission(
  serverId: string,
  playerName: string
): Promise<Result<void, AuthError>> {
  await delay(500);
  return ok(undefined);
}

export async function removeOpPermission(
  serverId: string,
  playerName: string
): Promise<Result<void, AuthError>> {
  await delay(500);
  return ok(undefined);
}

export async function getServerProperties(
  serverId: string
): Promise<Result<ServerProperties, AuthError>> {
  await delay(400);
  const mockProperties: ServerProperties = {
    "server-port": 25565,
    "max-players": 20,
    difficulty: "normal",
    gamemode: "survival",
    pvp: true,
    "spawn-protection": 16,
    "view-distance": 10,
    "simulation-distance": 10,
    "enable-command-block": false,
    motd: "A Minecraft Server",
  };

  return ok(mockProperties);
}

export async function updateServerProperties(
  serverId: string,
  properties: Partial<ServerProperties>
): Promise<Result<void, AuthError>> {
  await delay(800);
  return ok(undefined);
}
