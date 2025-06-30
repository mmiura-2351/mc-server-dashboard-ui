/**
 * Standardized error types with context information for neverthrow Result patterns
 * This module provides structured error types that include operation context,
 * timestamps, and recovery suggestions for better error handling throughout the application.
 */

/**
 * Base error interface with common properties
 */
export interface BaseError {
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Timestamp when the error occurred */
  timestamp: Date;
  /** Operation context where the error occurred */
  context: {
    /** The operation that was being performed */
    operation: string;
    /** Additional context-specific data */
    data?: Record<string, unknown>;
  };
  /** Suggested actions for recovery */
  suggestions?: string[];
}

/**
 * Authentication and authorization errors
 */
export interface AuthError extends BaseError {
  /** HTTP status code if applicable */
  status?: number;
  /** Whether the user should be logged out */
  shouldLogout?: boolean;
  /** Whether a retry might succeed */
  retryable?: boolean;
}

/**
 * File operation errors
 */
export interface FileError extends BaseError {
  /** File path where the error occurred */
  filePath?: string;
  /** File operation type */
  operationType:
    | "read"
    | "write"
    | "delete"
    | "upload"
    | "download"
    | "rename"
    | "move";
  /** Whether the operation is safe to retry */
  retryable: boolean;
  /** Expected file size if relevant */
  expectedSize?: number;
  /** Actual file size if relevant */
  actualSize?: number;
}

/**
 * Server management errors
 */
export interface ServerError extends BaseError {
  /** Server ID where the error occurred */
  serverId?: string;
  /** Server operation type */
  operationType:
    | "start"
    | "stop"
    | "restart"
    | "status"
    | "configure"
    | "backup"
    | "restore";
  /** Current server status */
  serverStatus?: "stopped" | "starting" | "running" | "stopping" | "error";
  /** Whether the operation can be retried */
  retryable: boolean;
}

/**
 * Network and API errors
 */
export interface NetworkError extends BaseError {
  /** HTTP status code */
  status?: number;
  /** API endpoint that failed */
  endpoint?: string;
  /** HTTP method used */
  method?: string;
  /** Whether the request can be retried */
  retryable: boolean;
  /** Retry count if this is a retry attempt */
  retryCount?: number;
  /** Maximum retry attempts allowed */
  maxRetries?: number;
}

/**
 * Validation errors for user input
 */
export interface ValidationError extends BaseError {
  /** Field name that failed validation */
  field?: string;
  /** All validation errors if multiple */
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * User permission and access errors
 */
export interface PermissionError extends BaseError {
  /** Required permission level */
  requiredPermission?: string;
  /** User's current permission level */
  currentPermission?: string;
  /** Resource being accessed */
  resource?: string;
}

/**
 * Configuration and settings errors
 */
export interface ConfigError extends BaseError {
  /** Configuration key that failed */
  configKey?: string;
  /** Expected configuration value type */
  expectedType?: string;
  /** Actual value that caused the error */
  actualValue?: unknown;
}

/**
 * Application-level errors
 */
export interface AppError extends BaseError {
  /** Component where the error occurred */
  component?: string;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Fallback action to take */
  fallbackAction?: string;
}

/**
 * Union type for all error types
 */
export type ApplicationError =
  | AuthError
  | FileError
  | ServerError
  | NetworkError
  | ValidationError
  | PermissionError
  | ConfigError
  | AppError;

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Extended error interface with severity and tracking
 */
export interface TrackedError extends BaseError {
  /** Error severity level */
  severity: ErrorSeverity;
  /** Unique error ID for tracking */
  errorId: string;
  /** User ID if applicable */
  userId?: string;
  /** Session ID for correlation */
  sessionId?: string;
  /** Stack trace for debugging */
  stackTrace?: string;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Whether automatic retry is available */
  canRetry: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retry attempts (ms) */
  retryDelay?: number;
  /** Whether user intervention is required */
  requiresUserAction: boolean;
  /** Fallback actions available */
  fallbackActions?: string[];
}
