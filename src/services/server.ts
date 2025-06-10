import { ok, err, type Result } from "neverthrow";
import type {
  MinecraftServer,
  CreateServerRequest,
  ServerUpdateRequest,
  ServerListResponse,
  ServerStatusResponse,
  ServerLogsResponse,
  ServerCommandRequest,
  ServerTemplate,
  ServerBackup,
  BackupSettings,
  ServerPlayer,
  ServerProperties,
} from "@/types/server";
import type { AuthError } from "@/types/auth";
import { fetchEmpty, fetchJson } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getServers(): Promise<
  Result<MinecraftServer[], AuthError>
> {
  const result = await fetchJson<ServerListResponse>(
    `${API_BASE_URL}/api/v1/servers`
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(result.value.servers);
}

export async function getServer(
  id: number
): Promise<Result<MinecraftServer, AuthError>> {
  return fetchJson<MinecraftServer>(`${API_BASE_URL}/api/v1/servers/${id}`);
}

export async function createServer(
  data: CreateServerRequest
): Promise<Result<MinecraftServer, AuthError>> {
  return fetchJson<MinecraftServer>(`${API_BASE_URL}/api/v1/servers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateServer(
  id: number,
  data: ServerUpdateRequest
): Promise<Result<MinecraftServer, AuthError>> {
  return fetchJson<MinecraftServer>(`${API_BASE_URL}/api/v1/servers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteServer(
  id: number
): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/${id}`, {
    method: "DELETE",
  });
}

export async function startServer(
  id: number
): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/${id}/start`, {
    method: "POST",
  });
}

export async function stopServer(id: number): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/${id}/stop`, {
    method: "POST",
  });
}

export async function restartServer(
  id: number
): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/${id}/restart`, {
    method: "POST",
  });
}

export async function getServerStatus(
  id: number
): Promise<Result<ServerStatusResponse, AuthError>> {
  return fetchJson<ServerStatusResponse>(
    `${API_BASE_URL}/api/v1/servers/${id}/status`
  );
}

export async function getServerLogs(
  id: number,
  lines?: number
): Promise<Result<ServerLogsResponse, AuthError>> {
  const url = new URL(`${API_BASE_URL}/api/v1/servers/${id}/logs`);
  if (lines) {
    url.searchParams.set("lines", lines.toString());
  }
  return fetchJson<ServerLogsResponse>(url.toString());
}

export async function sendServerCommand(
  id: number,
  command: string
): Promise<Result<void, AuthError>> {
  const data: ServerCommandRequest = { command };
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/${id}/command`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSupportedVersions(): Promise<
  Result<string[], AuthError>
> {
  const result = await fetchJson<{ versions: string[] }>(
    `${API_BASE_URL}/api/v1/servers/versions/supported`
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(result.value.versions);
}

export async function syncServerStates(): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/servers/sync`, {
    method: "POST",
  });
}

// Legacy functions for templates and backups (to be implemented later with proper API endpoints)
export async function getServerTemplates(): Promise<
  Result<ServerTemplate[], AuthError>
> {
  // Placeholder implementation - replace with actual API call when templates endpoint is available
  return ok([]);
}

