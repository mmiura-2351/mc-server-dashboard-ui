import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useServerFilters } from "./useServerFilters";
import { ServerStatus, ServerType } from "@/types/server";
import type { MinecraftServer } from "@/types/server";

const mockServers: MinecraftServer[] = [
  {
    id: 1,
    name: "Alpha Server",
    minecraft_version: "1.21.6",
    server_type: ServerType.VANILLA,
    status: ServerStatus.RUNNING,
    max_memory: 2048,
    description: "First test server",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    owner_id: 1,
    directory_path: "/servers/alpha",
    port: 25565,
    max_players: 20,
    template_id: null,
  },
  {
    id: 2,
    name: "Beta Server",
    minecraft_version: "1.21.5",
    server_type: ServerType.PAPER,
    status: ServerStatus.STOPPED,
    max_memory: 4096,
    description: "Second test server",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    owner_id: 1,
    directory_path: "/servers/beta",
    port: 25566,
    max_players: 30,
    template_id: null,
  },
  {
    id: 3,
    name: "Gamma Server",
    minecraft_version: "1.21.6",
    server_type: ServerType.FORGE,
    status: ServerStatus.ERROR,
    max_memory: 8192,
    description: "Third test server",
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
    owner_id: 1,
    directory_path: "/servers/gamma",
    port: 25567,
    max_players: 40,
    template_id: null,
  },
];

describe("useServerFilters", () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it("should initialize with default filter state", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    expect(result.current.filters.serverType).toBe("all");
    expect(result.current.filters.serverStatus).toBe("all");
    expect(result.current.filters.minecraftVersion).toBe("all");
    expect(result.current.filters.searchQuery).toBe("");
    expect(result.current.filters.sortBy).toBe("status");
    expect(result.current.filters.sortOrder).toBe("desc");
  });

  it("should return all servers when no filters are applied", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    expect(result.current.filteredServers).toHaveLength(3);
    expect(result.current.filteredServers).toEqual(
      expect.arrayContaining(mockServers)
    );
  });

  it("should filter servers by type", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    act(() => {
      result.current.updateFilters({ serverType: ServerType.VANILLA });
    });

    expect(result.current.filteredServers).toHaveLength(1);
    expect(result.current.filteredServers[0]?.server_type).toBe(
      ServerType.VANILLA
    );
  });

  it("should filter servers by status", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    act(() => {
      result.current.updateFilters({ serverStatus: ServerStatus.RUNNING });
    });

    expect(result.current.filteredServers).toHaveLength(1);
    expect(result.current.filteredServers[0]?.status).toBe(
      ServerStatus.RUNNING
    );
  });

  it("should filter servers by minecraft version", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    act(() => {
      result.current.updateFilters({ minecraftVersion: "1.21.6" });
    });

    expect(result.current.filteredServers).toHaveLength(2);
    expect(
      result.current.filteredServers.every(
        (server) => server.minecraft_version === "1.21.6"
      )
    ).toBe(true);
  });

  it("should filter servers by search query", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    act(() => {
      result.current.updateFilters({ searchQuery: "alpha" });
    });

    expect(result.current.filteredServers).toHaveLength(1);
    expect(result.current.filteredServers[0]?.name.toLowerCase()).toContain(
      "alpha"
    );
  });

  it("should sort servers by name", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    act(() => {
      result.current.updateFilters({ sortBy: "name", sortOrder: "asc" });
    });

    const names = result.current.filteredServers.map((server) => server.name);
    expect(names).toEqual(["Alpha Server", "Beta Server", "Gamma Server"]);
  });

  it("should reset filters to default state", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    // Apply some filters
    act(() => {
      result.current.updateFilters({
        serverType: ServerType.PAPER,
        searchQuery: "test",
        sortBy: "name",
      });
    });

    // Reset filters
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.serverType).toBe("all");
    expect(result.current.filters.searchQuery).toBe("");
    expect(result.current.filters.sortBy).toBe("status");
    expect(result.current.filteredServers).toHaveLength(3);
  });

  it("should indicate when filters are active", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.updateFilters({ searchQuery: "test" });
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("should provide available versions from servers", () => {
    const { result } = renderHook(() => useServerFilters(mockServers));

    expect(result.current.availableVersions).toContain("1.21.6");
    expect(result.current.availableVersions).toContain("1.21.5");
    expect(result.current.availableVersions).toHaveLength(2);
  });

  it("should provide stable functions", () => {
    const { result, rerender } = renderHook(() =>
      useServerFilters(mockServers)
    );

    const initialUpdateFilters = result.current.updateFilters;
    const initialResetFilters = result.current.resetFilters;

    rerender();

    expect(result.current.updateFilters).toBe(initialUpdateFilters);
    expect(result.current.resetFilters).toBe(initialResetFilters);
  });
});
