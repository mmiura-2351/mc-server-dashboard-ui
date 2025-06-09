import { ok, err, type Result } from "neverthrow";
import type {
  FileSystemItem,
  FileContent,
  FileUploadRequest,
  FileError,
  FileReadResponse,
} from "@/types/files";
import { fetchJson, fetchEmpty } from "@/services/api";

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
  const cleanPath =
    path === "/" ? "" : path.startsWith("/") ? path.slice(1) : path;
  const params = cleanPath ? `?path=${encodeURIComponent(cleanPath)}` : "";
  const url = `${API_BASE_URL}/api/v1/files/servers/${serverId}/files${params}`;

  const result = await fetchJson<FileListResponse>(url);

  if (result.isErr()) {
    console.error("File listing failed:", {
      status: result.error.status,
      message: result.error.message,
      url,
    });
    // Return a more user-friendly error message
    const errorMessage =
      result.error.message === "Failed to fetch"
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

  const result = await fetchJson<FileReadResponse>(
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

  const result = await fetchEmpty(
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

  const result = await fetchEmpty(
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

export async function renameFile(
  serverId: number,
  filePath: string,
  newName: string
): Promise<Result<void, FileError>> {
  // Remove leading slash and encode paths
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const encodedPath = encodeURIComponent(cleanPath);

  const result = await fetchEmpty(
    `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/${encodedPath}/rename`,
    {
      method: "PATCH",
      body: JSON.stringify({ new_name: newName }),
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

  const result = await fetchEmpty(
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
    const cleanPath = targetPath.startsWith("/")
      ? targetPath.slice(1)
      : targetPath;
    formData.append("path", cleanPath);
  }

  const result = await fetchEmpty(
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

// Progress callback type for upload tracking
export type UploadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percentage: number;
  filename: string;
}) => void;

// Upload multiple files to the same directory
export async function uploadMultipleFiles(
  serverId: number,
  targetPath: string,
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<
  Result<
    { successful: string[]; failed: { file: string; error: string }[] },
    FileError
  >
> {
  const successful: string[] = [];
  const failed: { file: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // Create progress callback for this specific file
      const fileProgressCallback = onProgress
        ? (loaded: number, total: number) => {
            onProgress({
              loaded,
              total,
              percentage: Math.round((loaded / total) * 100),
              filename: file.name,
            });
          }
        : undefined;

      const result = await uploadFileWithProgress(
        serverId,
        targetPath,
        file,
        fileProgressCallback
      );

      if (result.isOk()) {
        successful.push(file.name);
      } else {
        failed.push({ file: file.name, error: result.error.message });
      }
    } catch (error) {
      failed.push({
        file: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return ok({ successful, failed });
}

// Upload file with progress tracking
export async function uploadFileWithProgress(
  serverId: number,
  targetPath: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<Result<void, FileError>> {
  return new Promise((resolve) => {
    const formData = new FormData();

    // For files with webkitRelativePath, send the file with the relative path as filename
    const fileWebkitPath = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    if (fileWebkitPath && fileWebkitPath.includes("/")) {
      // Create new file with relative path as name to preserve folder structure
      const fileWithPath = new File([file], fileWebkitPath, {
        type: file.type,
        lastModified: file.lastModified,
      });
      formData.append("file", fileWithPath);
    } else {
      formData.append("file", file);
    }

    // Add path parameter if not root
    if (targetPath && targetPath !== "/") {
      const cleanPath = targetPath.startsWith("/")
        ? targetPath.slice(1)
        : targetPath;
      formData.append("path", cleanPath);
    }

    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      });
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(ok(undefined));
      } else {
        let errorMessage = "Upload failed";
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = xhr.responseText || `HTTP ${xhr.status}`;
        }

        resolve(
          err({
            message: errorMessage,
            status: xhr.status,
          })
        );
      }
    };

    xhr.onerror = () => {
      resolve(
        err({
          message: "Network error during upload",
        })
      );
    };

    // Open the request first
    xhr.open(
      "POST",
      `${API_BASE_URL}/api/v1/files/servers/${serverId}/files/upload`
    );

    // Add authorization header after opening
    const token = localStorage.getItem("access_token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

// Upload folder structure preserving directory hierarchy
export async function uploadFolderStructure(
  serverId: number,
  targetPath: string,
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<
  Result<
    { successful: string[]; failed: { file: string; error: string }[] },
    FileError
  >
> {
  const successful: string[] = [];
  const failed: { file: string; error: string }[] = [];

  // Group files by directory to create directories first
  const directories = new Set<string>();
  const filesByDir = new Map<string, File[]>();

  for (const file of files) {
    // Extract directory path from file.webkitRelativePath
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    const pathParts = relativePath.split("/");

    if (pathParts.length > 1) {
      // This file is in a subdirectory
      const dirPath = pathParts.slice(0, -1).join("/");
      directories.add(dirPath);

      // Build nested directory paths
      let currentPath = "";
      for (const part of pathParts.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        directories.add(currentPath);
      }
    }

    const fileDir =
      pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
    if (!filesByDir.has(fileDir)) {
      filesByDir.set(fileDir, []);
    }
    filesByDir.get(fileDir)!.push(file);
  }

  // Create directories first (API might auto-create, but this ensures proper structure)
  for (const _dirPath of Array.from(directories).sort()) {
    try {
      const _fullDirPath =
        targetPath === "/" ? _dirPath : `${targetPath}/${_dirPath}`;
      // Note: createDirectory API might need to be called for each nested directory
      // For now, we'll rely on the upload API to create directories as needed
    } catch {
      // Directory creation errors are non-fatal, continue with file uploads
    }
  }

  // Upload files maintaining directory structure
  for (const [_dirPath, dirFiles] of filesByDir.entries()) {
    for (const file of dirFiles) {
      const relativePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;

      // Calculate the correct target path for this file
      let fileTargetPath: string;
      if (relativePath.includes("/")) {
        // File has a directory structure - extract the directory part
        const pathParts = relativePath.split("/");
        const fileDir = pathParts.slice(0, -1).join("/");
        fileTargetPath =
          targetPath === "/" ? fileDir : `${targetPath}/${fileDir}`;
      } else {
        // File is in the root of the uploaded folder
        fileTargetPath = targetPath;
      }

      try {
        const fileProgressCallback = onProgress
          ? (loaded: number, total: number) => {
              onProgress({
                loaded,
                total,
                percentage: Math.round((loaded / total) * 100),
                filename: relativePath,
              });
            }
          : undefined;

        const result = await uploadFileWithProgress(
          serverId,
          fileTargetPath,
          file,
          fileProgressCallback
        );

        if (result.isOk()) {
          successful.push(relativePath);
        } else {
          failed.push({ file: relativePath, error: result.error.message });
        }
      } catch (error) {
        failed.push({
          file: relativePath,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return ok({ successful, failed });
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
