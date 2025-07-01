/**
 * Tests for ConnectionMonitorService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConnectionMonitorService } from "./connection-monitor";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ConnectionMonitorService", () => {
  let monitor: ConnectionMonitorService;

  beforeEach(() => {
    monitor = new ConnectionMonitorService({
      healthCheckInterval: 1000, // 1 second for testing
      timeout: 500,
    });
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with checking status", () => {
      const state = monitor.getState();
      expect(state.status).toBe("checking");
      expect(state.isConnected).toBe(false);
      expect(state.isChecking).toBe(false);
      expect(state.lastCheck).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe("subscription", () => {
    it("should notify subscribers of state changes", () => {
      const listener = vi.fn();
      const unsubscribe = monitor.subscribe(listener);

      // Trigger a state change
      monitor.checkConnection();

      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();

      // Should not be called after unsubscribe
      monitor.checkConnection();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("checkConnection", () => {
    it("should handle successful health check", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: "ok",
          timestamp: "2024-01-01T00:00:00Z",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await monitor.checkConnection();

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/health",
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

      const state = monitor.getState();
      expect(state.status).toBe("connected");
      expect(state.isConnected).toBe(true);
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });

    it("should handle degraded health status", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: "degraded",
          timestamp: "2024-01-01T00:00:00Z",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await monitor.checkConnection();

      expect(result.isOk()).toBe(true);
      const state = monitor.getState();
      expect(state.status).toBe("degraded");
      expect(state.isConnected).toBe(true);
    });

    it("should handle HTTP error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await monitor.checkConnection();

      expect(result.isErr()).toBe(true);
      const state = monitor.getState();
      expect(state.status).toBe("disconnected");
      expect(state.isConnected).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.retryCount).toBe(1);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await monitor.checkConnection();

      expect(result.isErr()).toBe(true);
      const state = monitor.getState();
      expect(state.status).toBe("disconnected");
      expect(state.isConnected).toBe(false);
      expect(state.error?.message).toContain("Network error");
    });

    it("should handle timeout errors", async () => {
      // Mock fetch that simulates AbortError when signal is aborted
      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          const signal = options?.signal as AbortSignal;
          if (signal) {
            signal.addEventListener("abort", () => {
              const abortError = new Error("AbortError");
              abortError.name = "AbortError";
              reject(abortError);
            });
          }
        });
      });

      const checkPromise = monitor.checkConnection();

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(1000);

      const result = await checkPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.connectionStatus).toBe("timeout");
        expect(result.error.message).toContain("timed out");
      }
    });

    it("should handle invalid response format", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing required 'status' field
          timestamp: "2024-01-01T00:00:00Z",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await monitor.checkConnection();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.connectionStatus).toBe("degraded");
        expect(result.error.message).toContain(
          "Invalid health check response format"
        );
      }
    });
  });

  describe("start and stop", () => {
    it("should start periodic monitoring", () => {
      const checkSpy = vi.spyOn(monitor, "checkConnection");

      monitor.start();

      // Should check immediately
      expect(checkSpy).toHaveBeenCalledTimes(1);

      // Should check again after interval
      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalledTimes(2);

      checkSpy.mockRestore();
    });

    it("should stop monitoring", () => {
      const checkSpy = vi.spyOn(monitor, "checkConnection");

      monitor.start();
      monitor.stop();

      // Should only have initial check
      expect(checkSpy).toHaveBeenCalledTimes(1);

      // Should not check after stop
      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalledTimes(1);

      checkSpy.mockRestore();
    });
  });

  describe("resetRetries", () => {
    it("should reset retry count and clear errors", async () => {
      // Simulate a failed connection to increment retry count
      mockFetch.mockRejectedValue(new Error("Connection failed"));
      await monitor.checkConnection();

      const stateBefore = monitor.getState();
      expect(stateBefore.retryCount).toBeGreaterThan(0);
      expect(stateBefore.error).toBeTruthy();

      monitor.resetRetries();

      const stateAfter = monitor.getState();
      expect(stateAfter.retryCount).toBe(0);
      expect(stateAfter.error).toBeNull();
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      const newConfig = {
        healthCheckInterval: 5000,
        timeout: 2000,
      };

      monitor.updateConfig(newConfig);

      const config = monitor.getConfig();
      expect(config.healthCheckInterval).toBe(5000);
      expect(config.timeout).toBe(2000);
    });

    it("should restart monitoring if active", () => {
      const stopSpy = vi.spyOn(monitor, "stop");
      const startSpy = vi.spyOn(monitor, "start");

      monitor.start();
      monitor.updateConfig({ timeout: 3000 });

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalledTimes(2); // Once from start(), once from updateConfig()

      stopSpy.mockRestore();
      startSpy.mockRestore();
    });
  });

  describe("status helpers", () => {
    it("should correctly identify healthy state", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: "ok",
          timestamp: "2024-01-01T00:00:00Z",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await monitor.checkConnection();

      expect(monitor.isHealthy()).toBe(true);
      expect(monitor.isDegraded()).toBe(false);
      expect(monitor.isDown()).toBe(false);
    });

    it("should correctly identify degraded state", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: "degraded",
          timestamp: "2024-01-01T00:00:00Z",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await monitor.checkConnection();

      expect(monitor.isHealthy()).toBe(false);
      expect(monitor.isDegraded()).toBe(true);
      expect(monitor.isDown()).toBe(false);
    });

    it("should correctly identify down state", async () => {
      mockFetch.mockRejectedValue(new Error("Connection failed"));

      await monitor.checkConnection();

      expect(monitor.isHealthy()).toBe(false);
      expect(monitor.isDegraded()).toBe(false);
      expect(monitor.isDown()).toBe(true);
    });
  });
});
