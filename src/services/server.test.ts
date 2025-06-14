import { describe, test, expect, beforeEach, vi } from "vitest";
import { ok, err } from "neverthrow";
import type {
  MinecraftServer,
  CreateServerRequest,
  ServerUpdateRequest,
  ServerListResponse,
  ServerStatusResponse,
  ServerLogsResponse,
  ServerCommandRequest,
  ServerProperties,
  ServerType,
  ServerStatus,
} from "@/types/server";
import type { AuthError } from "@/types/auth";
import {
  getServers,
  getServer,
  createServer,
  updateServer,
  deleteServer,
  startServer,
  stopServer,
  restartServer,
  getServerStatus,
  getServerLogs,
  sendServerCommand,
  getSupportedVersions,
  syncServerStates,
  getServerTemplates,
  getServerBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  downloadBackup,
  advancedRestoreBackup,
  getServerPlayers,
  addPlayerToWhitelist,
  removePlayerFromWhitelist,
  giveOpPermission,
  removeOpPermission,
  getServerPropertiesFile,
  parseServerProperties,
  stringifyServerProperties,
  getServerProperties,
  writeServerPropertiesFile,
  updateServerProperties,
} from "./server";

// Mock the API functions
vi.mock("@/services/api", () => ({
  fetchJson: vi.fn(),
  fetchEmpty: vi.fn(),
}));

// Mock the token manager
vi.mock("@/utils/token-manager", () => ({
  tokenManager: {
    getValidAccessToken: vi.fn().mockResolvedValue("test-token"),
  },
}));

// Mock fetch for downloadBackup function
global.fetch = vi.fn();

import { fetchJson, fetchEmpty } from "@/services/api";
import { tokenManager } from "@/utils/token-manager";

