/**
 * Retry mechanism utilities for handling transient failures
 * Provides configurable retry logic with exponential backoff and circuit breaker patterns
 */

import { Result, err } from "neverthrow";
import { ApplicationError, NetworkError } from "@/types/errors";
import { ErrorHandler } from "./error-handler";

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries in milliseconds */
  initialDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor to add randomness (0-1) */
  jitterFactor: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: ApplicationError, attempt: number) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (error: ApplicationError, attempt: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  shouldRetry: (error: ApplicationError) => ErrorHandler.shouldRetry(error),
};

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open",
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time to wait before attempting to close circuit (ms) */
  resetTimeout: number;
  /** Percentage of requests that must succeed to close circuit */
  successThreshold: number;
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      successThreshold: 50, // 50%
      ...config,
    };
  }

  async execute<T>(
    operation: () => Promise<Result<T, ApplicationError>>
  ): Promise<Result<T, ApplicationError>> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        return err(
          ErrorHandler.createNetworkError(
            "Circuit breaker is open",
            "circuit_breaker_check",
            {
              retryable: false,
            }
          )
        );
      }
    }

    const result = await operation();

    if (result.isOk()) {
      this.onSuccess();
    } else {
      this.onFailure();
    }

    return result;
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.config.resetTimeout
    );
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      const successRate =
        (this.successCount / (this.successCount + this.failureCount)) * 100;

      if (successRate >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

/**
 * Retry utility class
 */
export class RetryManager {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Execute an operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    config: Partial<RetryConfig> = {}
  ): Promise<Result<T, ApplicationError>> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: ApplicationError | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (result.isOk()) {
          return result;
        }

        lastError = result.error;

        // Check if we should retry
        if (
          attempt === retryConfig.maxRetries ||
          (retryConfig.shouldRetry &&
            !retryConfig.shouldRetry(lastError, attempt))
        ) {
          break;
        }

        // Call retry callback if provided
        if (retryConfig.onRetry) {
          retryConfig.onRetry(lastError, attempt + 1);
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, retryConfig);
        await this.sleep(delay);
      } catch (error) {
        // Handle exceptions thrown by the operation
        lastError = ErrorHandler.createAppError(
          error instanceof Error
            ? error.message
            : "Operation threw an exception",
          "retry_operation",
          false, // Don't retry thrown exceptions
          {
            context: {
              data: {
                attempt,
                maxRetries: retryConfig.maxRetries,
              },
            },
          }
        );

        // Don't retry thrown exceptions
        break;
      }
    }

    // Ensure we have an error to return
    if (!lastError) {
      lastError = ErrorHandler.createAppError(
        "Operation failed without specific error",
        "retry_operation",
        false
      );
    }

    // Update error with retry information
    if (lastError.code === "NETWORK_ERROR") {
      const networkError = lastError as NetworkError;
      networkError.retryCount = retryConfig.maxRetries;
      networkError.maxRetries = retryConfig.maxRetries;
    }

    return err(lastError);
  }

  /**
   * Execute an operation with circuit breaker pattern
   */
  static async withCircuitBreaker<T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    circuitKey: string,
    circuitConfig: Partial<CircuitBreakerConfig> = {}
  ): Promise<Result<T, ApplicationError>> {
    let circuit = this.circuitBreakers.get(circuitKey);

    if (!circuit) {
      circuit = new CircuitBreaker(circuitConfig);
      this.circuitBreakers.set(circuitKey, circuit);
    }

    return circuit.execute(operation);
  }

  /**
   * Execute an operation with both retry and circuit breaker patterns
   */
  static async withRetryAndCircuitBreaker<T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    circuitKey: string,
    retryConfig: Partial<RetryConfig> = {},
    circuitConfig: Partial<CircuitBreakerConfig> = {}
  ): Promise<Result<T, ApplicationError>> {
    return this.withCircuitBreaker(
      () => this.withRetry(operation, retryConfig),
      circuitKey,
      circuitConfig
    );
  }

  /**
   * Get circuit breaker statistics
   */
  static getCircuitBreakerStats(circuitKey: string) {
    const circuit = this.circuitBreakers.get(circuitKey);
    return circuit?.getStats() || null;
  }

  /**
   * Reset a circuit breaker
   */
  static resetCircuitBreaker(circuitKey: string): void {
    const circuit = this.circuitBreakers.get(circuitKey);
    circuit?.reset();
  }

  /**
   * Reset all circuit breakers
   */
  static resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach((circuit) => circuit.reset());
  }

  // Private utility methods

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * config.jitterFactor * Math.random();

    return cappedDelay + jitter;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * React hook for using retry functionality
 */
export function useRetry() {
  const withRetry = async <T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    config?: Partial<RetryConfig>
  ): Promise<Result<T, ApplicationError>> => {
    return RetryManager.withRetry(operation, config);
  };

  const withCircuitBreaker = async <T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    circuitKey: string,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<Result<T, ApplicationError>> => {
    return RetryManager.withCircuitBreaker(operation, circuitKey, config);
  };

  const withRetryAndCircuitBreaker = async <T>(
    operation: () => Promise<Result<T, ApplicationError>>,
    circuitKey: string,
    retryConfig?: Partial<RetryConfig>,
    circuitConfig?: Partial<CircuitBreakerConfig>
  ): Promise<Result<T, ApplicationError>> => {
    return RetryManager.withRetryAndCircuitBreaker(
      operation,
      circuitKey,
      retryConfig,
      circuitConfig
    );
  };

  return {
    withRetry,
    withCircuitBreaker,
    withRetryAndCircuitBreaker,
    getCircuitBreakerStats: RetryManager.getCircuitBreakerStats,
    resetCircuitBreaker: RetryManager.resetCircuitBreaker,
  };
}

/**
 * Predefined retry configurations for common scenarios
 */
export const RetryConfigs = {
  /** Quick retry for UI operations */
  quick: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.1,
  } as Partial<RetryConfig>,

  /** Standard retry for API operations */
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.15,
  } as Partial<RetryConfig>,

  /** Aggressive retry for critical operations */
  aggressive: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2.5,
    jitterFactor: 0.2,
  } as Partial<RetryConfig>,

  /** Conservative retry for potentially expensive operations */
  conservative: {
    maxRetries: 2,
    initialDelay: 3000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    shouldRetry: (error: ApplicationError, attempt: number) => {
      // Only retry network errors, not validation or auth errors
      return error.code === "NETWORK_ERROR" && attempt < 2;
    },
  } as Partial<RetryConfig>,
};
