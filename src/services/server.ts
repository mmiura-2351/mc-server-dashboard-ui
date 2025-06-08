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

interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<Result<T, AuthError>> {
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem("access_token");

    // Debug logging (development only)
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] API Request:", url);
      console.log("[DEBUG] Token exists:", !!token);
      if (token) {
        console.log("[DEBUG] Token preview:", token.substring(0, 50) + "...");
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] Authorization header set");
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] No token found in localStorage");
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "An error occurred";

      // Debug logging for errors (development only)
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] API Error:", response.status, response.statusText);
        console.log("[DEBUG] Error response:", errorText);
      }

      try {
        const errorData = JSON.parse(errorText);

        // Handle FastAPI validation errors (422)
        if (response.status === 422 && Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail
            .map((error: ValidationError) => {
              const field = error.loc ? error.loc.join(".") : "field";
              return `${field}: ${error.msg}`;
            })
            .join(", ");
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        // Handle specific authentication errors
        if (response.status === 401) {
          errorMessage = "認証が失敗しました。再度ログインしてください。";
        } else if (response.status === 403) {
          errorMessage = "この操作を実行する権限がありません。";
        } else if (response.status === 404) {
          errorMessage = "サーバーが見つかりません。";
        } else if (response.status === 409) {
          errorMessage = "サーバーの状態により操作を実行できません。";
        } else if (response.status >= 500) {
          errorMessage =
            "サーバーエラーが発生しました。しばらく待ってから再試行してください。";
        }
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      return err({
        message: errorMessage,
        status: response.status,
      });
    }

    const data = await response.json();
    return ok(data);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
    });
  }
}

export async function getServers(): Promise<
  Result<MinecraftServer[], AuthError>
> {
  const result = await fetchWithErrorHandling<ServerListResponse>(
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
  return fetchWithErrorHandling<MinecraftServer>(
    `${API_BASE_URL}/api/v1/servers/${id}`
  );
}

export async function createServer(
  data: CreateServerRequest
): Promise<Result<MinecraftServer, AuthError>> {
  return fetchWithErrorHandling<MinecraftServer>(
    `${API_BASE_URL}/api/v1/servers`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateServer(
  id: number,
  data: ServerUpdateRequest
): Promise<Result<MinecraftServer, AuthError>> {
  return fetchWithErrorHandling<MinecraftServer>(
    `${API_BASE_URL}/api/v1/servers/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteServer(
  id: number
): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/${id}`,
    {
      method: "DELETE",
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function startServer(
  id: number
): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/${id}/start`,
    {
      method: "POST",
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function stopServer(id: number): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/${id}/stop`,
    {
      method: "POST",
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function restartServer(
  id: number
): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/${id}/restart`,
    {
      method: "POST",
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function getServerStatus(
  id: number
): Promise<Result<ServerStatusResponse, AuthError>> {
  return fetchWithErrorHandling<ServerStatusResponse>(
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
  return fetchWithErrorHandling<ServerLogsResponse>(url.toString());
}

export async function sendServerCommand(
  id: number,
  command: string
): Promise<Result<void, AuthError>> {
  const data: ServerCommandRequest = { command };
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/${id}/command`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function getSupportedVersions(): Promise<
  Result<string[], AuthError>
> {
  const result = await fetchWithErrorHandling<{ versions: string[] }>(
    `${API_BASE_URL}/api/v1/servers/versions/supported`
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(result.value.versions);
}

export async function syncServerStates(): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/servers/sync`,
    {
      method: "POST",
    }
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

// Legacy functions for templates and backups (to be implemented later with proper API endpoints)
export async function getServerTemplates(): Promise<
  Result<ServerTemplate[], AuthError>
> {
  // Placeholder implementation - replace with actual API call when templates endpoint is available
  return ok([]);
}

export async function getServerBackups(
  _serverId: number
): Promise<Result<ServerBackup[], AuthError>> {
  // Placeholder implementation - replace with actual backup API calls
  return ok([]);
}

export async function createBackup(
  _serverId: number,
  _name: string
): Promise<Result<ServerBackup, AuthError>> {
  // Placeholder implementation
  return err({ message: "Backup functionality not yet implemented" });
}

export async function restoreBackup(
  _backupId: string
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return err({ message: "Backup functionality not yet implemented" });
}

export async function getBackupSettings(
  _serverId: number
): Promise<Result<BackupSettings, AuthError>> {
  // Placeholder implementation
  return ok({
    enabled: false,
    interval: 24,
    maxBackups: 7,
  });
}

export async function updateBackupSettings(
  _serverId: number,
  _settings: BackupSettings
): Promise<Result<void, AuthError>> {
  // Placeholder implementation
  return ok(undefined);
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

export async function getServerProperties(
  _serverId: number
): Promise<Result<ServerProperties, AuthError>> {
  // Placeholder implementation - would use files API
  return ok({
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
  });
}

export async function updateServerProperties(
  _serverId: number,
  _properties: Partial<ServerProperties>
): Promise<Result<void, AuthError>> {
  // Placeholder implementation - would use files API
  return ok(undefined);
}
