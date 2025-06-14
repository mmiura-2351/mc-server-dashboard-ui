/**
 * Input sanitization utilities to prevent XSS and other injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    if (!input) return "";

    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Sanitize text input by removing potentially dangerous characters
   */
  static sanitizeText(input: string): string {
    if (!input) return "";

    // Remove null bytes and control characters except whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }

  /**
   * Sanitize username input with specific rules
   */
  static sanitizeUsername(input: string): string {
    if (!input) return "";

    // Remove leading/trailing whitespace and convert to lowercase
    let sanitized = input.trim().toLowerCase();

    // Remove potentially dangerous characters, keep alphanumeric, underscore, hyphen, dot
    sanitized = sanitized.replace(/[^a-z0-9._-]/g, "");

    // Prevent path traversal patterns
    sanitized = sanitized.replace(/\.\./g, "");

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input: string): string {
    if (!input) return "";

    // Remove leading/trailing whitespace and convert to lowercase
    let sanitized = input.trim().toLowerCase();

    // Basic email character validation (alphanumeric, @, ., -, _)
    sanitized = sanitized.replace(/[^a-z0-9@._-]/g, "");

    return sanitized;
  }

  /**
   * Sanitize file path to prevent path traversal attacks
   */
  static sanitizeFilePath(input: string): string {
    if (!input) return "";

    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, "");

    // Prevent path traversal
    sanitized = sanitized.replace(/\.\./g, "");

    // Remove leading dots and slashes to prevent hidden files and absolute paths
    sanitized = sanitized.replace(/^[./]+/, "");

    // Normalize multiple slashes
    sanitized = sanitized.replace(/\/+/g, "/");

    return sanitized;
  }

  /**
   * Sanitize server name with specific rules
   */
  static sanitizeServerName(input: string): string {
    if (!input) return "";

    let sanitized = input.trim();

    // Remove potentially dangerous characters, keep alphanumeric, spaces, underscores, hyphens
    sanitized = sanitized.replace(/[^a-zA-Z0-9 _-]/g, "");

    // Limit consecutive spaces
    sanitized = sanitized.replace(/\s+/g, " ");

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumeric(
    input: string,
    options: { min?: number; max?: number; integer?: boolean } = {}
  ): number | null {
    if (!input) return null;

    const { min, max, integer = false } = options;

    // Parse the number
    const parsed = integer ? parseInt(input, 10) : parseFloat(input);

    // Check if it's a valid number
    if (isNaN(parsed)) return null;

    // Apply bounds
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;

    return parsed;
  }

  /**
   * Validate and sanitize password
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    sanitized: string;
  } {
    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
      return { isValid: false, errors, sanitized: "" };
    }

    // Remove leading/trailing whitespace
    const sanitized = password.trim();

    // Check minimum length
    if (sanitized.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(sanitized)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(sanitized)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check for at least one number
    if (!/\d/.test(sanitized)) {
      errors.push("Password must contain at least one number");
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitized)) {
      errors.push("Password must contain at least one special character");
    }

    // Check maximum length
    if (sanitized.length > 128) {
      errors.push("Password must not exceed 128 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Sanitize form data object
   */
  static sanitizeFormData<T extends Record<string, unknown>>(
    data: T,
    rules: Partial<Record<keyof T, (value: unknown) => unknown>>
  ): T {
    const sanitized = { ...data };

    for (const [key, sanitizer] of Object.entries(rules)) {
      if (key in sanitized && sanitizer) {
        sanitized[key as keyof T] = sanitizer(
          sanitized[key as keyof T]
        ) as T[keyof T];
      }
    }

    return sanitized;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { maxSize, allowedTypes, allowedExtensions } = options;

    // Check file size
    if (maxSize && file.size > maxSize) {
      errors.push(
        `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    // Check MIME type
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (allowedExtensions) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`File extension is not allowed`);
      }
    }

    // Check for suspicious file names
    if (
      file.name.includes("..") ||
      file.name.includes("/") ||
      file.name.includes("\\")
    ) {
      errors.push("Invalid file name");
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Escape string for use in regular expressions
   */
  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Remove script tags and other dangerous HTML elements
   */
  static removeScriptTags(input: string): string {
    if (!input) return "";

    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
      .replace(/<object[^>]*>.*?<\/object>/gi, "")
      .replace(/<embed[^>]*>/gi, "")
      .replace(/<link[^>]*>/gi, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
}

/**
 * Common sanitization rules for form fields
 */
export const sanitizationRules = {
  username: InputSanitizer.sanitizeUsername,
  email: InputSanitizer.sanitizeEmail,
  serverName: InputSanitizer.sanitizeServerName,
  text: InputSanitizer.sanitizeText,
  html: InputSanitizer.sanitizeHTML,
  filePath: InputSanitizer.sanitizeFilePath,
};
