import { ok, err, type Result } from "neverthrow";
import type {
  FileSystemItem,
  FileContent,
  FileUploadRequest,
  FileError,
  FileReadResponse,
} from "@/types/files";
import { fetchJson, fetchEmpty } from "@/services/api";
import { tokenManager } from "@/utils/token-manager";
import type JSZip from "jszip";

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

  // Add destination_path parameter if not root
  if (targetPath && targetPath !== "/") {
    const cleanPath = targetPath.startsWith("/")
      ? targetPath.slice(1)
      : targetPath;
    formData.append("destination_path", cleanPath);
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
              filename: file?.name || `File ${i + 1}`,
            });
          }
        : undefined;

      if (!file) {
        failed.push({ file: `File ${i + 1}`, error: "missing" });
        continue;
      }

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
        file: file?.name || `File ${i + 1}`,
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
  // Get token before creating Promise to handle async properly
  const token = await tokenManager.getValidAccessToken();

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

    // Add destination_path parameter if not root
    if (targetPath && targetPath !== "/") {
      const cleanPath = targetPath.startsWith("/")
        ? targetPath.slice(1)
        : targetPath;
      formData.append("destination_path", cleanPath);
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

    xhr.onload = () => {
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

      // For folder uploads, use the original targetPath as destination
      // The file structure is preserved via webkitRelativePath in the filename
      const fileTargetPath = targetPath;

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
    const token = await tokenManager.getValidAccessToken();
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

// Progress callback type for ZIP creation tracking
export type ZipProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  currentFile: string;
  stage: "downloading" | "zipping" | "finalizing";
}) => void;

// Download multiple files/folders as ZIP (client-side)
export async function downloadAsZip(
  serverId: number,
  files: FileSystemItem[],
  currentPath: string,
  onProgress?: ZipProgressCallback
): Promise<Result<{ blob: Blob; filename: string }, FileError>> {
  try {
    // Dynamic import JSZip to avoid SSR issues
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const totalFiles = files.length;
    let processedFiles = 0;

    // Generate ZIP filename based on selection
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename =
      files.length === 1
        ? `${files[0]?.name || "file"}_${timestamp}.zip`
        : `files_${timestamp}.zip`;

    onProgress?.({
      current: 0,
      total: totalFiles,
      percentage: 0,
      currentFile: "Starting...",
      stage: "downloading",
    });

    // Process each file/folder
    for (const file of files) {
      const filePath =
        currentPath === "/" ? file.name : `${currentPath}/${file.name}`;

      onProgress?.({
        current: processedFiles,
        total: totalFiles,
        percentage: Math.round((processedFiles / totalFiles) * 50), // 50% for downloading
        currentFile: file.name,
        stage: "downloading",
      });

      if (file.is_directory) {
        // For directories, we need to list all files recursively
        await addDirectoryToZip(zip, serverId, filePath, file.name, onProgress);
      } else {
        // For individual files, download and add to ZIP
        const downloadResult = await downloadFile(serverId, filePath);
        if (downloadResult.isOk()) {
          zip.file(file.name, downloadResult.value);
        } else {
          // Continue with other files instead of failing completely
        }
      }

      processedFiles++;
    }

    onProgress?.({
      current: totalFiles,
      total: totalFiles,
      percentage: 75,
      currentFile: "Creating ZIP...",
      stage: "zipping",
    });

    // Generate ZIP file
    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        onProgress?.({
          current: totalFiles,
          total: totalFiles,
          percentage: 75 + Math.round(metadata.percent * 0.25), // 75-100% for ZIP generation
          currentFile: "Creating ZIP...",
          stage: "finalizing",
        });
      }
    );

    onProgress?.({
      current: totalFiles,
      total: totalFiles,
      percentage: 100,
      currentFile: "Complete!",
      stage: "finalizing",
    });

    return ok({ blob: zipBlob, filename });
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "ZIP creation failed",
    });
  }
}

// Helper function to recursively add directory contents to ZIP
async function addDirectoryToZip(
  zip: JSZip,
  serverId: number,
  dirPath: string,
  zipPath: string,
  onProgress?: ZipProgressCallback
): Promise<void> {
  try {
    // List directory contents
    const listResult = await listFiles(serverId, dirPath);
    if (listResult.isErr()) {
      return;
    }

    const folder = zip.folder(zipPath);
    if (!folder) {
      return;
    }

    for (const item of listResult.value) {
      const itemPath = `${dirPath}/${item.name}`;
      const itemZipPath = item.name;

      if (item.is_directory) {
        // Recursively add subdirectory
        await addDirectoryToZip(
          folder,
          serverId,
          itemPath,
          itemZipPath,
          onProgress
        );
      } else {
        // Download and add file
        const downloadResult = await downloadFile(serverId, itemPath);
        if (downloadResult.isOk()) {
          folder.file(itemZipPath, downloadResult.value);
        } else {
          // Continue with other files
        }
      }
    }
  } catch {
    // Directory processing error handled silently
  }
}
