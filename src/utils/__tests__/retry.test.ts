/**
 * Tests for the retry mechanism utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { err, ok } from "neverthrow";
import { RetryManager, RetryConfigs } from "../retry";
import { ErrorHandler } from "../error-handler";

describe("RetryManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RetryManager.resetAllCircuitBreakers();
  });

  describe("Basic Retry Logic", () => {
    it("should succeed on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue(ok("success"));

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const operation = vi
        .fn()
        .mockResolvedValueOnce(
          err(
            ErrorHandler.createNetworkError("Fail 1", "test", {
              retryable: true,
            })
          )
        )
        .mockResolvedValueOnce(
          err(
            ErrorHandler.createNetworkError("Fail 2", "test", {
              retryable: true,
            })
          )
        )
        .mockResolvedValueOnce(ok("success"));

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const finalError = ErrorHandler.createNetworkError(
        "Final error",
        "test",
        { retryable: true }
      );
      const operation = vi.fn().mockResolvedValue(err(finalError));

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 2,
        initialDelay: 10,
      });

      expect(result.isErr()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries

      const error = result._unsafeUnwrapErr();
      expect(error.code).toBe("NETWORK_ERROR");
      expect((error as { retryCount: number }).retryCount).toBe(2);
    });

    it("should not retry non-retryable errors", async () => {
      const operation = vi.fn().mockResolvedValue(
        err(
          ErrorHandler.createAuthError("Non-retryable", "test", {
            retryable: false,
          })
        )
      );

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result.isErr()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it("should respect custom retry condition", async () => {
      const operation = vi.fn().mockResolvedValue(
        err(
          ErrorHandler.createNetworkError("Custom error", "test", {
            retryable: true,
          })
        )
      );

      const shouldRetry = vi.fn().mockReturnValue(false);

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
        shouldRetry,
      });

      expect(result.isErr()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(
        expect.objectContaining({ code: "NETWORK_ERROR" }),
        0
      );
    });
  });

  describe("Retry Delays and Backoff", () => {
    it("should implement exponential backoff", async () => {
      const operation = vi.fn().mockResolvedValue(
        err(
          ErrorHandler.createNetworkError("Test error", "test", {
            retryable: true,
          })
        )
      );

      const startTime = Date.now();

      await RetryManager.withRetry(operation, {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2,
        jitterFactor: 0, // No jitter for predictable timing
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have delays of ~100ms and ~200ms (total ~300ms minimum)
      expect(totalTime).toBeGreaterThan(250);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should respect max delay", async () => {
      const operation = vi.fn().mockResolvedValue(
        err(
          ErrorHandler.createNetworkError("Test error", "test", {
            retryable: true,
          })
        )
      );

      const startTime = Date.now();

      await RetryManager.withRetry(operation, {
        maxRetries: 1,
        initialDelay: 1000,
        maxDelay: 50, // Lower than initial delay
        backoffMultiplier: 2,
        jitterFactor: 0,
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should be capped at maxDelay (50ms)
      expect(totalTime).toBeLessThan(100);
    });

    it("should call retry callback", async () => {
      const operation = vi
        .fn()
        .mockResolvedValueOnce(
          err(
            ErrorHandler.createNetworkError("Error 1", "test", {
              retryable: true,
            })
          )
        )
        .mockResolvedValueOnce(ok("success"));

      const onRetry = vi.fn();

      await RetryManager.withRetry(operation, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ code: "NETWORK_ERROR" }),
        1
      );
    });
  });

  describe("Circuit Breaker", () => {
    it("should allow operations when circuit is closed", async () => {
      const operation = vi.fn().mockResolvedValue(ok("success"));

      const result = await RetryManager.withCircuitBreaker(
        operation,
        "test-circuit"
      );

      expect(result.isOk()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should open circuit after failure threshold", async () => {
      const operation = vi
        .fn()
        .mockResolvedValue(
          err(ErrorHandler.createNetworkError("Test error", "test"))
        );

      // Fail multiple times to open circuit
      for (let i = 0; i < 6; i++) {
        await RetryManager.withCircuitBreaker(operation, "test-circuit", {
          failureThreshold: 5,
        });
      }

      // Circuit should now be open
      const result = await RetryManager.withCircuitBreaker(
        operation,
        "test-circuit"
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain("Circuit breaker is open");
    });

    it("should transition to half-open after reset timeout", async () => {
      const operation = vi
        .fn()
        .mockResolvedValue(
          err(ErrorHandler.createNetworkError("Test error", "test"))
        );

      // Open the circuit
      for (let i = 0; i < 6; i++) {
        // Need one more than threshold to actually open
        await RetryManager.withCircuitBreaker(
          operation,
          "timeout-test-circuit",
          {
            failureThreshold: 5,
            resetTimeout: 50, // Very short timeout for testing
          }
        );
      }

      // Verify circuit is open
      const openResult = await RetryManager.withCircuitBreaker(
        operation,
        "timeout-test-circuit"
      );
      expect(openResult.isErr()).toBe(true);
      expect(openResult._unsafeUnwrapErr().message).toContain(
        "Circuit breaker is open"
      );

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 100)); // Longer wait

      // Reset operation to succeed
      operation.mockResolvedValue(ok("success"));

      const result = await RetryManager.withCircuitBreaker(
        operation,
        "timeout-test-circuit"
      );
      // Circuit should now allow the request through (half-open state)
      expect(result.isOk()).toBe(true);
    });

    it("should provide circuit breaker stats", async () => {
      const operation = vi
        .fn()
        .mockResolvedValue(
          err(ErrorHandler.createNetworkError("Test error", "test"))
        );

      await RetryManager.withCircuitBreaker(operation, "stats-test");

      const stats = RetryManager.getCircuitBreakerStats("stats-test");
      expect(stats).toMatchObject({
        state: "closed",
        failureCount: 1,
        successCount: 0,
      });
    });

    it("should reset circuit breaker", async () => {
      const operation = vi
        .fn()
        .mockResolvedValue(
          err(ErrorHandler.createNetworkError("Test error", "test"))
        );

      // Fail operations
      for (let i = 0; i < 3; i++) {
        await RetryManager.withCircuitBreaker(operation, "reset-test");
      }

      RetryManager.resetCircuitBreaker("reset-test");

      const stats = RetryManager.getCircuitBreakerStats("reset-test");
      expect(stats).toMatchObject({
        state: "closed",
        failureCount: 0,
        successCount: 0,
      });
    });
  });

  describe("Combined Retry and Circuit Breaker", () => {
    it("should apply both retry and circuit breaker logic", async () => {
      const operation = vi
        .fn()
        .mockResolvedValueOnce(
          err(
            ErrorHandler.createNetworkError("Fail 1", "test", {
              retryable: true,
            })
          )
        )
        .mockResolvedValueOnce(ok("success"));

      const result = await RetryManager.withRetryAndCircuitBreaker(
        operation,
        "combined-test",
        { maxRetries: 2, initialDelay: 10 },
        { failureThreshold: 5 }
      );

      expect(result.isOk()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe("Predefined Configurations", () => {
    it("should have quick retry config", () => {
      expect(RetryConfigs.quick).toMatchObject({
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 2000,
        backoffMultiplier: 1.5,
      });
    });

    it("should have standard retry config", () => {
      expect(RetryConfigs.standard).toMatchObject({
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      });
    });

    it("should have aggressive retry config", () => {
      expect(RetryConfigs.aggressive).toMatchObject({
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 15000,
        backoffMultiplier: 2.5,
      });
    });

    it("should have conservative retry config with custom retry logic", () => {
      const config = RetryConfigs.conservative;
      expect(config.maxRetries).toBe(2);
      expect(config.shouldRetry).toBeDefined();

      // Test the custom retry logic
      const networkError = ErrorHandler.createNetworkError("Test", "test");
      const authError = ErrorHandler.createAuthError("Test", "test");

      expect(config.shouldRetry!(networkError, 0)).toBe(true);
      expect(config.shouldRetry!(authError, 0)).toBe(false);
      expect(config.shouldRetry!(networkError, 2)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle operations that throw exceptions", async () => {
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error("Synchronous error");
      });

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 1,
        initialDelay: 10,
      });

      expect(result.isErr()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1); // Should not retry sync errors
    });

    it("should handle zero max retries", async () => {
      const operation = vi.fn().mockResolvedValue(
        err(
          ErrorHandler.createNetworkError("Test error", "test", {
            retryable: true,
          })
        )
      );

      const result = await RetryManager.withRetry(operation, {
        maxRetries: 0,
        initialDelay: 10,
      });

      expect(result.isErr()).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should handle missing circuit breaker gracefully", () => {
      const stats = RetryManager.getCircuitBreakerStats("non-existent");
      expect(stats).toBeNull();
    });
  });
});
