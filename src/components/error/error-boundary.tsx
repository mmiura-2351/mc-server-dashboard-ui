/**
 * Error boundary components for catching and handling React component errors
 * Provides fallback UI and error recovery options
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorHandler } from "@/utils/error-handler";
import { ErrorSeverity } from "@/types/errors";
import { useTranslation } from "@/contexts/language";
import styles from "./error-boundary.module.css";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  component?: string;
}

/**
 * Main error boundary component
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private maxRetries: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
    this.maxRetries = props.maxRetries ?? 3;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our centralized error handler
    const appError = ErrorHandler.createAppError(
      error.message,
      "component_render",
      this.state.retryCount < this.maxRetries,
      {
        component:
          this.props.component ||
          errorInfo.componentStack?.split("\n")[1]?.trim(),
        context: {
          data: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
            retryCount: this.state.retryCount,
          },
        },
      }
    );

    ErrorHandler.logError(appError, ErrorSeverity.HIGH);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          canRetry={this.state.retryCount < this.maxRetries}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorId: string | null;
  onRetry: () => void;
  onReset: () => void;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
}

function ErrorFallback({
  error,
  errorId,
  onRetry,
  onReset,
  canRetry,
  retryCount,
  maxRetries,
}: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className={styles["error-boundary"]}>
      <div className={styles["error-boundary__container"]}>
        <div className={styles["error-boundary__icon"]}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className={styles["error-boundary__title"]}>
          {t("errors.boundary.title")}
        </h2>

        <p className={styles["error-boundary__message"]}>
          {t("errors.boundary.message")}
        </p>

        {error && (
          <details className={styles["error-boundary__details"]}>
            <summary>{t("errors.boundary.technicalDetails")}</summary>
            <div className={styles["error-boundary__error-info"]}>
              <p>
                <strong>{t("errors.boundary.errorMessage")}:</strong>{" "}
                {error.message}
              </p>
              {errorId && (
                <p>
                  <strong>{t("errors.boundary.errorId")}:</strong> {errorId}
                </p>
              )}
              {retryCount > 0 && (
                <p>
                  <strong>{t("errors.boundary.retryCount")}:</strong>{" "}
                  {retryCount}/{maxRetries}
                </p>
              )}
            </div>
          </details>
        )}

        <div className={styles["error-boundary__actions"]}>
          {canRetry && (
            <button
              onClick={onRetry}
              className={`${styles["error-boundary__button"]} ${styles["error-boundary__button--primary"]}`}
            >
              {t("errors.boundary.retry")}
            </button>
          )}

          <button
            onClick={onReset}
            className={`${styles["error-boundary__button"]} ${styles["error-boundary__button--secondary"]}`}
          >
            {t("errors.boundary.reset")}
          </button>

          <button
            onClick={() => window.location.reload()}
            className={`${styles["error-boundary__button"]} ${styles["error-boundary__button--secondary"]}`}
          >
            {t("errors.boundary.reload")}
          </button>
        </div>

        <div className={styles["error-boundary__help"]}>
          <p className={styles["error-boundary__help-text"]}>
            {t("errors.boundary.helpText")}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized error boundary for async operations
 */
interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  onAsyncError?: (error: Error) => void;
}

export class AsyncErrorBoundary extends ErrorBoundary {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    super.componentDidCatch(error, errorInfo);

    // Handle async errors specifically
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    const appError = ErrorHandler.createAppError(
      error.message,
      "component_error",
      true,
      {
        context: {
          data: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        },
      }
    );

    ErrorHandler.logError(appError, ErrorSeverity.MEDIUM);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to trigger error boundary
  if (error) {
    throw error;
  }

  return { handleError, clearError };
}
