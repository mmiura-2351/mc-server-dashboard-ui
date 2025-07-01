"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type { MinecraftServer, ServerTemplate } from "@/types/server";
import { ServerStatus } from "@/types/server";

export interface UseServerListReturn {
  servers: MinecraftServer[];
  templates: ServerTemplate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useServerList(): UseServerListReturn {
  const { logout } = useAuth();
  const { t } = useTranslation();

  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [templates, setTemplates] = useState<ServerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [serversResult, templatesResult] = await Promise.all([
        serverService.getServers(),
        serverService.getServerTemplates(),
      ]);

      if (serversResult.isOk()) {
        setServers(serversResult.value);
      } else {
        if (serversResult.error.status === 401) {
          logout();
          return;
        }
        setError(serversResult.error.message);
      }

      if (templatesResult.isOk()) {
        setTemplates(templatesResult.value);
      }
    } catch {
      setError(t("errors.failedToLoadData"));
    } finally {
      setIsLoading(false);
    }
  }, [logout, t]);

  // Load data only once on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const [serversResult, templatesResult] = await Promise.all([
          serverService.getServers(),
          serverService.getServerTemplates(),
        ]);

        if (!isMounted) return;

        if (serversResult.isOk()) {
          setServers(serversResult.value);
        } else {
          if (serversResult.error.status === 401) {
            logout();
            return;
          }
          setError(serversResult.error.message);
        }

        if (templatesResult.isOk()) {
          setTemplates(templatesResult.value);
        }
      } catch {
        if (isMounted) {
          setError(t("errors.failedToLoadData"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [logout, t]);

  // Polling effect for servers in transitional states
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const hasTransitionalServers = servers.some(
      (server) =>
        server.status === ServerStatus.STARTING ||
        server.status === ServerStatus.STOPPING
    );

    if (hasTransitionalServers) {
      intervalId = setInterval(async () => {
        const result = await serverService.getServers();
        if (result.isOk()) {
          setServers(result.value);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [servers]);

  return {
    servers,
    templates,
    isLoading,
    error,
    refresh,
  };
}
