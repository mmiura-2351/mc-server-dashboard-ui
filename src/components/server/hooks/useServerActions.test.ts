import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useServerActions } from "./useServerActions";
import * as serverService from "@/services/server";
import { ServerType, ServerStatus } from "@/types/server";
import type { MinecraftServer } from "@/types/server";
import { ok, err } from "neverthrow";

// Mock the server service
vi.mock("@/services/server", () => ({
  createServer: vi.fn(),
  importServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
}));

// Mock contexts
const mockLogout = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock("@/contexts/auth", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

const mockServer: MinecraftServer = {
  id: 1,
  name: "Test Server",
  minecraft_version: "1.21.6",
  server_type: ServerType.VANILLA,
  status: ServerStatus.STOPPED,
  max_memory: 2048,
  description: "Test server",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  owner_id: 1,
  directory_path: "/servers/test-server",
  port: 25565,
  max_players: 20,
  template_id: null,
};

describe("useServerActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useServerActions());

    expect(result.current.isCreating).toBe(false);
    expect(result.current.isImporting).toBe(false);
    expect(result.current.actioningServers.size).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it("should create server successfully", async () => {
    vi.mocked(serverService.createServer).mockResolvedValue(ok(mockServer));

    const { result } = renderHook(() => useServerActions());

    const createData = {
      name: "Test Server",
      minecraft_version: "1.21.6",
      server_type: ServerType.VANILLA,
      max_memory: 2048,
      description: "Test server",
    };

    let serverResult: MinecraftServer | null = null;

    await act(async () => {
      serverResult = await result.current.createServer(createData);
    });

    expect(serverResult).toEqual(mockServer);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should handle create server error", async () => {
    const errorMessage = "Failed to create server";
    vi.mocked(serverService.createServer).mockResolvedValue(
      err({ message: errorMessage, status: 500 })
    );

    const { result } = renderHook(() => useServerActions());

    const createData = {
      name: "Test Server",
      minecraft_version: "1.21.6",
      server_type: ServerType.VANILLA,
      max_memory: 2048,
    };

    let serverResult: MinecraftServer | null = null;

    await act(async () => {
      serverResult = await result.current.createServer(createData);
    });

    expect(serverResult).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });

  it("should import server successfully", async () => {
    vi.mocked(serverService.importServer).mockResolvedValue(ok(mockServer));

    const { result } = renderHook(() => useServerActions());

    const importData = {
      name: "Imported Server",
      description: "Imported server",
      file: new File(["test"], "server.zip", { type: "application/zip" }),
    };

    let serverResult: MinecraftServer | null = null;

    await act(async () => {
      serverResult = await result.current.importServer(importData);
    });

    expect(serverResult).toEqual(mockServer);
    expect(result.current.isImporting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should start server successfully", async () => {
    vi.mocked(serverService.startServer).mockResolvedValue(ok(undefined));

    const { result } = renderHook(() => useServerActions());

    let success = false;

    await act(async () => {
      success = await result.current.startServer(1);
    });

    expect(success).toBe(true);
    expect(result.current.actioningServers.has(1)).toBe(false);
  });

  it("should stop server successfully", async () => {
    vi.mocked(serverService.stopServer).mockResolvedValue(ok(undefined));

    const { result } = renderHook(() => useServerActions());

    let success = false;

    await act(async () => {
      success = await result.current.stopServer(1);
    });

    expect(success).toBe(true);
    expect(result.current.actioningServers.has(1)).toBe(false);
  });

  it("should handle authentication errors and logout", async () => {
    vi.mocked(serverService.createServer).mockResolvedValue(
      err({ message: "Unauthorized", status: 401 })
    );

    const { result } = renderHook(() => useServerActions());

    const createData = {
      name: "Test Server",
      minecraft_version: "1.21.6",
      server_type: ServerType.VANILLA,
      max_memory: 2048,
    };

    await act(async () => {
      await result.current.createServer(createData);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should track actioning servers", async () => {
    // Mock a long-running operation
    vi.mocked(serverService.startServer).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(ok(undefined)), 100))
    );

    const { result } = renderHook(() => useServerActions());

    // Start the operation but don't await it immediately
    let operationPromise: Promise<boolean>;

    await act(async () => {
      operationPromise = result.current.startServer(1);
      // Give it a moment to update the state
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Check that server is being tracked as actioning
    expect(result.current.actioningServers.has(1)).toBe(true);

    // Wait for the operation to complete
    await act(async () => {
      await operationPromise;
    });

    // Check that server is no longer being tracked
    expect(result.current.actioningServers.has(1)).toBe(false);
  });

  it("should provide stable functions", async () => {
    const { result, rerender } = renderHook(() => useServerActions());

    // Wait for the hook to initialize properly
    await waitFor(() => {
      expect(result.current).toBeTruthy();
    });

    const initialCreateServer = result.current.createServer;
    const initialImportServer = result.current.importServer;

    rerender();

    expect(result.current.createServer).toBe(initialCreateServer);
    expect(result.current.importServer).toBe(initialImportServer);
  });
});
