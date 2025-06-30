/**
 * React hooks for standardized error handling
 * Provides consistent error state management and user-friendly error display
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Result } from "neverthrow";
import { ErrorHandler, useErrorHandler } from "@/utils/error-handler";
import { useRetry } from "@/utils/retry";
import { ApplicationError, ErrorSeverity } from "@/types/errors";
import { useTranslation } from "@/contexts/language";
import type { ValidationError } from "@/types/errors";

/**
 * Error state interface for components
 */
export interface ErrorState {
  /** Current error if any */
  error: ApplicationError | null;
  /** Whether an error is currently displayed */
  hasError: boolean;
  /** User-friendly error message */
  message: string;
  /** Whether the error is retryable */
  canRetry: boolean;
  /** Number of retry attempts made */
  retryCount: number;
  /** Maximum retry attempts allowed */
  maxRetries: number;
}

/**
 * Configuration for error handling behavior
 */
export interface UseErrorHandlingConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Component name for error context */
  component?: string;
  /** Whether to automatically clear errors after a timeout */
  autoClear?: boolean;
  /** Auto-clear timeout in milliseconds */
  autoClearTimeout?: number;
  /** Default error severity */
  defaultSeverity?: ErrorSeverity;
  /** Custom error message formatter */
  formatError?: (error: ApplicationError) => string;
  /** Callback when error occurs */
  onError?: (error: ApplicationError) => void;
  /** Callback when error is cleared */
  onClearError?: () => void;
  /** Callback before retry attempt */
  onRetry?: (error: ApplicationError, attempt: number) => void;
}

/**
 * Hook for managing error state in components
 */
export function useErrorHandling(config: UseErrorHandlingConfig = {}) {
  const {
    maxRetries = 3,
    component,
    autoClear = false,
    autoClearTimeout = 5000,
    defaultSeverity = ErrorSeverity.MEDIUM,
    formatError,
    onError,
    onClearError,
    onRetry,
  } = config;

  const { t: _t } = useTranslation();
  const errorHandlerHook = useErrorHandler();
  const { logError, getUserMessage } = errorHandlerHook;
  const { withRetry } = useRetry();

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    message: "",
    canRetry: false,
    retryCount: 0,
    maxRetries,
  });

  const autoClearTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const clearErrorRef = useRef<(() => void) | null>(null);

  /**
   * Handle an error and update state
   */
  const handleError = useCallback(
    (error: ApplicationError, severity: ErrorSeverity = defaultSeverity) => {
      // Log the error
      logError(error, severity);

      // Format the error message
      const message = formatError ? formatError(error) : getUserMessage(error);

      // Determine if error is retryable
      const canRetry =
        ErrorHandler.shouldRetry(error) && errorState.retryCount < maxRetries;

      // Update error state
      const newErrorState: ErrorState = {
        error,
        hasError: true,
        message,
        canRetry,
        retryCount: errorState.retryCount,
        maxRetries,
      };

      setErrorState(newErrorState);

      // Call error callback
      if (onError) {
        onError(error);
      }

      // Set up auto-clear if enabled
      if (autoClear) {
        if (autoClearTimeoutRef.current) {
          clearTimeout(autoClearTimeoutRef.current);
        }
        autoClearTimeoutRef.current = setTimeout(() => {
          clearErrorRef.current?.();
        }, autoClearTimeout);
      }
    },
    [
      logError,
      getUserMessage,
      formatError,
      onError,
      autoClear,
      autoClearTimeout,
      maxRetries,
      errorState.retryCount,
      defaultSeverity,
    ]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    if (autoClearTimeoutRef.current) {
      clearTimeout(autoClearTimeoutRef.current);
    }

    setErrorState({
      error: null,
      hasError: false,
      message: "",
      canRetry: false,
      retryCount: 0,
      maxRetries,
    });

    if (onClearError) {
      onClearError();
    }
  }, [onClearError, maxRetries]);

  // Update the ref when clearError changes
  useEffect(() => {
    clearErrorRef.current = clearError;
  }, [clearError]);

  /**
   * Handle Result type from neverthrow
   */
  const handleResult = useCallback(
    <T>(
      result: Result<T, ApplicationError>,
      severity: ErrorSeverity = defaultSeverity
    ): T | null => {
      if (result.isErr()) {
        handleError(result.error, severity);
        return null;
      }

      // Clear any existing error on success
      if (errorState.hasError) {
        clearError();
      }

      return result.value;
    },
    [handleError, clearError, errorState.hasError, defaultSeverity]
  );

  /**
   * Wrap an async operation with error handling
   */
  const withErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<Result<T, ApplicationError>>,
      operationName: string,
      severity: ErrorSeverity = defaultSeverity
    ): Promise<T | null> => {
      try {
        const result = await operation();
        return handleResult(result, severity);
      } catch (error) {
        const appError = ErrorHandler.createAppError(
          error instanceof Error ? error.message : "Unexpected error",
          operationName,
          true,
          { component }
        );
        handleError(appError, severity);
        return null;
      }
    },
    [handleResult, component, handleError, defaultSeverity]
  );

  /**
   * Wrap an operation with retry logic
   */
  const withRetryHandling = useCallback(
    async <T>(
      operation: () => Promise<Result<T, ApplicationError>>,
      operationName: string,
      retryConfig?: Parameters<typeof withRetry>[1]
    ): Promise<T | null> => {
      const result = await withRetry(operation, {
        onRetry: (error, attempt) => {
          setErrorState((prev) => ({ ...prev, retryCount: attempt }));
          if (onRetry) {
            onRetry(error, attempt);
          }
        },
        ...retryConfig,
      });

      return handleResult(result);
    },
    [withRetry, handleResult, onRetry]
  );

  /**
   * Retry the last failed operation (if retryable)
   */
  const retryLastOperation = useCallback(() => {
    if (!errorState.canRetry || !errorState.error) {
      return;
    }

    // Increment retry count
    setErrorState((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      canRetry: prev.retryCount + 1 < maxRetries,
    }));

    if (onRetry && errorState.error) {
      onRetry(errorState.error, errorState.retryCount + 1);
    }
  }, [
    errorState.canRetry,
    errorState.error,
    errorState.retryCount,
    maxRetries,
    onRetry,
  ]);

  /**
   * Reset retry count (for manual retry management)
   */
  const resetRetryCount = useCallback(() => {
    setErrorState((prev) => ({
      ...prev,
      retryCount: 0,
      canRetry: prev.error ? ErrorHandler.shouldRetry(prev.error) : false,
    }));
  }, []);

  return {
    // Error state
    ...errorState,

    // Error handling functions
    handleError,
    clearError,
    handleResult,
    withErrorHandling,
    withRetryHandling,
    retryLastOperation,
    resetRetryCount,

    // Utility functions
    isRetryable: (error: ApplicationError) => ErrorHandler.shouldRetry(error),
    getRecoveryStrategy: (error: ApplicationError) =>
      ErrorHandler.getRecoveryStrategy(error),

    // Convenience getters
    isNetworkError: errorState.error?.code === "NETWORK_ERROR",
    isAuthError: errorState.error?.code === "AUTH_ERROR",
    isValidationError: errorState.error?.code === "VALIDATION_ERROR",
    isServerError: errorState.error?.code === "SERVER_ERROR",
    isFileError: errorState.error?.code === "FILE_ERROR",
  };
}

