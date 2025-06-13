import { vi } from "vitest";
import { Role } from "@/types/auth";

/**
 * Default authenticated user for tests
 */
export const mockAuthenticatedUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  is_approved: true,
  is_active: true,
  role: Role.USER,
};

/**
 * Admin user for tests
 */
export const mockAdminUser = {
  ...mockAuthenticatedUser,
  username: "admin",
  email: "admin@example.com",
  role: Role.ADMIN,
};

/**
 * Operator user for tests
 */
export const mockOperatorUser = {
  ...mockAuthenticatedUser,
  username: "operator",
  email: "operator@example.com",
  role: Role.OPERATOR,
};

/**
 * Creates a mock auth context
 */
export const createMockAuthContext = (
  overrides: Partial<{
    user: typeof mockAuthenticatedUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    updateUserInfo: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
    refreshUser: ReturnType<typeof vi.fn>;
  }> = {}
) => ({
  user: mockAuthenticatedUser,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

/**
 * Global variable to hold current auth context for tests
 */
let currentAuthContext = createMockAuthContext();

/**
 * Sets up auth context mock for tests
 */
export const setupAuthMock = (
  overrides: Parameters<typeof createMockAuthContext>[0] = {}
) => {
  currentAuthContext = createMockAuthContext(overrides);
  return currentAuthContext;
};

/**
 * Gets the current mock auth context
 */
export const getCurrentAuthContext = () => currentAuthContext;

// Setup the actual mock
vi.mock("@/contexts/auth", () => ({
  useAuth: () => getCurrentAuthContext(),
}));

/**
 * Common auth scenarios for testing
 */
export const authScenarios = {
  /** User is authenticated and approved */
  authenticated: () =>
    setupAuthMock({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      isLoading: false,
    }),

  /** User is authenticated admin */
  admin: () =>
    setupAuthMock({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
    }),

  /** User is authenticated operator */
  operator: () =>
    setupAuthMock({
      user: mockOperatorUser,
      isAuthenticated: true,
      isLoading: false,
    }),

  /** User is not authenticated */
  unauthenticated: () =>
    setupAuthMock({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  /** Auth is still loading */
  loading: () =>
    setupAuthMock({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    }),

  /** User is authenticated but not approved */
  unapproved: () =>
    setupAuthMock({
      user: { ...mockAuthenticatedUser, is_approved: false },
      isAuthenticated: true,
      isLoading: false,
    }),
};
