"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  ConnectionMonitorService,
  connectionMonitor,
  type ConnectionState,
  type ConnectionMonitorConfig,
  type HealthCheckResponse,
} from "@/services/connection-monitor";
import type { ConnectionError } from "@/types/errors";
import { Result } from "neverthrow";

/**
 * Context type for connection monitoring
 */
interface ConnectionContextType {
  /** Current connection state */
  state: ConnectionState;
  /** Manually trigger a connection check */
  checkConnection: () => Promise<Result<HealthCheckResponse, ConnectionError>>;
  /** Reset retry count and clear errors */
  resetRetries: () => void;
  /** Start connection monitoring */
  startMonitoring: () => void;
  /** Stop connection monitoring */
  stopMonitoring: () => void;
  /** Update monitoring configuration */
  updateConfig: (config: Partial<ConnectionMonitorConfig>) => void;
  /** Convenience status checks */
  isConnected: boolean;
  isDisconnected: boolean;
  isChecking: boolean;
  isHealthy: boolean;
  isDegraded: boolean;
  isDown: boolean;
}

/**
 * Create the connection context
 */
const ConnectionContext = createContext<ConnectionContextType | undefined>(
  undefined
);

/**
 * Hook to use connection context
 */
export function useConnection(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
}

/**
 * Props for ConnectionProvider
 */
interface ConnectionProviderProps {
  children: ReactNode;
  /** Override default monitor instance (useful for testing) */
  monitor?: ConnectionMonitorService;
  /** Auto-start monitoring on mount */
  autoStart?: boolean;
  /** Custom configuration */
  config?: Partial<ConnectionMonitorConfig>;
}

/**
 * Connection monitoring context provider
 */
export function ConnectionProvider({
  children,
  monitor = connectionMonitor,
  autoStart = true,
  config,
}: ConnectionProviderProps) {
  const [state, setState] = useState<ConnectionState>(monitor.getState());

  // Update config if provided
  useEffect(() => {
    if (config) {
      monitor.updateConfig(config);
    }
  }, [config, monitor]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = monitor.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [monitor]);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      monitor.start();
    }

    // Cleanup on unmount
    return () => {
      monitor.stop();
    };
  }, [autoStart, monitor]);

  // Context methods
  const checkConnection = useCallback(async () => {
    return monitor.checkConnection();
  }, [monitor]);

  const resetRetries = useCallback(() => {
    monitor.resetRetries();
  }, [monitor]);

  const startMonitoring = useCallback(() => {
    monitor.start();
  }, [monitor]);

  const stopMonitoring = useCallback(() => {
    monitor.stop();
  }, [monitor]);

  const updateConfig = useCallback(
    (newConfig: Partial<ConnectionMonitorConfig>) => {
      monitor.updateConfig(newConfig);
    },
    [monitor]
  );

  // Derived state
  const isConnected = state.isConnected;
  const isDisconnected = !state.isConnected;
  const isChecking = state.isChecking;
  const isHealthy = monitor.isHealthy();
  const isDegraded = monitor.isDegraded();
  const isDown = monitor.isDown();

  const value: ConnectionContextType = {
    state,
    checkConnection,
    resetRetries,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    isConnected,
    isDisconnected,
    isChecking,
    isHealthy,
    isDegraded,
    isDown,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

/**
 * HOC to wrap components with connection monitoring
 */
export function withConnectionMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    autoStart?: boolean;
    config?: Partial<ConnectionMonitorConfig>;
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <ConnectionProvider
        autoStart={options?.autoStart}
        config={options?.config}
      >
        <Component {...props} />
      </ConnectionProvider>
    );
  };
}

/**
 * Hook to check if API operations should be disabled
 */
export function useAPIOperationsDisabled(): boolean {
  const { isConnected } = useConnection();
  return !isConnected;
}

/**
 * Hook to get connection status display information
 */
export function useConnectionStatus() {
  const { state, isHealthy, isDegraded, isDown } = useConnection();

  const getStatusColor = (): string => {
    if (isHealthy) return "green";
    if (isDegraded) return "yellow";
    if (isDown) return "red";
    return "gray";
  };

  const getStatusText = (): string => {
    if (state.isChecking) return "Checking...";
    if (isHealthy) return "Connected";
    if (isDegraded) return "Degraded";
    if (isDown) return "Disconnected";
    return "Unknown";
  };

  const getDowntimeText = (): string | null => {
    if (!state.downtime || state.downtime === 0) return null;

    const seconds = Math.floor(state.downtime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return {
    color: getStatusColor(),
    text: getStatusText(),
    downtime: getDowntimeText(),
    error: state.error,
    lastCheck: state.lastCheck,
    lastSuccessfulConnection: state.lastSuccessfulConnection,
  };
}
