type FileType = "text" | "directory" | "binary" | "other";

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

export interface FileReadResponse {
  content: string;
  encoding: string;
  file_info: {
    name: string;
    size: number;
    modified: string;
    permissions: Record<string, boolean>;
  };
  is_image?: boolean;
  image_data?: string | null;
}

export interface FileUploadRequest {
  content: string;
  encoding?: string;
  create_backup?: boolean;
}

export interface FileError {
  message: string;
  status?: number;
  code?: string;
}

// File history types
export interface FileHistoryRecord {
  id: number;
  server_id: number;
  file_path: string;
  version_number: number;
  backup_file_path: string;
  file_size: number;
  content_hash: string | null;
  editor_user_id: number | null;
  editor_username: string | null;
  created_at: string;
  description: string | null;
}

export interface FileHistoryListResponse {
  file_path: string;
  total_versions: number;
  history: FileHistoryRecord[];
}

export interface FileVersionContentResponse {
  file_path: string;
  version_number: number;
  content: string;
  encoding: string;
  created_at: string;
  editor_username: string | null;
  description: string | null;
}

export interface RestoreFromVersionRequest {
  create_backup_before_restore?: boolean;
  description?: string | null;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  new_version?: FileHistoryRecord;
}

export interface DeleteVersionResponse {
  success: boolean;
  message: string;
}
