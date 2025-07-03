/**
 * Test utilities and mocks for lazy loading components
 */

import { vi } from "vitest";
import React, { ReactElement } from "react";

/**
 * Mock React.lazy for testing
 * Provides immediate resolution of lazy components for testing
 */
export const mockReactLazy = (component: () => ReactElement) => {
  return vi.fn().mockImplementation(() => {
    const MockedComponent = () => component();
    MockedComponent.displayName = "MockedLazyComponent";
    return MockedComponent;
  });
};

/**
 * Mock React.Suspense for testing
 * Renders children immediately without suspense behavior
 */
export const mockSuspense = ({
  children,
  fallback: _fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  return children;
};

/**
 * Create a lazy component mock that can be resolved/rejected for testing
 */
export const createLazyComponentMock = (shouldResolve = true, delay = 0) => {
  const mockComponent = () =>
    React.createElement(
      "div",
      { "data-testid": "lazy-component" },
      "Lazy Component"
    );

  if (shouldResolve) {
    return vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ default: mockComponent });
        }, delay);
      });
    });
  } else {
    return vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Failed to load lazy component"));
        }, delay);
      });
    });
  }
};

/**
 * Mock loading states for lazy components
 */
export const createLoadingStateMock = () => {
  let isLoading = true;
  let hasError = false;
  let error: Error | null = null;

  return {
    get isLoading() {
      return isLoading;
    },
    get hasError() {
      return hasError;
    },
    get error() {
      return error;
    },
    setLoaded() {
      isLoading = false;
      hasError = false;
      error = null;
    },
    setError(err: Error) {
      isLoading = false;
      hasError = true;
      error = err;
    },
    reset() {
      isLoading = true;
      hasError = false;
      error = null;
    },
  };
};

/**
 * Wait for lazy component to load in tests
 */
export const waitForLazyLoad = async (timeout = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
};

/**
 * Mock IntersectionObserver for lazy loading tests
 */
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });

  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: mockIntersectionObserver,
  });

  Object.defineProperty(global, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: mockIntersectionObserver,
  });

  return mockIntersectionObserver;
};

/**
 * Test helper to simulate dynamic import failure
 */
export const simulateImportFailure = (modulePath: string) => {
  // eslint-disable-next-line no-console
  const originalError = console.error;
  // eslint-disable-next-line no-console
  console.error = vi.fn(); // Suppress error logging in tests

  vi.doMock(modulePath, () => {
    throw new Error(`Failed to load module: ${modulePath}`);
  });

  return () => {
    // eslint-disable-next-line no-console
    console.error = originalError;
    vi.doUnmock(modulePath);
  };
};

/**
 * Test helper to measure lazy loading performance
 */
export const measureLazyLoadTime = async (
  lazyLoadFn: () => Promise<unknown>
) => {
  const startTime = performance.now();
  try {
    await lazyLoadFn();
    const endTime = performance.now();
    return {
      success: true,
      duration: endTime - startTime,
      error: null,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      success: false,
      duration: endTime - startTime,
      error: error as Error,
    };
  }
};