describe("server service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset environment variable
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
  });

  // Mock data
  const mockServer: MinecraftServer = {
    id: 1,
    name: "Test Server",
    description: "A test server",
    minecraft_version: "1.21.5",
    server_type: "vanilla" as ServerType,
    status: "stopped" as ServerStatus,
    directory_path: "/path/to/server",
    port: 25565,
    max_memory: 2048,
    max_players: 20,
    owner_id: 1,
    template_id: null,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    process_info: null,
    configurations: [],
  };

  const mockAuthError: AuthError = {
    message: "Unauthorized",
    status: 401,
  };

  describe("getServers", () => {
    test("should return servers list on success", async () => {
      const mockResponse: ServerListResponse = {
        servers: [mockServer],
        total: 1,
        page: 1,
        size: 10,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockResponse)
      );

      const result = await getServers();

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([mockServer]);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServers();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getServer", () => {
    test("should return single server on success", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockServer)
      );

      const result = await getServer(1);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockServer);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServer(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("createServer", () => {
    test("should create server successfully", async () => {
      const createRequest: CreateServerRequest = {
        name: "New Server",
        description: "A new test server",
        minecraft_version: "1.21.5",
        server_type: "vanilla" as ServerType,
        port: 25566,
        max_memory: 1024,
        max_players: 10,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockServer)
      );

      const result = await createServer(createRequest);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers",
        {
          method: "POST",
          body: JSON.stringify(createRequest),
        }
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockServer);
      }
    });

    test("should return error on failure", async () => {
      const createRequest: CreateServerRequest = {
        name: "Invalid Server",
        minecraft_version: "invalid",
        server_type: "vanilla" as ServerType,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await createServer(createRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("updateServer", () => {
    test("should update server successfully", async () => {
      const updateRequest: ServerUpdateRequest = {
        name: "Updated Server",
        description: "Updated description",
        max_memory: 4096,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok({ ...mockServer, ...updateRequest })
      );

      const result = await updateServer(1, updateRequest);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1",
        {
          method: "PUT",
          body: JSON.stringify(updateRequest),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      const updateRequest: ServerUpdateRequest = {
        name: null,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await updateServer(1, updateRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("deleteServer", () => {
    test("should delete server successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await deleteServer(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1",
        {
          method: "DELETE",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await deleteServer(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("startServer", () => {
    test("should start server successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await startServer(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/start",
        {
          method: "POST",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await startServer(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("stopServer", () => {
    test("should stop server successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await stopServer(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/stop",
        {
          method: "POST",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await stopServer(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("restartServer", () => {
    test("should restart server successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await restartServer(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/restart",
        {
          method: "POST",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await restartServer(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getServerStatus", () => {
    test("should return server status on success", async () => {
      const mockStatusResponse: ServerStatusResponse = {
        server_id: 1,
        status: "running" as ServerStatus,
        process_info: { pid: 12345 },
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockStatusResponse)
      );

      const result = await getServerStatus(1);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/status"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockStatusResponse);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServerStatus(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getServerLogs", () => {
    test("should return server logs without lines parameter", async () => {
      const mockLogsResponse: ServerLogsResponse = {
        server_id: 1,
        logs: ["[INFO] Server started", "[INFO] Player joined"],
        total_lines: 2,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockLogsResponse)
      );

      const result = await getServerLogs(1);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/logs"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockLogsResponse);
      }
    });

    test("should return server logs with lines parameter", async () => {
      const mockLogsResponse: ServerLogsResponse = {
        server_id: 1,
        logs: ["[INFO] Recent log entry"],
        total_lines: 1,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockLogsResponse)
      );

      const result = await getServerLogs(1, 10);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/logs?lines=10"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockLogsResponse);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServerLogs(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("sendServerCommand", () => {
    test("should send server command successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await sendServerCommand(1, "say Hello World");

      const expectedRequest: ServerCommandRequest = {
        command: "say Hello World",
      };

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/1/command",
        {
          method: "POST",
          body: JSON.stringify(expectedRequest),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await sendServerCommand(1, "invalid-command");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getSupportedVersions", () => {
    test("should return supported versions on success", async () => {
      const mockVersionsResponse = {
        versions: ["1.21.5", "1.21.4", "1.21.3"],
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockVersionsResponse)
      );

      const result = await getSupportedVersions();

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/versions/supported"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(["1.21.5", "1.21.4", "1.21.3"]);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getSupportedVersions();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("syncServerStates", () => {
    test("should sync server states successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await syncServerStates();

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers/sync",
        {
          method: "POST",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await syncServerStates();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getServerTemplates", () => {
    test("should return empty array (placeholder implementation)", async () => {
      const result = await getServerTemplates();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("getServerBackups", () => {
    test("should return transformed backups on success", async () => {
      const mockAPIResponse = {
        backups: [
          {
            id: 1,
            server_id: 1,
            name: "test-backup",
            description: "Test backup",
            file_size: 1024000,
            created_at: "2023-01-01T00:00:00Z",
            backup_type: "manual" as const,
            file_path: "/path/to/backup.zip",
          },
        ],
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockAPIResponse)
      );

      const result = await getServerBackups(1);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/servers/1/backups"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          {
            id: 1,
            server_id: 1,
            name: "test-backup",
            description: "Test backup",
            size_bytes: 1024000, // Transformed from file_size
            created_at: "2023-01-01T00:00:00Z",
            backup_type: "manual",
            file_path: "/path/to/backup.zip",
          },
        ]);
      }
    });

    test("should handle empty backups array", async () => {
      const mockAPIResponse = {
        backups: [],
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockAPIResponse)
      );

      const result = await getServerBackups(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    test("should handle missing backups property", async () => {
      const mockAPIResponse = {};

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockAPIResponse)
      );

      const result = await getServerBackups(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServerBackups(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("createBackup", () => {
    test("should create backup successfully", async () => {
      const mockAPIResponse = {
        id: 1,
        server_id: 1,
        name: "new-backup",
        description: "",
        file_size: 2048000,
        created_at: "2023-01-01T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/path/to/new-backup.zip",
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockAPIResponse)
      );

      const result = await createBackup(1, "new-backup");

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/servers/1/backups",
        {
          method: "POST",
          body: JSON.stringify({
            name: "new-backup",
            description: "",
            backup_type: "manual",
          }),
        }
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: 1,
          server_id: 1,
          name: "new-backup",
          description: "",
          size_bytes: 2048000, // Transformed from file_size
          created_at: "2023-01-01T00:00:00Z",
          backup_type: "manual",
          file_path: "/path/to/new-backup.zip",
        });
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await createBackup(1, "failed-backup");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("restoreBackup", () => {
    test("should restore backup successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await restoreBackup(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1/restore",
        {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
          }),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await restoreBackup(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("deleteBackup", () => {
    test("should delete backup successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await deleteBackup(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1",
        {
          method: "DELETE",
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await deleteBackup(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("downloadBackup", () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;

    test("should download backup successfully", async () => {
      const mockBlob = new Blob(["backup content"], {
        type: "application/zip",
      });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);
      (
        tokenManager.getValidAccessToken as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce("test-token");

      const result = await downloadBackup(1);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1/download",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        }
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockBlob);
      }
    });

    test("should download backup without token", async () => {
      const mockBlob = new Blob(["backup content"], {
        type: "application/zip",
      });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);
      (
        tokenManager.getValidAccessToken as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const result = await downloadBackup(1);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1/download",
        {
          headers: {},
        }
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockBlob);
      }
    });

    test("should handle HTTP error response with JSON", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('{"message": "Backup not found"}'),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await downloadBackup(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Backup not found");
        expect(result.error.status).toBe(404);
      }
    });

    test("should handle HTTP error response with detail field", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('{"detail": "Access denied"}'),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await downloadBackup(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Access denied");
        expect(result.error.status).toBe(403);
      }
    });

    test("should handle HTTP error response with plain text", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await downloadBackup(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Internal Server Error");
        expect(result.error.status).toBe(500);
      }
    });

    test("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const result = await downloadBackup(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Network failure");
        expect(result.error.status).toBe(0);
      }
    });

    test("should handle unknown error", async () => {
      mockFetch.mockRejectedValueOnce("Unknown error");

      const result = await downloadBackup(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Network error");
        expect(result.error.status).toBe(0);
      }
    });
  });

  describe("advancedRestoreBackup", () => {
    test("should restore backup with options (uses basic restore)", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await advancedRestoreBackup(1, {
        preservePlayerData: true,
        restoreSettings: false,
      });

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1/restore",
        {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
          }),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should restore backup without options", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const result = await advancedRestoreBackup(1);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backups/backups/1/restore",
        {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
          }),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await advancedRestoreBackup(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("getServerPlayers", () => {
    test("should return empty array (placeholder implementation)", async () => {
      const result = await getServerPlayers(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("addPlayerToWhitelist", () => {
    test("should return success (placeholder implementation)", async () => {
      const result = await addPlayerToWhitelist(1, "testplayer");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeUndefined();
      }
    });
  });

  describe("removePlayerFromWhitelist", () => {
    test("should return success (placeholder implementation)", async () => {
      const result = await removePlayerFromWhitelist(1, "testplayer");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeUndefined();
      }
    });
  });

  describe("giveOpPermission", () => {
    test("should return success (placeholder implementation)", async () => {
      const result = await giveOpPermission(1, "testplayer");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeUndefined();
      }
    });
  });

  describe("removeOpPermission", () => {
    test("should return success (placeholder implementation)", async () => {
      const result = await removeOpPermission(1, "testplayer");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeUndefined();
      }
    });
  });

  describe("getServerPropertiesFile", () => {
    test("should return properties file content on success", async () => {
      const mockResponse = {
        content: "server-port=25565\nmax-players=20\n",
        encoding: "utf-8",
        file_info: {},
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockResponse)
      );

      const result = await getServerPropertiesFile(1);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/server.properties/read"
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("server-port=25565\nmax-players=20\n");
      }
    });

    test("should return error on failure", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServerPropertiesFile(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("parseServerProperties", () => {
    test("should parse simple properties correctly", () => {
      const content = `server-port=25565
max-players=20
motd=A Minecraft Server
enable-whitelist=true
difficulty=easy`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        "max-players": 20,
        motd: "A Minecraft Server",
        "enable-whitelist": true,
        difficulty: "easy",
      });
    });

    test("should handle comments and empty lines", () => {
      const content = `#Minecraft server properties
#Mon Jan 01 00:00:00 UTC 2023

server-port=25565
# This is a comment
max-players=20

motd=A Minecraft Server`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        "max-players": 20,
        motd: "A Minecraft Server",
      });
    });

    test("should handle boolean values", () => {
      const content = `enable-whitelist=true
online-mode=false`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "enable-whitelist": true,
        "online-mode": false,
      });
    });

    test("should handle numeric values", () => {
      const content = `server-port=25565
max-players=20
view-distance=10`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        "max-players": 20,
        "view-distance": 10,
      });
    });

    test("should handle empty values", () => {
      const content = `server-port=25565
motd=
level-seed=`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        motd: "",
        "level-seed": "",
      });
    });

    test("should handle malformed lines", () => {
      const content = `server-port=25565
no-equals-sign
=no-key
max-players=20`;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        "max-players": 20,
        "": "no-key", // This line has =no-key which creates an empty key
      });
    });

    test("should handle whitespace around keys and values", () => {
      const content = `  server-port  =  25565  
  max-players=20  `;

      const result = parseServerProperties(content);

      expect(result).toEqual({
        "server-port": 25565,
        "max-players": 20,
      });
    });
  });

  describe("stringifyServerProperties", () => {
    test("should generate properties file content", () => {
      const properties: ServerProperties = {
        "server-port": 25565,
        "max-players": 20,
        motd: "A Minecraft Server",
        "enable-whitelist": true,
        difficulty: "easy",
      };

      const result = stringifyServerProperties(properties);

      // Check that it contains header comments
      expect(result).toContain("#Minecraft server properties");
      expect(result).toContain("#");

      // Check that all properties are included
      expect(result).toContain("server-port=25565");
      expect(result).toContain("max-players=20");
      expect(result).toContain("motd=A Minecraft Server");
      expect(result).toContain("enable-whitelist=true");
      expect(result).toContain("difficulty=easy");

      // Check that properties are sorted
      const lines = result.split("\n").filter((line) => line.includes("="));
      const keys = lines.map((line) => line.split("=")[0]);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });

    test("should handle empty properties object", () => {
      const properties: ServerProperties = {};

      const result = stringifyServerProperties(properties);

      expect(result).toContain("#Minecraft server properties");
      expect(result).toContain("#");
      // Should only contain header comments
      expect(
        result.split("\n").filter((line) => line.includes("="))
      ).toHaveLength(0);
    });

    test("should handle various data types", () => {
      const properties: ServerProperties = {
        "string-prop": "test",
        "number-prop": 42,
        "boolean-prop": true,
        "boolean-false": false,
      };

      const result = stringifyServerProperties(properties);

      expect(result).toContain("boolean-false=false");
      expect(result).toContain("boolean-prop=true");
      expect(result).toContain("number-prop=42");
      expect(result).toContain("string-prop=test");
    });
  });

  describe("getServerProperties", () => {
    test("should return parsed properties on success", async () => {
      const mockFileContent = "server-port=25565\nmax-players=20\n";
      const mockResponse = {
        content: mockFileContent,
        encoding: "utf-8",
        file_info: {},
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockResponse)
      );

      const result = await getServerProperties(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          "server-port": 25565,
          "max-players": 20,
        });
      }
    });

    test("should return error when file read fails", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await getServerProperties(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });

    // Note: Parsing error test is complex to mock due to direct function imports
    // The actual parseServerProperties function is robust and rarely throws
    // In practice, the main error source would be from file reading, not parsing
  });

  describe("writeServerPropertiesFile", () => {
    test("should write properties file successfully", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const content = "server-port=25565\nmax-players=20\n";
      const result = await writeServerPropertiesFile(1, content);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/server.properties",
        {
          method: "PUT",
          body: JSON.stringify({
            content: content,
            encoding: "utf-8",
            create_backup: true,
          }),
        }
      );
      expect(result.isOk()).toBe(true);
    });

    test("should return error on failure", async () => {
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const result = await writeServerPropertiesFile(1, "invalid-content");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("updateServerProperties", () => {
    test("should update properties successfully", async () => {
      const mockFileContent = "server-port=25565\nmax-players=20\n";
      const mockFileResponse = {
        content: mockFileContent,
        encoding: "utf-8",
        file_info: {},
      };

      // Mock file read success
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockFileResponse)
      );

      // Mock file write success
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(undefined)
      );

      const updates: Partial<ServerProperties> = {
        "max-players": 30,
        motd: "New MOTD",
      };

      const result = await updateServerProperties(1, updates);

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/server.properties/read"
      );

      // Verify that the write was called with merged properties
      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/server.properties",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("max-players=30"),
        })
      );

      expect(result.isOk()).toBe(true);
    });

    test("should return error when file read fails", async () => {
      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const updates: Partial<ServerProperties> = {
        "max-players": 30,
      };

      const result = await updateServerProperties(1, updates);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });

    // Note: Parsing error test is complex to mock due to direct function imports
    // The actual parseServerProperties function is robust and rarely throws
    // In practice, the main error source would be from file reading, not parsing

    test("should return error when file write fails", async () => {
      const mockFileContent = "server-port=25565\nmax-players=20\n";
      const mockFileResponse = {
        content: mockFileContent,
        encoding: "utf-8",
        file_info: {},
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockFileResponse)
      );
      (fetchEmpty as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(mockAuthError)
      );

      const updates: Partial<ServerProperties> = {
        "max-players": 30,
      };

      const result = await updateServerProperties(1, updates);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(mockAuthError);
      }
    });
  });

  describe("API URL configuration", () => {
    test("should use API URL from environment", async () => {
      // The API_BASE_URL is determined at module load time, not at runtime
      // So we can't dynamically change process.env.NEXT_PUBLIC_API_URL and expect it to work
      // Instead, let's test that the function makes the expected call with the current env

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok({ servers: [], total: 0, page: 1, size: 10 })
      );

      await getServers();

      // Should use the API URL that was set in beforeEach (http://localhost:8000)
      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/servers"
      );
    });
  });
});
