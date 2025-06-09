import { ok, err, type Result } from "neverthrow";
import type {
  FileSystemItem,
  FileContent,
  FileUploadRequest,
  FileError,
  FileReadResponse,
} from "@/types/files";
import { fetchWithErrorHandling } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FileListResponse {
  files: FileSystemItem[];
  current_path: string;
  total_files: number;
}

export async function listFiles(
  serverId: number,
  path: string = "/"
): Promise<Result<FileSystemItem[], FileError>> {
  // Use query parameter for path
  const cleanPath = path === "/" ? "" : path.startsWith("/") ? path.slice(1) : path;
  const params = cleanPath ? `?path=${encodeURIComponent(cleanPath)}` : "";
  const url = `${API_BASE_URL}/api/v1/files/servers/${serverId}/files${params}`;
    
  const result = await fetchWithErrorHandling<FileListResponse>(url);
  
  if (result.isErr()) {
    console.error("File listing failed:", {
      status: result.error.status,
      message: result.error.message,
      url
    });
    // Return a more user-friendly error message
    const errorMessage = result.error.message === "Failed to fetch" 
      ? "Unable to connect to file service. Please check if the server is running."
      : result.error.message;
    return err({
      message: errorMessage,
      status: result.error.status,
    });
  }
  
  // Return files array directly or empty array if not provided
  return ok(result.value.files || []);
}

export async function readFile(
  serverId: number,
  filePath: string,
  isImage: boolean = false
): Promise<Result<FileReadResponse, FileError>> {
  // Remove leading slash and encode path
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  // Add image parameter if requested
  const params = isImage ? "?image=true" : "";
  
  const result = await fetchWithErrorHandling<FileReadResponse>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}/read${params}`
  );
  
  if (result.isErr()) {
    return err({
      message: result.error.message,
      status: result.error.status,
    });
  }
  
  return ok(result.value);
}

// Legacy function for backward compatibility with existing code
export async function readTextFile(
  serverId: number,
  filePath: string
): Promise<Result<FileContent, FileError>> {
  const result = await readFile(serverId, filePath, false);
  
  if (result.isErr()) {
    return err(result.error);
  }
  
  // Transform to match legacy FileContent interface
  return ok({
    content: result.value.content,
    encoding: result.value.encoding,
    size: result.value.file_info.size,
    modified: result.value.file_info.modified,
  });
}

export async function writeFile(
  serverId: number,
  filePath: string,
  fileData: FileUploadRequest
): Promise<Result<void, FileError>> {
  // Remove leading slash and encode path
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}`,
    {
      method: "PUT",
      body: JSON.stringify(fileData),
    }
  );
  
  if (result.isErr()) {
    return err({
      message: result.error.message,
      status: result.error.status,
    });
  }
  
  return ok(undefined);
}

export async function deleteFile(
  serverId: number,
  filePath: string
): Promise<Result<void, FileError>> {
  // Remove leading slash and encode path
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}`,
    {
      method: "DELETE",
    }
  );
  
  if (result.isErr()) {
    return err({
      message: result.error.message,
      status: result.error.status,
    });
  }
  
  return ok(undefined);
}


export async function createDirectory(
  serverId: number,
  dirPath: string,
  dirName: string
): Promise<Result<void, FileError>> {
  // Remove leading slash and encode path
  const cleanPath = dirPath.startsWith("/") ? dirPath.slice(1) : dirPath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}/directories`,
    {
      method: "POST",
      body: JSON.stringify({ name: dirName }),
    }
  );
  
  if (result.isErr()) {
    return err({
      message: result.error.message,
      status: result.error.status,
    });
  }
  
  return ok(undefined);
}

export async function uploadFile(
  serverId: number,
  targetPath: string,
  file: File
): Promise<Result<void, FileError>> {
  const formData = new FormData();
  formData.append("file", file);
  
  // Add path parameter if not root
  if (targetPath && targetPath !== "/") {
    const cleanPath = targetPath.startsWith("/") ? targetPath.slice(1) : targetPath;
    formData.append("path", cleanPath);
  }
  
  const result = await fetchWithErrorHandling<Record<string, unknown>>(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/upload`,
    {
      method: "POST",
      body: formData,
    }
  );
  
  if (result.isErr()) {
    return err({
      message: result.error.message,
      status: result.error.status,
    });
  }
  
  return ok(undefined);
}

export async function downloadFile(
  serverId: number,
  filePath: string
): Promise<Result<Blob, FileError>> {
  // Remove leading slash and encode path
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  try {
    const token = localStorage.getItem("access_token");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}/download`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Download failed";
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      return err({
        message: errorMessage,
        status: response.status,
      });
    }

    const blob = await response.blob();
    return ok(blob);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
    });
  }
}