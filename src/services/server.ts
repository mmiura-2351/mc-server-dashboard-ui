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
  ServerPlayer,
  ServerProperties,
  ServerImportRequest,
} from "@/types/server";
import type { AuthError } from "@/types/auth";
import { fetchEmpty, fetchJson } from "@/services/api";
import { tokenManager } from "@/utils/token-manager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Timeout configurations for different operations
const API_TIMEOUTS = {
  SUPPORTED_VERSIONS: 30000, // 30 seconds for external API calls (Mojang, PaperMC)
  DEFAULT: 10000, // 10 seconds for regular API calls
} as const;

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

interface VersionObject {
  version: string;
  server_type: string;
  download_url: string;
  is_supported: boolean;
  release_date: string | null;
  is_stable: boolean;
  build_number: number | null;
}

export async function getSupportedVersions(): Promise<
  Result<string[], AuthError>
> {
  const result = await fetchJson<{ versions: VersionObject[] }>(
    `${API_BASE_URL}/api/v1/servers/versions/supported`,
    {
      timeout: API_TIMEOUTS.SUPPORTED_VERSIONS,
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }

  // Extract unique version strings and sort them
  const uniqueVersions = Array.from(
    new Set(result.value.versions.map((v) => v.version))
  ).sort((a, b) => {
    // Sort versions in descending order (newer first)
    const parseVersion = (v: string) =>
      v.split(".").map((n) => parseInt(n, 10));
    const aV = parseVersion(a);
    const bV = parseVersion(b);

    for (let i = 0; i < Math.max(aV.length, bV.length); i++) {
      const aN = aV[i] || 0;
      const bN = bV[i] || 0;
      if (aN !== bN) return bN - aN;
    }
    return 0;
  });

  return ok(uniqueVersions);
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
  // Define the backend response structure
  interface BackupAPIResponse {
    id: number;
    server_id: number;
    name: string;
    description?: string;
    file_size: number; // Backend returns 'file_size'
    created_at: string;
    backup_type: "manual" | "scheduled" | "pre_update";
    file_path: string;
  }

  const result = await fetchJson<{ backups: BackupAPIResponse[] }>(
    `${API_BASE_URL}/api/v1/backups/servers/${serverId}/backups`
  );
  if (result.isErr()) {
    return err(result.error);
  }

  // Transform backend response to match frontend expectations
  const backups: ServerBackup[] = (result.value.backups || []).map(
    (backup) => ({
      id: backup.id,
      server_id: backup.server_id,
      name: backup.name,
      description: backup.description,
      size_bytes: backup.file_size, // Map file_size to size_bytes
      created_at: backup.created_at,
      backup_type: backup.backup_type,
      file_path: backup.file_path,
    })
  );

  return ok(backups);
}

export async function createBackup(
  serverId: number,
  name: string
): Promise<Result<ServerBackup, AuthError>> {
  // Define the backend response structure
  interface BackupAPIResponse {
    id: number;
    server_id: number;
    name: string;
    description?: string;
    file_size: number; // Backend returns 'file_size'
    created_at: string;
    backup_type: "manual" | "scheduled" | "pre_update";
    file_path: string;
  }

  const result = await fetchJson<BackupAPIResponse>(
    `${API_BASE_URL}/api/v1/backups/servers/${serverId}/backups`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description: "",
        backup_type: "manual",
      }),
    }
  );

  if (result.isErr()) {
    return err(result.error);
  }

  // Transform backend response to match frontend expectations
  const backup: ServerBackup = {
    id: result.value.id,
    server_id: result.value.server_id,
    name: result.value.name,
    description: result.value.description,
    size_bytes: result.value.file_size, // Map file_size to size_bytes
    created_at: result.value.created_at,
    backup_type: result.value.backup_type,
    file_path: result.value.file_path,
  };

  return ok(backup);
}

export async function restoreBackup(
  backupId: number
): Promise<Result<void, AuthError>> {
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/backups/backups/${backupId}/restore`,
    {
      method: "POST",
      body: JSON.stringify({
        confirm: true,
      }),
    }
  );
}

export async function deleteBackup(
  backupId: number
): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/backups/backups/${backupId}`, {
    method: "DELETE",
  });
}

export async function downloadBackup(
  backupId: number
): Promise<Result<Blob, AuthError>> {
  try {
    const token = await tokenManager.getValidAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/backups/backups/${backupId}/download`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let message = "Download failed";
      try {
        const errorData = JSON.parse(errorText);
        message = errorData.message || errorData.detail || message;
      } catch {
        // If not JSON, use the text as error message
        message = errorText || message;
      }

      return err({
        message,
        status: response.status,
      });
    }

    const blob = await response.blob();
    return ok(blob);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
      status: 0,
    });
  }
}

export async function advancedRestoreBackup(
  backupId: number,
  _options?: { preservePlayerData?: boolean; restoreSettings?: boolean }
): Promise<Result<void, AuthError>> {
  // For now, just use the same basic restore endpoint
  // Advanced options like preservePlayerData are not yet supported by backend
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/backups/backups/${backupId}/restore`,
    {
      method: "POST",
      body: JSON.stringify({
        confirm: true,
      }),
    }
  );
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

// Export server as a ZIP file
export async function exportServer(
  serverId: number
): Promise<Result<Blob, AuthError>> {
  try {
    const token = await tokenManager.getValidAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/servers/${serverId}/export`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let message = "Export failed";
      try {
        const errorData = JSON.parse(errorText);
        message = errorData.message || errorData.detail || message;
      } catch {
        // If not JSON, use the text as error message
        message = errorText || message;
      }

      return err({
        message,
        status: response.status,
      });
    }

    const blob = await response.blob();
    return ok(blob);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
      status: 0,
    });
  }
}

// Import server from ZIP file
export async function importServer(
  data: ServerImportRequest
): Promise<Result<MinecraftServer, AuthError>> {
  try {
    const token = await tokenManager.getValidAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) {
      formData.append("description", data.description);
    }
    formData.append("file", data.file);

    const response = await fetch(`${API_BASE_URL}/api/v1/servers/import`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = "Import failed";
      try {
        const errorData = JSON.parse(errorText);
        message = errorData.message || errorData.detail || message;
      } catch {
        // If not JSON, use the text as error message
        message = errorText || message;
      }

      return err({
        message,
        status: response.status,
      });
    }

    const server = await response.json();
    return ok(server);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
      status: 0,
    });
  }
}