/**
 * Hook for handling async operations with loading state
 */
export function useAsyncOperation<T>(config: UseErrorHandlingConfig = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const errorHandling = useErrorHandling(config);

  const execute = useCallback(
    async (
      operation: () => Promise<Result<T, ApplicationError>>,
      operationName: string
    ): Promise<T | null> => {
      setIsLoading(true);
      errorHandling.clearError();

      try {
        const result = await errorHandling.withErrorHandling(
          operation,
          operationName
        );
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [errorHandling]
  );

  const executeWithRetry = useCallback(
    async (
      operation: () => Promise<Result<T, ApplicationError>>,
      operationName: string,
      retryConfig?: Parameters<typeof errorHandling.withRetryHandling>[2]
    ): Promise<T | null> => {
      setIsLoading(true);
      errorHandling.clearError();

      try {
        const result = await errorHandling.withRetryHandling(
          operation,
          operationName,
          retryConfig
        );
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [errorHandling]
  );

  return {
    ...errorHandling,
    isLoading,
    execute,
    executeWithRetry,
  };
}

/**
 * Hook for form error handling with field-specific errors
 */
export function useFormErrorHandling(config: UseErrorHandlingConfig = {}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorHandling = useErrorHandling(config);

  const handleFieldError = useCallback((field: string, error: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleValidationError = useCallback(
    (error: ApplicationError) => {
      if (error.code === "VALIDATION_ERROR") {
        const validationError = error as ValidationError;
        if (validationError.errors && Array.isArray(validationError.errors)) {
          const newFieldErrors: Record<string, string> = {};
          validationError.errors.forEach(
            (err: { field: string; message: string; code: string }) => {
              if (err.field && err.message) {
                newFieldErrors[err.field] = err.message;
              }
            }
          );
          setFieldErrors(newFieldErrors);
        } else if (validationError.field) {
          setFieldErrors({ [validationError.field]: error.message });
        }
      }
      errorHandling.handleError(error);
    },
    [errorHandling]
  );

  return {
    ...errorHandling,
    fieldErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    getFieldError: (field: string) => fieldErrors[field] || "",
    hasFieldError: (field: string) => Boolean(fieldErrors[field]),
    handleFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleValidationError,
  };
}
