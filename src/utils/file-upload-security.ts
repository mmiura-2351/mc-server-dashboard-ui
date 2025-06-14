/**
 * File upload security utilities
 */
import { InputSanitizer } from "./input-sanitizer";

export interface FileValidationOptions {
  maxFileSize?: number; // in bytes
  maxTotalSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  blockDangerousExtensions?: boolean;
  maxFiles?: number;
  scanForMalware?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFiles: File[];
}

export interface UploadSecurityResult {
  allowed: File[];
  blocked: Array<{ file: File; reason: string }>;
  warnings: string[];
}

/**
 * Default security configuration for file uploads
 */
export const DEFAULT_UPLOAD_CONFIG: FileValidationOptions = {
  maxFileSize: 100 * 1024 * 1024, // 100MB per file
  maxTotalSize: 500 * 1024 * 1024, // 500MB total
  maxFiles: 50,
  blockDangerousExtensions: true,
  allowedExtensions: [
    // Text files
    "txt",
    "log",
    "properties",
    "json",
    "yml",
    "yaml",
    "xml",
    "toml",
    // Config files
    "conf",
    "cfg",
    "ini",
    "env",
    // Server files
    "jar",
    "zip",
    "tar",
    "gz",
    "bz2",
    // Media (for resource packs)
    "png",
    "jpg",
    "jpeg",
    "gif",
    "ogg",
    "wav",
    // Scripts (with caution)
    "sh",
    "bat",
    "ps1",
  ],
  allowedMimeTypes: [
    "text/plain",
    "text/x-log",
    "application/json",
    "application/xml",
    "text/xml",
    "application/x-yaml",
    "text/yaml",
    "application/java-archive",
    "application/zip",
    "application/x-tar",
    "application/gzip",
    "image/png",
    "image/jpeg",
    "image/gif",
    "audio/ogg",
    "audio/wav",
    "application/octet-stream", // For many server files
  ],
};

/**
 * Dangerous file extensions that should be blocked by default
 */
const DANGEROUS_EXTENSIONS = [
  "exe",
  "scr",
  "com",
  "bat",
  "cmd",
  "pif",
  "vbs",
  "js",
  "jar",
  "msi",
  "dll",
  "sys",
  "scf",
  "lnk",
  "url",
  "reg",
  "hta",
  "php",
  "asp",
  "aspx",
  "jsp",
  "pl",
  "py",
  "rb",
  "cgi",
];

/**
 * Known malware file signatures (basic detection)
 */
const MALWARE_SIGNATURES = [
  new Uint8Array([0x4d, 0x5a]), // PE executable
  new Uint8Array([0x7f, 0x45, 0x4c, 0x46]), // ELF executable
  new Uint8Array([0xca, 0xfe, 0xba, 0xbe]), // Java class file
  new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // ZIP (need careful analysis)
];

