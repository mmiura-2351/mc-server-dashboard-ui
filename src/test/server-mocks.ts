import { vi } from "vitest";
import { ok, err } from "neverthrow";
import { ServerStatus, ServerType } from "@/types/server";
import type { MinecraftServer } from "@/types/server";

/**
 * Default test server data
 */
export const mockServer: MinecraftServer = {
  id: 1,
  name: "Test Server",
  description: "A test server for unit testing",
  minecraft_version: "1.21.5",
  server_type: ServerType.VANILLA,
  status: ServerStatus.STOPPED,
  directory_path: "servers/test",
  port: 25565,
  max_memory: 2048,
  max_players: 20,
  owner_id: 1,
  template_id: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  process_info: null,
  configurations: [],
};

/**
 * Creates server variations for different test scenarios
 */
export const createMockServer = (
  overrides: Partial<MinecraftServer> = {}
): MinecraftServer => ({
  ...mockServer,
  ...overrides,
});

/**
 * Common server scenarios
 */
export const serverScenarios = {
  stopped: () => createMockServer({ status: ServerStatus.STOPPED }),
  running: () => createMockServer({ status: ServerStatus.RUNNING }),
  starting: () => createMockServer({ status: ServerStatus.STARTING }),
  stopping: () => createMockServer({ status: ServerStatus.STOPPING }),
  error: () => createMockServer({ status: ServerStatus.ERROR }),
  paper: () =>
    createMockServer({
      server_type: ServerType.PAPER,
      name: "Paper Server",
    }),
  forge: () =>
    createMockServer({
      server_type: ServerType.FORGE,
      name: "Forge Server",
    }),
};

/**
 * Creates mock server service responses
 */
export const createServerServiceMocks = () => {
  const getServer = vi.fn();
  const startServer = vi.fn();
  const stopServer = vi.fn();
  const restartServer = vi.fn();
  const deleteServer = vi.fn();
  const getServerProperties = vi.fn();
  const updateServerProperties = vi.fn();

  return {
    getServer,
    startServer,
    stopServer,
    restartServer,
    deleteServer,
    getServerProperties,
    updateServerProperties,

    // Helper methods for common scenarios
    mockGetServerSuccess: (server: MinecraftServer = mockServer) => {
      getServer.mockResolvedValue(ok(server));
    },

    mockGetServerError: (error: string = "Server not found") => {
      getServer.mockResolvedValue(err(error));
    },

    mockServerActionSuccess: () => {
      startServer.mockResolvedValue(ok(undefined));
      stopServer.mockResolvedValue(ok(undefined));
      restartServer.mockResolvedValue(ok(undefined));
      deleteServer.mockResolvedValue(ok(undefined));
    },

    mockServerActionError: (error: string = "Operation failed") => {
      startServer.mockResolvedValue(err(error));
      stopServer.mockResolvedValue(err(error));
      restartServer.mockResolvedValue(err(error));
      deleteServer.mockResolvedValue(err(error));
    },

    reset: () => {
      vi.clearAllMocks();
    },
  };
};

/**
 * Global server service mocks
 */
const serverServiceMocks = createServerServiceMocks();

/**
 * Sets up server service mocks
 */
export const setupServerServiceMocks = () => {
  serverServiceMocks.reset();
  return serverServiceMocks;
};

/**
 * Gets current server service mocks
 */
export const getServerServiceMocks = () => serverServiceMocks;

// Setup the actual mock
vi.mock("@/services/server", () => getServerServiceMocks());
