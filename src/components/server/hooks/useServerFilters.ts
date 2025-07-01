"use client";

import { useState, useCallback, useMemo } from "react";
import type { MinecraftServer } from "@/types/server";
import { ServerType, ServerStatus } from "@/types/server";

export interface ServerFilters {
  serverType: ServerType | "all";
  serverStatus: ServerStatus | "all";
  minecraftVersion: string;
  searchQuery: string;
  sortBy: "name" | "status" | "created" | "version";
  sortOrder: "asc" | "desc";
}

export interface UseServerFiltersReturn {
  filters: ServerFilters;
  filteredServers: MinecraftServer[];
  availableVersions: string[];
  hasActiveFilters: boolean;
  updateFilters: (updates: Partial<ServerFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: ServerFilters = {
  serverType: "all",
  serverStatus: "all",
  minecraftVersion: "all",
  searchQuery: "",
  sortBy: "status",
  sortOrder: "desc",
};

export function useServerFilters(
  servers: MinecraftServer[]
): UseServerFiltersReturn {
  const [filters, setFilters] = useState<ServerFilters>(DEFAULT_FILTERS);

  const updateFilters = useCallback((updates: Partial<ServerFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Get unique minecraft versions from servers
  const availableVersions = useMemo(() => {
    return Array.from(
      new Set(servers.map((server) => server.minecraft_version))
    ).sort((a, b) => {
      // Sort versions in descending order (newest first)
      const parseVersion = (version: string) => {
        const parts = version.split(".").map(Number);
        return (
          (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0)
        );
      };
      return parseVersion(b) - parseVersion(a);
    });
  }, [servers]);

  // Check if any filters are active (not in default state)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.serverType !== "all" ||
      filters.serverStatus !== "all" ||
      filters.minecraftVersion !== "all" ||
      filters.searchQuery.trim() !== "" ||
      filters.sortBy !== "status" ||
      filters.sortOrder !== "desc"
    );
  }, [filters]);

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    return servers
      .filter((server) => {
        // Check server type filter
        if (
          filters.serverType !== "all" &&
          server.server_type !== filters.serverType
        ) {
          return false;
        }
        // Check server status filter
        if (
          filters.serverStatus !== "all" &&
          server.status !== filters.serverStatus
        ) {
          return false;
        }
        // Check minecraft version filter
        if (
          filters.minecraftVersion !== "all" &&
          server.minecraft_version !== filters.minecraftVersion
        ) {
          return false;
        }
        // Check search query filter (case-insensitive)
        if (
          filters.searchQuery.trim() !== "" &&
          !server.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (filters.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "status":
            // Sort by status priority: running > stopped > error
            const statusPriority: Record<ServerStatus, number> = {
              [ServerStatus.RUNNING]: 3,
              [ServerStatus.STARTING]: 2,
              [ServerStatus.STOPPING]: 1,
              [ServerStatus.STOPPED]: 0,
              [ServerStatus.ERROR]: -1,
            };
            comparison = statusPriority[a.status] - statusPriority[b.status];
            break;
          case "created":
            comparison =
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime();
            break;
          case "version":
            comparison = a.minecraft_version.localeCompare(b.minecraft_version);
            break;
          default:
            return 0;
        }

        return filters.sortOrder === "asc" ? comparison : -comparison;
      });
  }, [servers, filters]);

  return {
    filters,
    filteredServers,
    availableVersions,
    hasActiveFilters,
    updateFilters,
    resetFilters,
  };
}
