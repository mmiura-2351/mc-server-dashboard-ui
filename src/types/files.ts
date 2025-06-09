export type FileType = "text" | "directory" | "binary" | "other";

export interface FileSystemItem {
  name: string;
  type: FileType;
  is_directory: boolean;
  size?: number | null;
  modified: string;
  permissions: Record<string, boolean>;
  path: string;
}

export interface FileContent {
  content: string;
  encoding: string;
  size: number;
  modified: string;
}

export interface FileUploadRequest {
  content: string;
  encoding?: string;
  create_backup?: boolean;
}

export interface DirectoryListResponse {
  files: FileSystemItem[];
  current_path: string;
  parent_path?: string;
}

export interface FileError {
  message: string;
  status?: number;
  code?: string;
}