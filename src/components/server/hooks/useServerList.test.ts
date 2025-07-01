import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useServerList } from "./useServerList";
import * as serverService from "@/services/server";
import { ok } from "neverthrow";

// Mock the server service
vi.mock("@/services/server", () => ({
  getServers: vi.fn(),
  getServerTemplates: vi.fn(),
}));

// Mock contexts with stable functions
const mockLogout = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock("@/contexts/auth", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("useServerList - Simple Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    vi.mocked(serverService.getServers).mockResolvedValue(ok([]));
    vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

    const { result } = renderHook(() => useServerList());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.servers).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("should provide refresh function", async () => {
    vi.mocked(serverService.getServers).mockResolvedValue(ok([]));
    vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

    const { result } = renderHook(() => useServerList());

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should complete loading", async () => {
    vi.mocked(serverService.getServers).mockResolvedValue(ok([]));
    vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

    const { result } = renderHook(() => useServerList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  }, 10000);
});