export async function getServerBackups(
  serverId: number
): Promise<Result<ServerBackup[], AuthError>> {
  const result = await fetchJson<{ backups: ServerBackup[] }>(
    `${API_BASE_URL}/api/v1/backups/servers/${serverId}/backups`
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(result.value.backups);
}

export async function createBackup(
  serverId: number,
  name: string
): Promise<Result<ServerBackup, AuthError>> {
  return fetchJson<ServerBackup>(
    `${API_BASE_URL}/api/v1/backups/servers/${serverId}/backups`,
    {
      method: "POST",
      body: JSON.stringify({ 
        name,
        description: "",
        backup_type: "manual"
      }),
    }
  );
}

export async function restoreBackup(
  backupId: string
): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/backups/backups/${backupId}/restore`, {
    method: "POST",
  });
}

export async function getBackupSettings(
  serverId: number
): Promise<Result<BackupSettings, AuthError>> {
  const result = await fetchJson<{
    enabled: boolean | null;
    interval_hours: number | null;
    max_backups: number | null;
  }>(`${API_BASE_URL}/api/v1/backups/scheduler/servers/${serverId}/schedule`);
  
  if (result.isErr()) {
    return err(result.error);
  }
  
  return ok({
    enabled: result.value.enabled ?? false,
    interval: result.value.interval_hours ?? 24,
    maxBackups: result.value.max_backups ?? 7,
  });
}

export async function updateBackupSettings(
  serverId: number,
  settings: BackupSettings
): Promise<Result<void, AuthError>> {
  const url = new URL(`${API_BASE_URL}/api/v1/backups/scheduler/servers/${serverId}/schedule`);
  url.searchParams.set("enabled", settings.enabled.toString());
  url.searchParams.set("interval_hours", settings.interval.toString());
  url.searchParams.set("max_backups", settings.maxBackups.toString());
  
  return fetchEmpty(url.toString(), {
    method: "PUT",
  });
}

export async function getServerPlayers(
  _serverId: number
): Promise<Result<ServerPlayer[], AuthError>> {
  // Placeholder implementation - would need groups API integration
  return ok([]);
}

export async function addPlayerToWhitelist(
  _serverId: number,
  _playerName: string
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return ok(undefined);
}

export async function removePlayerFromWhitelist(
  _serverId: number,
  _playerName: string
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return ok(undefined);
}

export async function giveOpPermission(
  _serverId: number,
  _playerName: string
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return ok(undefined);
}

export async function removeOpPermission(
  _serverId: number,
  _playerName: string
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return ok(undefined);
}

// Read server.properties file content
export async function getServerPropertiesFile(
  serverId: number
): Promise<Result<string, AuthError>> {
  return fetchJson<{
    content: string;
    encoding: string;
    file_info: unknown;
  }>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/server.properties/read`
  ).then((result) => {
    if (result.isOk()) {
      return ok(result.value.content);
    }
    return err(result.error);
  });
}

// Parse server.properties content into object
export function parseServerProperties(content: string): ServerProperties {
  const properties: ServerProperties = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (trimmedLine.startsWith("#") || trimmedLine === "") {
      continue;
    }

    // Parse key=value pairs
    const equalIndex = trimmedLine.indexOf("=");
    if (equalIndex !== -1) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();

      // Convert to appropriate type
      if (value === "true" || value === "false") {
        properties[key] = value === "true";
      } else if (!isNaN(Number(value)) && value !== "") {
        properties[key] = Number(value);
      } else {
        properties[key] = value;
      }
    }
  }

  return properties;
}

// Convert properties object back to file content
export function stringifyServerProperties(
  properties: ServerProperties
): string {
  const lines: string[] = [];

  // Add header comment
  lines.push("#Minecraft server properties");
  lines.push(`#${new Date().toString()}`);

  // Sort keys for consistency
  const sortedKeys = Object.keys(properties).sort();

  for (const key of sortedKeys) {
    const value = properties[key];
    lines.push(`${key}=${value}`);
  }

  return lines.join("\n");
}

export async function getServerProperties(
  serverId: number
): Promise<Result<ServerProperties, AuthError>> {
  const fileResult = await getServerPropertiesFile(serverId);

  if (fileResult.isErr()) {
    return err(fileResult.error);
  }

  try {
    const properties = parseServerProperties(fileResult.value);
    return ok(properties);
  } catch {
    return err({
      message: "Failed to parse server.properties file",
    });
  }
}

// Write server.properties file
export async function writeServerPropertiesFile(
  serverId: number,
  content: string
): Promise<Result<void, AuthError>> {
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/server.properties`,
    {
      method: "PUT",
      body: JSON.stringify({
        content: content,
        encoding: "utf-8",
        create_backup: true,
      }),
    }
  );
}

export async function updateServerProperties(
  serverId: number,
  properties: Partial<ServerProperties>
): Promise<Result<void, AuthError>> {
  // First, get the current properties
  const fileResult = await getServerPropertiesFile(serverId);

  if (fileResult.isErr()) {
    return err(fileResult.error);
  }

  try {
    // Parse current properties
    const currentProperties = parseServerProperties(fileResult.value);

    // Merge with new properties
    const updatedProperties = {
      ...currentProperties,
      ...properties,
    };

    // Convert to file content
    const content = stringifyServerProperties(
      updatedProperties as ServerProperties
    );

    // Write the file
    return writeServerPropertiesFile(serverId, content);
  } catch {
    return err({
      message: "Failed to parse server.properties file",
    });
  }
}
