"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type { Result } from "neverthrow";
import type { AuthError } from "@/types/auth";
import type {
  MinecraftServer,
  CreateServerRequest,
  ServerImportRequest,
} from "@/types/server";

export interface UseServerActionsReturn {
  isCreating: boolean;
  isImporting: boolean;
  isSubmitting: boolean;
  actioningServers: Set<number>;
  error: string | null;
  createServer: (
    data: CreateServerRequest
  ) => Promise<Result<MinecraftServer, AuthError>>;
  importServer: (
    data: ServerImportRequest
  ) => Promise<Result<MinecraftServer, AuthError>>;
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
    async (
      data: CreateServerRequest
    ): Promise<Result<MinecraftServer, AuthError>> => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await serverService.createServer(data);

        if (result.isOk()) {
          return result;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return result;
          }
          setError(result.error.message);
          return result;
        }
      } catch {
        const errorMsg = t("errors.failedToCreateServer");
        setError(errorMsg);
        return {
          isOk: () => false,
          isErr: () => true,
          error: { message: errorMsg },
        } as Result<MinecraftServer, AuthError>;
      } finally {
        setIsCreating(false);
      }
    },
    [handleAuthError, t]
  );

  const importServer = useCallback(
    async (
      data: ServerImportRequest
    ): Promise<Result<MinecraftServer, AuthError>> => {
      setIsImporting(true);
      setError(null);

      try {
        const result = await serverService.importServer(data);

        if (result.isOk()) {
          return result;
        } else {
          if (handleAuthError(result.error.status ?? 500)) {
            return result;
          }
          setError(result.error.message);
          return result;
        }
      } catch {
        const errorMsg = t("errors.failedToImportServer");
        setError(errorMsg);
        return {
          isOk: () => false,
          isErr: () => true,
          error: { message: errorMsg },
        } as Result<MinecraftServer, AuthError>;
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
    isSubmitting: isCreating || isImporting,
    actioningServers,
    error,
    createServer,
    importServer,
    startServer,
    stopServer,
    clearError,
  };
}