export class FileUploadSecurity {
  /**
   * Validate a list of files before upload
   */
  static async validateFiles(
    files: File[],
    options: FileValidationOptions = DEFAULT_UPLOAD_CONFIG
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedFiles: File[] = [];

    // Check total number of files
    if (options.maxFiles && files.length > options.maxFiles) {
      errors.push(
        `Too many files selected. Maximum allowed: ${options.maxFiles}`
      );
      return { isValid: false, errors, warnings, sanitizedFiles };
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (options.maxTotalSize && totalSize > options.maxTotalSize) {
      errors.push(
        `Total file size exceeds limit of ${Math.round(options.maxTotalSize / 1024 / 1024)}MB`
      );
      return { isValid: false, errors, warnings, sanitizedFiles };
    }

    // Validate each file
    for (const file of files) {
      const fileValidation = await this.validateSingleFile(file, options);

      if (!fileValidation.isValid) {
        errors.push(`${file.name}: ${fileValidation.errors.join(", ")}`);
        continue;
      }

      if (fileValidation.warnings.length > 0) {
        warnings.push(`${file.name}: ${fileValidation.warnings.join(", ")}`);
      }

      if (fileValidation.sanitizedFile) {
        sanitizedFiles.push(fileValidation.sanitizedFile);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedFiles: sanitizedFiles.length > 0 ? sanitizedFiles : files,
    };
  }

  /**
   * Validate a single file
   */
  static async validateSingleFile(
    file: File,
    options: FileValidationOptions = DEFAULT_UPLOAD_CONFIG
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedFile?: File;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Sanitize filename
    const sanitizedFilename = InputSanitizer.sanitizeFilePath(file.name);
    if (sanitizedFilename !== file.name) {
      warnings.push("Filename has been sanitized for security");
    }

    // Check file size
    if (options.maxFileSize && file.size > options.maxFileSize) {
      errors.push(
        `File size exceeds limit of ${Math.round(options.maxFileSize / 1024 / 1024)}MB`
      );
    }

    // Check file extension
    const extension = sanitizedFilename.split(".").pop()?.toLowerCase();
    if (!extension) {
      errors.push("File must have an extension");
    } else {
      // Check dangerous extensions
      if (
        options.blockDangerousExtensions &&
        DANGEROUS_EXTENSIONS.includes(extension)
      ) {
        errors.push(
          `File type .${extension} is potentially dangerous and not allowed`
        );
      }

      // Check allowed extensions
      if (
        options.allowedExtensions &&
        !options.allowedExtensions.includes(extension)
      ) {
        errors.push(`File type .${extension} is not allowed`);
      }
    }

    // Check MIME type
    if (
      options.allowedMimeTypes &&
      !options.allowedMimeTypes.includes(file.type)
    ) {
      // Allow empty MIME type for some files (common with uploads)
      if (file.type !== "") {
        warnings.push(`MIME type ${file.type} may not be fully supported`);
      }
    }

    // Basic malware detection
    if (options.scanForMalware) {
      const hasMalwareSignature = await this.checkMalwareSignatures(file);
      if (hasMalwareSignature) {
        errors.push("File appears to contain suspicious content");
      }
    }

    // Create sanitized file if needed
    let sanitizedFile: File | undefined;
    if (sanitizedFilename !== file.name) {
      sanitizedFile = new File([file], sanitizedFilename, {
        type: file.type,
        lastModified: file.lastModified,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedFile,
    };
  }

  /**
   * Basic malware signature detection
   */
  private static async checkMalwareSignatures(file: File): Promise<boolean> {
    if (file.size < 4) return false;

    try {
      // Read first 1KB of file for signature analysis
      const chunk = file.slice(0, 1024);
      const arrayBuffer = await chunk.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Check for known malware signatures
      for (const signature of MALWARE_SIGNATURES) {
        if (this.bytesStartWith(bytes, signature)) {
          // Additional checks for ZIP files (could be legitimate JAR files)
          if (signature[0] === 0x50 && signature[1] === 0x4b) {
            // ZIP signature - check if it's a JAR file
            const filename = file.name.toLowerCase();
            if (filename.endsWith(".jar") || filename.endsWith(".zip")) {
              continue; // Allow JAR and ZIP files
            }
            return true; // Block other ZIP-based executables
          }
          return true;
        }
      }

      return false;
    } catch {
      // If we can't read the file, it might be corrupted
      return true;
    }
  }

  /**
   * Check if bytes start with a specific signature
   */
  private static bytesStartWith(
    bytes: Uint8Array,
    signature: Uint8Array
  ): boolean {
    if (bytes.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) return false;
    }

    return true;
  }

  /**
   * Filter files into allowed and blocked lists
   */
  static async securityFilter(
    files: File[],
    options: FileValidationOptions = DEFAULT_UPLOAD_CONFIG
  ): Promise<UploadSecurityResult> {
    const allowed: File[] = [];
    const blocked: Array<{ file: File; reason: string }> = [];
    const warnings: string[] = [];

    for (const file of files) {
      const validation = await this.validateSingleFile(file, options);

      if (validation.isValid) {
        allowed.push(validation.sanitizedFile || file);
        if (validation.warnings.length > 0) {
          warnings.push(`${file.name}: ${validation.warnings.join(", ")}`);
        }
      } else {
        blocked.push({
          file,
          reason: validation.errors.join(", "),
        });
      }
    }

    return { allowed, blocked, warnings };
  }

  /**
   * Get security recommendations for file uploads
   */
  static getSecurityRecommendations(): string[] {
    return [
      "Only upload files from trusted sources",
      "Scan files with antivirus before uploading",
      "Avoid uploading executable files unless necessary",
      "Keep file sizes reasonable to prevent resource exhaustion",
      "Verify file contents match their extensions",
      "Use server-side validation in addition to client-side checks",
    ];
  }
}
