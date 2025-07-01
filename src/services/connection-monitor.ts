/**
 * Backend API connection monitoring service
 * Provides health checking, connection status monitoring, and recovery strategies
 */

import { ok, err, type Result } from "neverthrow";
import { ErrorHandler } from "@/utils/error-handler";
import type { ConnectionError } from "@/types/errors";

/**
 * Health check response from backend
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version?: string;
  uptime?: number;
}

/**
 * Connection monitoring configuration
 */
export interface ConnectionMonitorConfig {
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry backoff multiplier */
  retryBackoffMultiplier: number;
  /** Health check endpoint */
  healthEndpoint: string;
}

/**
 * Default configuration for connection monitoring
 */
const DEFAULT_CONFIG: ConnectionMonitorConfig = {
  healthCheckInterval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  maxRetries: 3,
  retryBackoffMultiplier: 1.5,
  healthEndpoint: "/api/v1/health",
};

/**
 * Connection status enumeration
 */
export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "checking"
  | "degraded";

/**
 * Connection state information
 */
export interface ConnectionState {
  status: ConnectionStatus;
  isConnected: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  lastSuccessfulConnection: Date | null;
  error: ConnectionError | null;
  retryCount: number;
  downtime: number; // milliseconds since last successful connection
}

/**
 * Connection monitoring service class
 */
export class ConnectionMonitorService {
  private config: ConnectionMonitorConfig;
  private state: ConnectionState;
  private intervalId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private listeners: Array<(state: ConnectionState) => void> = [];

  constructor(config: Partial<ConnectionMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      status: "checking",
      isConnected: false,
      isChecking: false,
      lastCheck: null,
      lastSuccessfulConnection: null,
      error: null,
      retryCount: 0,
      downtime: 0,
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  /**
   * Update connection state
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Start connection monitoring
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    // Perform initial check immediately
    this.checkConnection();

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkConnection();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop connection monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.updateState({
      isChecking: false,
    });
  }

  /**
   * Perform manual connection check
   */
  async checkConnection(): Promise<
    Result<HealthCheckResponse, ConnectionError>
  > {
    // Cancel any ongoing check
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    this.updateState({
      isChecking: true,
      status: "checking",
    });

    const checkResult = await this.performHealthCheck();

    if (checkResult.isOk()) {
      this.handleSuccessfulConnection(checkResult.value);
    } else {
      this.handleFailedConnection(checkResult.error);
    }

    this.updateState({
      isChecking: false,
      lastCheck: new Date(),
    });

    return checkResult;
  }

  /**
   * Reset retry count and clear errors
   */
  resetRetries(): void {
    this.updateState({
      retryCount: 0,
      error: null,
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConnectionMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if it was active
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * Perform the actual health check HTTP request
   */
  private async performHealthCheck(): Promise<
    Result<HealthCheckResponse, ConnectionError>
  > {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = `${apiUrl}${this.config.healthEndpoint}`;

      // Set up timeout before making the request
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, this.config.timeout);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: this.abortController?.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return err(
            this.createConnectionError(
              `Health check failed with status ${response.status}`,
              "failed",
              { endpoint: url }
            )
          );
        }

        const data = await response.json();

        // Validate response structure
        if (!data || typeof data.status !== "string") {
          return err(
            this.createConnectionError(
              "Invalid health check response format",
              "degraded",
              { endpoint: url }
            )
          );
        }

        return ok(data);
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout errors specifically
        if (error instanceof Error && error.name === "AbortError") {
          return err(
            this.createConnectionError(
              "Health check request timed out",
              "timeout",
              { endpoint: url }
            )
          );
        }

        // Handle JSON parsing errors
        return err(
          this.createConnectionError(
            error instanceof Error
              ? error.message
              : "Failed to parse health check response",
            "degraded",
            { endpoint: url }
          )
        );
      }
    } catch (error) {
      // Handle network errors and other exceptions
      return err(
        this.createConnectionError(
          error instanceof Error
            ? error.message
            : "Network error during health check",
          "failed",
          { endpoint: this.config.healthEndpoint }
        )
      );
    }
  }

  /**
   * Handle successful connection
   */
  private handleSuccessfulConnection(response: HealthCheckResponse): void {
    const now = new Date();
    const status: ConnectionStatus =
      response.status === "ok"
        ? "connected"
        : response.status === "degraded"
          ? "degraded"
          : "connected";

    this.updateState({
      status,
      isConnected: status === "connected" || status === "degraded",
      lastSuccessfulConnection: now,
      error: null,
      retryCount: 0,
      downtime: 0,
    });
  }

  /**
   * Handle failed connection
   */
  private handleFailedConnection(error: ConnectionError): void {
    const now = new Date();
    const downtime = this.state.lastSuccessfulConnection
      ? now.getTime() - this.state.lastSuccessfulConnection.getTime()
      : 0;

    this.updateState({
      status: "disconnected",
      isConnected: false,
      error: {
        ...error,
        retryCount: this.state.retryCount + 1,
        lastSuccessfulConnection:
          this.state.lastSuccessfulConnection || undefined,
        downtime,
      },
      retryCount: this.state.retryCount + 1,
      downtime,
    });
  }

  /**
   * Create a connection error with current context
   */
  private createConnectionError(
    message: string,
    connectionStatus: ConnectionError["connectionStatus"],
    options: Partial<{
      endpoint: string;
    }> = {}
  ): ConnectionError {
    return ErrorHandler.createConnectionError(
      message,
      "health_check",
      connectionStatus,
      {
        endpoint: options.endpoint,
        retryCount: this.state.retryCount,
        maxRetries: this.config.maxRetries,
        lastSuccessfulConnection:
          this.state.lastSuccessfulConnection || undefined,
        downtime: this.state.downtime,
      }
    );
  }

  /**
   * Get configuration
   */
  getConfig(): ConnectionMonitorConfig {
    return { ...this.config };
  }

  /**
   * Check if connection is healthy
   */
  isHealthy(): boolean {
    return this.state.isConnected && this.state.status === "connected";
  }

  /**
   * Check if connection is degraded but still functional
   */
  isDegraded(): boolean {
    return this.state.isConnected && this.state.status === "degraded";
  }

  /**
   * Check if connection is completely down
   */
  isDown(): boolean {
    return !this.state.isConnected && this.state.status === "disconnected";
  }
}

/**
 * Singleton instance for global use
 */
export const connectionMonitor = new ConnectionMonitorService();
