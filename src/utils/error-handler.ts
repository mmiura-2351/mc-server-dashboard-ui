/**
 * Centralized error handling utilities for the MC Server Dashboard
 * Provides consistent error creation, formatting, logging, and recovery strategies
 */

import { Result, err, ok } from "neverthrow";
import {
  ApplicationError,
  AuthError,
  FileError,
  ServerError,
  NetworkError,
  ValidationError,
  AppError,
  ErrorSeverity,
  TrackedError,
  ErrorRecoveryStrategy,
} from "@/types/errors";

/**
 * Configuration for error handling
 */
interface ErrorHandlerConfig {
  /** Whether to log errors to console */
  enableConsoleLogging: boolean;
  /** Maximum number of retry attempts for operations */
  defaultMaxRetries: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay: number;
  /** Whether to track errors for analytics */
  enableErrorTracking: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableConsoleLogging: process.env.NODE_ENV === "development",
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  enableErrorTracking: true,
};

/**
 * Centralized error handler class
 */
export class ErrorHandler {
  private static config: ErrorHandlerConfig = DEFAULT_CONFIG;
  private static errorLog: TrackedError[] = [];

  /**
   * Configure the error handler
   */
  static configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create an authentication error
   */
  static createAuthError(
    message: string,
    operation: string,
    options: Partial<
      Pick<AuthError, "status" | "shouldLogout" | "retryable" | "suggestions">
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): AuthError {
    return {
      message,
      code: "AUTH_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: options.context?.data,
      },
      status: options.status,
      shouldLogout: options.shouldLogout ?? false,
      retryable: options.retryable ?? false,
      suggestions: options.suggestions ?? [
        "Please check your credentials and try again",
      ],
    };
  }

  /**
   * Create a file operation error
   */
  static createFileError(
    message: string,
    operation: string,
    operationType: FileError["operationType"],
    options: Partial<
      Pick<
        FileError,
        "filePath" | "retryable" | "expectedSize" | "actualSize" | "suggestions"
      >
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): FileError {
    return {
      message,
      code: "FILE_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: { filePath: options.filePath, ...options.context?.data },
      },
      operationType,
      filePath: options.filePath,
      retryable: options.retryable ?? true,
      expectedSize: options.expectedSize,
      actualSize: options.actualSize,
      suggestions:
        options.suggestions ?? this.getFileErrorSuggestions(operationType),
    };
  }

  /**
   * Create a server management error
   */
  static createServerError(
    message: string,
    operation: string,
    operationType: ServerError["operationType"],
    options: Partial<
      Pick<
        ServerError,
        "serverId" | "serverStatus" | "retryable" | "suggestions"
      >
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): ServerError {
    return {
      message,
      code: "SERVER_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: {
          serverId: options.serverId,
          serverStatus: options.serverStatus,
          ...options.context?.data,
        },
      },
      operationType,
      serverId: options.serverId,
      serverStatus: options.serverStatus,
      retryable: options.retryable ?? true,
      suggestions:
        options.suggestions ?? this.getServerErrorSuggestions(operationType),
    };
  }

  /**
   * Create a network error
   */
  static createNetworkError(
    message: string,
    operation: string,
    options: Partial<
      Pick<
        NetworkError,
        | "status"
        | "endpoint"
        | "method"
        | "retryable"
        | "retryCount"
        | "maxRetries"
        | "suggestions"
      >
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): NetworkError {
    return {
      message,
      code: "NETWORK_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: {
          endpoint: options.endpoint,
          method: options.method,
          ...options.context?.data,
        },
      },
      status: options.status,
      endpoint: options.endpoint,
      method: options.method,
      retryable: options.retryable ?? true,
      retryCount: options.retryCount ?? 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      suggestions:
        options.suggestions ?? this.getNetworkErrorSuggestions(options.status),
    };
  }

  /**
   * Create a validation error
   */
  static createValidationError(
    message: string,
    operation: string,
    options: Partial<
      Pick<ValidationError, "field" | "errors" | "suggestions">
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): ValidationError {
    return {
      message,
      code: "VALIDATION_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: { field: options.field, ...options.context?.data },
      },
      field: options.field,
      errors: options.errors,
      suggestions: options.suggestions ?? [
        "Please check your input and try again",
      ],
    };
  }

  /**
   * Create an application error
   */
  static createAppError(
    message: string,
    operation: string,
    recoverable: boolean,
    options: Partial<
      Pick<AppError, "component" | "fallbackAction" | "suggestions">
    > & {
      context?: { data?: Record<string, unknown> };
    } = {}
  ): AppError {
    return {
      message,
      code: "APP_ERROR",
      timestamp: new Date(),
      context: {
        operation,
        data: { component: options.component, ...options.context?.data },
      },
      component: options.component,
      recoverable,
      fallbackAction: options.fallbackAction,
      suggestions:
        options.suggestions ??
        (recoverable ? ["Please try again"] : ["Please refresh the page"]),
    };
  }

  /**
   * Convert any error to a user-friendly message
   */
  static getUserFriendlyMessage(error: ApplicationError): string {
    const baseMessage = error.message;

    if (error.suggestions && error.suggestions.length > 0) {
      return `${baseMessage}\n\nSuggestions:\n${error.suggestions.map((s) => `• ${s}`).join("\n")}`;
    }

    return baseMessage;
  }

  /**
   * Log error with context
   */
  static logError(
    error: ApplicationError,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): void {
    const trackedError: TrackedError = {
      ...error,
      severity,
      errorId: this.generateErrorId(),
      sessionId: this.getSessionId(),
      stackTrace: new Error().stack,
    };

    if (this.config.enableErrorTracking) {
      this.errorLog.push(trackedError);
    }

    if (this.config.enableConsoleLogging) {
      // eslint-disable-next-line no-console
      console.group(`🚨 ${severity.toUpperCase()} Error: ${error.code}`);
      // eslint-disable-next-line no-console
      console.error("Message:", error.message);
      // eslint-disable-next-line no-console
      console.error("Operation:", error.context.operation);
      // eslint-disable-next-line no-console
      console.error("Context:", error.context.data);
      // eslint-disable-next-line no-console
      console.error("Timestamp:", error.timestamp.toISOString());
      if (error.suggestions) {
        // eslint-disable-next-line no-console
        console.info("Suggestions:", error.suggestions);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  static shouldRetry(error: ApplicationError): boolean {
    switch (error.code) {
      case "AUTH_ERROR":
        return (error as AuthError).retryable ?? false;
      case "FILE_ERROR":
        return (error as FileError).retryable;
      case "SERVER_ERROR":
        return (error as ServerError).retryable;
      case "NETWORK_ERROR":
        const networkError = error as NetworkError;
        return (
          networkError.retryable &&
          (networkError.retryCount ?? 0) < (networkError.maxRetries ?? 3)
        );
      default:
        return false;
    }
  }

  /**
   * Get error recovery strategy
   */
  static getRecoveryStrategy(error: ApplicationError): ErrorRecoveryStrategy {
    const canRetry = this.shouldRetry(error);

    return {
      canRetry,
      maxRetries: this.getMaxRetries(error),
      retryDelay: this.getRetryDelay(error),
      requiresUserAction: this.requiresUserAction(error),
      fallbackActions: this.getFallbackActions(error),
    };
  }

  /**
   * Create a Result with proper error logging
   */
  static createErrorResult<T>(
    error: ApplicationError,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Result<T, ApplicationError> {
    this.logError(error, severity);
    return err(error);
  }

  /**
   * Wrap an async operation with error handling
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      component?: string;
      onError?: (_error: ApplicationError) => void;
    }
  ): Promise<Result<T, ApplicationError>> {
    try {
      const result = await operation();
      return ok(result);
    } catch (error) {
      const appError = this.createAppError(
        error instanceof Error ? error.message : "Unknown error occurred",
        context.operationName,
        true,
        { component: context.component }
      );

      this.logError(appError);

      if (context.onError) {
        context.onError(appError);
      }

      return err(appError);
    }
  }

  /**
   * Get recent error log entries
   */
  static getRecentErrors(count: number = 10): TrackedError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  // Private helper methods

  private static getFileErrorSuggestions(
    operationType: FileError["operationType"]
  ): string[] {
    const suggestions: Record<FileError["operationType"], string[]> = {
      read: ["Check if the file exists", "Verify file permissions"],
      write: ["Check available disk space", "Verify write permissions"],
      delete: ["Ensure the file is not in use", "Check file permissions"],
      upload: ["Check file size limits", "Verify network connection"],
      download: ["Check network connection", "Verify file availability"],
      rename: [
        "Ensure the new name is valid",
        "Check if target name already exists",
      ],
      move: ["Verify destination directory exists", "Check file permissions"],
    };
    return suggestions[operationType] || ["Please try again"];
  }

  private static getServerErrorSuggestions(
    operationType: ServerError["operationType"]
  ): string[] {
    const suggestions: Record<ServerError["operationType"], string[]> = {
      start: ["Check server configuration", "Verify required files exist"],
      stop: ["Wait for current operations to complete", "Check server status"],
      restart: [
        "Ensure server is stable before restart",
        "Check for pending operations",
      ],
      status: ["Refresh the page", "Check network connection"],
      configure: ["Verify configuration values", "Check file permissions"],
      backup: ["Check available disk space", "Ensure server is running"],
      restore: ["Verify backup file integrity", "Stop server before restore"],
    };
    return (
      suggestions[operationType] || ["Please check server status and try again"]
    );
  }

  private static getNetworkErrorSuggestions(status?: number): string[] {
    if (!status) return ["Check your network connection", "Try again later"];

    const suggestions: Record<number, string[]> = {
      400: ["Check your input data", "Verify request format"],
      401: ["Please log in again", "Check your credentials"],
      403: [
        "You may not have permission for this action",
        "Contact an administrator",
      ],
      404: [
        "The requested resource was not found",
        "Check the URL or refresh the page",
      ],
      429: [
        "You are making requests too quickly",
        "Please wait a moment and try again",
      ],
      500: ["Server is experiencing issues", "Please try again later"],
      502: [
        "Service is temporarily unavailable",
        "Please try again in a few minutes",
      ],
      503: ["Service is under maintenance", "Please try again later"],
    };

    return (
      suggestions[status] || ["Please check your connection and try again"]
    );
  }

  private static getMaxRetries(error: ApplicationError): number {
    if (error.code === "NETWORK_ERROR") {
      return (
        (error as NetworkError).maxRetries ?? this.config.defaultMaxRetries
      );
    }
    return this.config.defaultMaxRetries;
  }

  private static getRetryDelay(_error: ApplicationError): number {
    return this.config.defaultRetryDelay;
  }

  private static requiresUserAction(error: ApplicationError): boolean {
    switch (error.code) {
      case "AUTH_ERROR":
        return (error as AuthError).shouldLogout ?? false;
      case "VALIDATION_ERROR":
        return true;
      case "PERMISSION_ERROR":
        return true;
      default:
        return false;
    }
  }

  private static getFallbackActions(error: ApplicationError): string[] {
    const actions: string[] = [];

    if (error.code === "APP_ERROR" && (error as AppError).fallbackAction) {
      actions.push((error as AppError).fallbackAction!);
    }

    actions.push("Refresh the page");
    actions.push("Contact support if the problem persists");

    return actions;
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private static getSessionId(): string {
    // In a real implementation, this would get the actual session ID
    return "session_" + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Hook for using error handler in React components
 */
export function useErrorHandler() {
  const logError = (
    error: ApplicationError,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) => {
    ErrorHandler.logError(error, severity);
  };

  const getUserMessage = (error: ApplicationError) => {
    return ErrorHandler.getUserFriendlyMessage(error);
  };

  const getRecoveryStrategy = (error: ApplicationError) => {
    return ErrorHandler.getRecoveryStrategy(error);
  };

  const wrapOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    component?: string
  ): Promise<Result<T, ApplicationError>> => {
    return ErrorHandler.wrapOperation(operation, {
      operationName,
      component,
    });
  };

  return {
    logError,
    getUserMessage,
    getRecoveryStrategy,
    wrapOperation,
    createAuthError: ErrorHandler.createAuthError,
    createFileError: ErrorHandler.createFileError,
    createServerError: ErrorHandler.createServerError,
    createNetworkError: ErrorHandler.createNetworkError,
    createValidationError: ErrorHandler.createValidationError,
    createAppError: ErrorHandler.createAppError,
  };
}
