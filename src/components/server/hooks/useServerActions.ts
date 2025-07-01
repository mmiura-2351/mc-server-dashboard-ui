"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type {
  MinecraftServer,
  CreateServerRequest,
  ServerImportRequest,
} from "@/types/server";

export interface UseServerActionsReturn {
  isCreating: boolean;
  isImporting: boolean;
  actioningServers: Set<number>;
  error: string | null;
  createServer: (data: CreateServerRequest) => Promise<MinecraftServer | null>;
  importServer: (data: ServerImportRequest) => Promise<MinecraftServer | null>;
  startServer: (serverId: number) => Promise<boolean>;
  stopServer: (serverId: number) => Promise<boolean>;
  clearError: () => void;
}

export function useServerActions(): UseServerActionsReturn {
  const { logout } = useAuth();
  const { t } = useTranslation();

  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [actioningServers, setActioningServers] = useState<Set<number>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (status: number) => {
      if (status === 401) {
        logout();
        return true;
      }
      return false;
    },
    [logout]
  );

  const addActioningServer = useCallback((serverId: number) => {
    setActioningServers((prev) => new Set(prev).add(serverId));
  }, []);

  const removeActioningServer = useCallback((serverId: number) => {
    setActioningServers((prev) => {
      const next = new Set(prev);
      next.delete(serverId);
      return next;
    });
  }, []);

  const createServer = useCallback(
    async (data: CreateServerRequest): Promise<MinecraftServer | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await serverService.createServer(data);

        if (result.isOk()) {
          return result.value;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return null;
          }
          setError(result.error.message);
          return null;
        }
      } catch {
        setError(t("errors.failedToCreateServer"));
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [handleAuthError, t]
  );

  const importServer = useCallback(
    async (data: ServerImportRequest): Promise<MinecraftServer | null> => {
      setIsImporting(true);
      setError(null);

      try {
        const result = await serverService.importServer(data);

        if (result.isOk()) {
          return result.value;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return null;
          }
          setError(result.error.message);
          return null;
        }
      } catch {
        setError(t("errors.failedToImportServer"));
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    [handleAuthError, t]
  );

  const startServer = useCallback(
    async (serverId: number): Promise<boolean> => {
      addActioningServer(serverId);
      setError(null);

      try {
        const result = await serverService.startServer(serverId);

        if (result.isOk()) {
          return true;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return false;
          }
          setError(result.error.message);
          return false;
        }
      } catch {
        setError(t("errors.failedToStartServer"));
        return false;
      } finally {
        removeActioningServer(serverId);
      }
    },
    [addActioningServer, removeActioningServer, handleAuthError, t]
  );

  const stopServer = useCallback(
    async (serverId: number): Promise<boolean> => {
      addActioningServer(serverId);
      setError(null);

      try {
        const result = await serverService.stopServer(serverId);

        if (result.isOk()) {
          return true;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return false;
          }
          setError(result.error.message);
          return false;
        }
      } catch {
        setError(t("errors.failedToStopServer"));
        return false;
      } finally {
        removeActioningServer(serverId);
      }
    },
    [addActioningServer, removeActioningServer, handleAuthError, t]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isCreating,
    isImporting,
    actioningServers,
    error,
    createServer,
    importServer,
    startServer,
    stopServer,
    clearError,
  };
}
