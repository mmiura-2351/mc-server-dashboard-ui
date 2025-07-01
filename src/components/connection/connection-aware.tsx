"use client";

import React, { ReactNode, forwardRef } from "react";
import { useConnection } from "@/contexts/connection";
import { useTranslation } from "@/contexts/language";
import styles from "./connection-aware.module.css";

/**
 * Props for connection-aware components
 */
interface ConnectionAwareProps {
  /** Whether to show a message when disconnected */
  showDisconnectedMessage?: boolean;
  /** Custom message to show when disconnected */
  disconnectedMessage?: string;
  /** Allow degraded connections (yellow status) */
  allowDegraded?: boolean;
  /** Custom CSS class for disabled state */
  disabledClassName?: string;
  /** Whether to disable on checking state as well */
  disableOnChecking?: boolean;
}

/**
 * HOC to wrap components and disable them when API is disconnected
 */
export function withConnectionAware<P extends object>(
  Component: React.ComponentType<P>,
  options: ConnectionAwareProps = {}
) {
  const ConnectionAwareComponent = forwardRef<
    HTMLElement,
    P & ConnectionAwareProps
  >((props, ref) => {
    const {
      showDisconnectedMessage = true,
      disconnectedMessage,
      allowDegraded = true,
      disabledClassName = "",
      disableOnChecking = false,
      ...componentProps
    } = { ...options, ...props };

    const { isConnected, isDegraded, isChecking } = useConnection();
    const { t } = useTranslation();

    const isDisabled =
      !isConnected ||
      (!allowDegraded && isDegraded) ||
      (disableOnChecking && isChecking);

    if (isDisabled) {
      const message =
        disconnectedMessage || t("connection.error.connectionFailed");

      if (showDisconnectedMessage) {
        return (
          <div className={`${styles.disconnectedWrapper} ${disabledClassName}`}>
            <div className={styles.disabledOverlay}>
              <span className={styles.disabledMessage}>{message}</span>
            </div>
            <div className={styles.disabledContent}>
              <Component {...(componentProps as P)} ref={ref} />
            </div>
          </div>
        );
      }

      return null;
    }

    return <Component {...(componentProps as P)} ref={ref} />;
  });

  ConnectionAwareComponent.displayName = `ConnectionAware(${Component.displayName || Component.name})`;

  return ConnectionAwareComponent;
}

/**
 * Hook to get connection-aware button props
 */
export function useConnectionAwareButton(options: ConnectionAwareProps = {}) {
  const { allowDegraded = true, disableOnChecking = false } = options;

  const { isConnected, isDegraded, isChecking } = useConnection();
  const { t } = useTranslation();

  const isDisabled =
    !isConnected ||
    (!allowDegraded && isDegraded) ||
    (disableOnChecking && isChecking);

  const getDisabledReason = (): string | null => {
    if (!isConnected) return t("connection.error.connectionFailed");
    if (!allowDegraded && isDegraded)
      return t("connection.error.connectionTimeout");
    if (disableOnChecking && isChecking) return t("connection.status.checking");
    return null;
  };

  const disabledReason = getDisabledReason();

  return {
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    title: isDisabled ? disabledReason || undefined : undefined,
    className: isDisabled ? styles.disabledButton : "",
    // Non-DOM props for external use
    connectionProps: {
      disabledReason,
      isConnected,
      isDegraded,
      isChecking,
    },
  };
}

/**
 * Hook to conditionally render API-dependent content
 */
export function useConnectionAwareRender(options: ConnectionAwareProps = {}) {
  const { allowDegraded = true, disableOnChecking = false } = options;

  const { isConnected, isDegraded, isChecking } = useConnection();

  const shouldRender =
    isConnected &&
    (allowDegraded || !isDegraded) &&
    (!disableOnChecking || !isChecking);

  const shouldDisable =
    !isConnected ||
    (!allowDegraded && isDegraded) ||
    (disableOnChecking && isChecking);

  return {
    shouldRender,
    shouldDisable,
    isConnected,
    isDegraded,
    isChecking,
  };
}

/**
 * Component wrapper for conditional rendering based on connection state
 */
interface ConnectionGuardProps extends ConnectionAwareProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConnectionGuard({
  children,
  fallback,
  showDisconnectedMessage = true,
  disconnectedMessage,
  allowDegraded = true,
  disableOnChecking = false,
}: ConnectionGuardProps) {
  const { shouldRender } = useConnectionAwareRender({
    allowDegraded,
    disableOnChecking,
  });
  const { t } = useTranslation();

  if (!shouldRender) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDisconnectedMessage) {
      const message =
        disconnectedMessage || t("connection.error.connectionFailed");
      return (
        <div className={styles.guardMessage}>
          <span className={styles.guardIcon}>🔌</span>
          <span className={styles.guardText}>{message}</span>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

/**
 * Button component that automatically disables when API is disconnected
 */
interface ConnectionAwareButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ConnectionAwareProps {
  children: ReactNode;
  showTooltip?: boolean;
}

export const ConnectionAwareButton = forwardRef<
  HTMLButtonElement,
  ConnectionAwareButtonProps
>(
  (
    {
      children,
      showTooltip = true,
      allowDegraded = true,
      disableOnChecking = false,
      className = "",
      ...buttonProps
    },
    ref
  ) => {
    const { connectionProps: _connectionProps, ...domProps } =
      useConnectionAwareButton({
        allowDegraded,
        disableOnChecking,
      });

    const combinedClassName = `${className} ${domProps.className}`.trim();

    return (
      <button
        {...buttonProps}
        {...domProps}
        className={combinedClassName}
        ref={ref}
        title={
          showTooltip ? domProps.title || buttonProps.title : buttonProps.title
        }
      >
        {children}
      </button>
    );
  }
);

ConnectionAwareButton.displayName = "ConnectionAwareButton";

/**
 * Form wrapper that disables submission when API is disconnected
 */
interface ConnectionAwareFormProps
  extends React.FormHTMLAttributes<HTMLFormElement>,
    ConnectionAwareProps {
  children: ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const ConnectionAwareForm = forwardRef<
  HTMLFormElement,
  ConnectionAwareFormProps
>(
  (
    {
      children,
      onSubmit,
      allowDegraded = true,
      disableOnChecking = false,
      className = "",
      ...formProps
    },
    ref
  ) => {
    const { shouldDisable } = useConnectionAwareRender({
      allowDegraded,
      disableOnChecking,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      if (shouldDisable) {
        event.preventDefault();
        return;
      }
      onSubmit?.(event);
    };

    const combinedClassName = shouldDisable
      ? `${className} ${styles.disabledForm}`.trim()
      : className;

    return (
      <form
        {...formProps}
        className={combinedClassName}
        onSubmit={handleSubmit}
        ref={ref}
      >
        <fieldset disabled={shouldDisable} className={styles.formFieldset}>
          {children}
        </fieldset>
      </form>
    );
  }
);

ConnectionAwareForm.displayName = "ConnectionAwareForm";
