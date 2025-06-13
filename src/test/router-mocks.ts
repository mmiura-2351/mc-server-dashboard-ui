import { vi } from "vitest";

/**
 * Creates mock Next.js router functions
 */
export const createMockRouter = (
  overrides: Partial<{
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    forward: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    prefetch: ReturnType<typeof vi.fn>;
  }> = {}
) => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  ...overrides,
});

/**
 * Global navigation state
 */
let navigationState: {
  params: Record<string, string | string[]>;
  pathname: string;
  searchParams: URLSearchParams;
  router: ReturnType<typeof createMockRouter>;
} = {
  params: { id: "1" },
  pathname: "/servers/1",
  searchParams: new URLSearchParams(),
  router: createMockRouter(),
};

/**
 * Creates mock Next.js navigation hooks
 */
export const setupNextNavigationMocks = (
  options: {
    params?: Record<string, string | string[]>;
    pathname?: string;
    searchParams?: URLSearchParams;
    router?: ReturnType<typeof createMockRouter>;
  } = {}
) => {
  navigationState = {
    params: options.params || { id: "1" },
    pathname: options.pathname || "/servers/1",
    searchParams: options.searchParams || new URLSearchParams(),
    router: options.router || createMockRouter(),
  };

  return navigationState;
};

/**
 * Gets current navigation state
 */
export const getNavigationState = () => navigationState;

// Setup the actual mock
vi.mock("next/navigation", () => ({
  useParams: () => getNavigationState().params,
  useRouter: () => getNavigationState().router,
  usePathname: () => getNavigationState().pathname,
  useSearchParams: () => getNavigationState().searchParams,
}));

/**
 * Common router scenarios for testing
 */
export const routerScenarios = {
  serverDetail: (serverId: string = "1") =>
    setupNextNavigationMocks({
      params: { id: serverId },
      pathname: `/servers/${serverId}`,
    }),

  serverDetailWithTab: (serverId: string = "1", tab: string = "info") =>
    setupNextNavigationMocks({
      params: { id: serverId },
      pathname: `/servers/${serverId}`,
      searchParams: new URLSearchParams({ tab }),
    }),

  dashboard: () =>
    setupNextNavigationMocks({
      params: {},
      pathname: "/dashboard",
    }),

  account: () =>
    setupNextNavigationMocks({
      params: {},
      pathname: "/account",
    }),

  admin: () =>
    setupNextNavigationMocks({
      params: {},
      pathname: "/admin",
    }),
};
