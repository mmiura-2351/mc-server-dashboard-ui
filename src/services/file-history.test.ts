import { describe, expect, it, vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import {
  getFileHistory,
  getFileVersionContent,
  restoreFileFromVersion,
  deleteFileVersion,
} from "./file-history";
import * as api from "./api";

// Mock the API module
vi.mock("./api", () => ({
  fetchWithErrorHandling: vi.fn(),
}));

const mockFetchWithErrorHandling = vi.mocked(api.fetchWithErrorHandling);

describe("file-history service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFileHistory", () => {
    const mockHistoryResponse = {
      history: [
        {
          version: 1,
          content: "file content v1",
          timestamp: "2024-01-01T00:00:00Z",
          filesize: 100,
          created_by: "admin",
        },
        {
          version: 2,
          content: "file content v2",
          timestamp: "2024-01-02T00:00:00Z",
          filesize: 150,
          created_by: "admin",
        },
      ],
      total_versions: 2,
    };

    it("should get file history successfully", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockHistoryResponse));

      const result = await getFileHistory(1, "config/server.properties");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockHistoryResponse);
      }

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history?limit=20"
      );
    });

    it("should get file history with custom limit", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockHistoryResponse));

      const result = await getFileHistory(1, "config/server.properties", 10);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history?limit=10"
      );
    });

    it("should handle file history fetch error", async () => {
      const errorResult = err({
        status: 404,
        message: "File not found",
        details: "File does not exist",
      });
      mockFetchWithErrorHandling.mockResolvedValue(errorResult);

      const result = await getFileHistory(1, "nonexistent.txt");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("File not found");
      }
    });

    it("should properly encode file path with special characters", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockHistoryResponse));

      await getFileHistory(1, "config/file with spaces & symbols.txt");

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Ffile%20with%20spaces%20%26%20symbols.txt/history?limit=20"
      );
    });
  });

  describe("getFileVersionContent", () => {
    const mockVersionContent = {
      version: 1,
      content: "file content version 1",
      timestamp: "2024-01-01T00:00:00Z",
      filesize: 100,
      created_by: "admin",
    };

    it("should get file version content successfully", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockVersionContent));

      const result = await getFileVersionContent(
        1,
        "config/server.properties",
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockVersionContent);
      }

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history/1"
      );
    });

    it("should handle version content fetch error", async () => {
      const errorResult = err({
        status: 404,
        message: "Version not found",
        details: "Version 999 does not exist",
      });
      mockFetchWithErrorHandling.mockResolvedValue(errorResult);

      const result = await getFileVersionContent(
        1,
        "config/server.properties",
        999
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Version not found");
      }
    });

    it("should properly encode file path for version content", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockVersionContent));

      await getFileVersionContent(1, "folder/file name.txt", 5);

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/folder%2Ffile%20name.txt/history/5"
      );
    });
  });

  describe("restoreFileFromVersion", () => {
    const mockRestoreResponse = {
      success: true,
      message: "File restored successfully",
      backup_created: true,
      backup_path: "/backups/server.properties.backup.2024-01-01",
    };

    it("should restore file from version successfully with default options", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockRestoreResponse));

      const result = await restoreFileFromVersion(
        1,
        "config/server.properties",
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockRestoreResponse);
      }

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history/1/restore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ create_backup_before_restore: true }),
        }
      );
    });

    it("should restore file from version with custom options", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockRestoreResponse));

      const customRequest = { create_backup_before_restore: false };
      const result = await restoreFileFromVersion(
        1,
        "config/server.properties",
        2,
        customRequest
      );

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history/2/restore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ create_backup_before_restore: false }),
        }
      );
    });

    it("should handle restore error", async () => {
      const errorResult = err({
        status: 500,
        message: "Restore failed",
        details: "Unable to restore file",
      });
      mockFetchWithErrorHandling.mockResolvedValue(errorResult);

      const result = await restoreFileFromVersion(
        1,
        "config/server.properties",
        1
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Restore failed");
      }
    });

    it("should properly encode file path for restore", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockRestoreResponse));

      await restoreFileFromVersion(1, "plugins/config file.yml", 3);

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/plugins%2Fconfig%20file.yml/history/3/restore",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("deleteFileVersion", () => {
    const mockDeleteResponse = {
      success: true,
      message: "Version deleted successfully",
      deleted_version: 1,
    };

    it("should delete file version successfully", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockDeleteResponse));

      const result = await deleteFileVersion(1, "config/server.properties", 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockDeleteResponse);
      }

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/config%2Fserver.properties/history/1",
        {
          method: "DELETE",
        }
      );
    });

    it("should handle delete version error", async () => {
      const errorResult = err({
        status: 403,
        message: "Insufficient permissions",
        details: "Admin access required",
      });
      mockFetchWithErrorHandling.mockResolvedValue(errorResult);

      const result = await deleteFileVersion(1, "config/server.properties", 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Insufficient permissions");
      }
    });

    it("should handle non-existent version deletion", async () => {
      const errorResult = err({
        status: 404,
        message: "Version not found",
        details: "Version 999 does not exist",
      });
      mockFetchWithErrorHandling.mockResolvedValue(errorResult);

      const result = await deleteFileVersion(
        1,
        "config/server.properties",
        999
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Version not found");
      }
    });

    it("should properly encode file path for deletion", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockDeleteResponse));

      await deleteFileVersion(1, "mods/mod config.jar", 2);

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/mods%2Fmod%20config.jar/history/2",
        {
          method: "DELETE",
        }
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file path", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({}));

      await getFileHistory(1, "");

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files//history?limit=20"
      );
    });

    it("should handle zero server ID", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({}));

      await getFileHistory(0, "test.txt");

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/0/files/test.txt/history?limit=20"
      );
    });

    it("should handle negative version number", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({}));

      await getFileVersionContent(1, "test.txt", -1);

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/test.txt/history/-1"
      );
    });

    it("should handle very large limit", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({}));

      await getFileHistory(1, "test.txt", 999999);

      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/files/servers/1/files/test.txt/history?limit=999999"
      );
    });
  });
});
