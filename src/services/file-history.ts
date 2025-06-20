import { Result, ok, err } from "neverthrow";
import { fetchWithErrorHandling } from "./api";
import type {
  FileHistoryListResponse,
  FileVersionContentResponse,
  RestoreFromVersionRequest,
  RestoreResponse,
  DeleteVersionResponse,
} from "@/types/files";

/**
 * Get file edit history
 */
export async function getFileHistory(
  serverId: number,
  filePath: string,
  limit: number = 20
): Promise<Result<FileHistoryListResponse, string>> {
  const encodedPath = encodeURIComponent(filePath);
  const result = await fetchWithErrorHandling<FileHistoryListResponse>(
    `/api/v1/files/servers/${serverId}/files/${encodedPath}/history?limit=${limit}`
  );

  if (result.isErr()) {
    return err(result.error.message);
  }

  return ok(result.value);
}

/**
 * Get specific version content
 */
export async function getFileVersionContent(
  serverId: number,
  filePath: string,
  version: number
): Promise<Result<FileVersionContentResponse, string>> {
  const encodedPath = encodeURIComponent(filePath);
  const result = await fetchWithErrorHandling<FileVersionContentResponse>(
    `/api/v1/files/servers/${serverId}/files/${encodedPath}/history/${version}`
  );

  if (result.isErr()) {
    return err(result.error.message);
  }

  return ok(result.value);
}

/**
 * Restore file from specific version
 */
export async function restoreFileFromVersion(
  serverId: number,
  filePath: string,
  version: number,
  request: RestoreFromVersionRequest = { create_backup_before_restore: true }
): Promise<Result<RestoreResponse, string>> {
  const encodedPath = encodeURIComponent(filePath);
  const result = await fetchWithErrorHandling<RestoreResponse>(
    `/api/v1/files/servers/${serverId}/files/${encodedPath}/history/${version}/restore`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (result.isErr()) {
    return err(result.error.message);
  }

  return ok(result.value);
}

/**
 * Delete specific file version (admin only)
 */
export async function deleteFileVersion(
  serverId: number,
  filePath: string,
  version: number
): Promise<Result<DeleteVersionResponse, string>> {
  const encodedPath = encodeURIComponent(filePath);
  const result = await fetchWithErrorHandling<DeleteVersionResponse>(
    `/api/v1/files/servers/${serverId}/files/${encodedPath}/history/${version}`,
    {
      method: "DELETE",
    }
  );

  if (result.isErr()) {
    return err(result.error.message);
  }

  return ok(result.value);
}
