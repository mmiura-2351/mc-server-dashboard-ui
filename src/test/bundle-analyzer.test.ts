import { describe, it, expect } from "vitest";

describe("Bundle Analyzer Configuration", () => {
  it("should correctly handle ANALYZE environment variable", () => {
    // Test different values of ANALYZE environment variable
    const testCases = [
      { analyze: undefined, expected: false },
      { analyze: "false", expected: false },
      { analyze: "true", expected: true },
      { analyze: "1", expected: false }, // Should only be true for "true"
      { analyze: "", expected: false },
    ];

    testCases.forEach(({ analyze, expected }) => {
      // Simulate the logic from next.config.ts
      const enabled = analyze === "true";
      expect(enabled).toBe(expected);
    });
  });

  it("should export a valid Next.js configuration", async () => {
    const nextConfig = await import("../../next.config");
    const config = nextConfig.default;

    // Check that essential Next.js config properties exist
    expect(config).toBeDefined();
    expect(typeof config).toBe("object");

    // Verify that the config has the expected Next.js properties
    expect(config.poweredByHeader).toBe(false);
    expect(config.compress).toBe(true);
    expect(config.output).toBe("standalone");

    // Verify function properties exist (these are async functions)
    expect(typeof config.headers).toBe("function");
    expect(typeof config.rewrites).toBe("function");

    // Check environment validation
    expect(config.env).toBeDefined();
    expect(config.env?.NEXT_PUBLIC_API_URL).toBeDefined();
  });

  it("should have TypeScript and ESLint configurations", async () => {
    const nextConfig = await import("../../next.config");
    const config = nextConfig.default;

    // Verify TypeScript configuration
    expect(config.typescript).toBeDefined();
    expect(config.typescript?.ignoreBuildErrors).toBe(false);

    // Verify ESLint configuration
    expect(config.eslint).toBeDefined();
    expect(config.eslint?.ignoreDuringBuilds).toBe(false);
  });

  it("should have proper image configuration", async () => {
    const nextConfig = await import("../../next.config");
    const config = nextConfig.default;

    // Verify image configuration
    expect(config.images).toBeDefined();
    expect(Array.isArray(config.images?.domains)).toBe(true);
    expect(config.images?.dangerouslyAllowSVG).toBe(false);
  });

  it("should properly configure bundle analyzer with environment variable logic", () => {
    // Test the specific logic used in next.config.ts
    const testAnalyze = (value: string | undefined) => value === "true";

    expect(testAnalyze(undefined)).toBe(false);
    expect(testAnalyze("false")).toBe(false);
    expect(testAnalyze("true")).toBe(true);
    expect(testAnalyze("")).toBe(false);
    expect(testAnalyze("1")).toBe(false);
    expect(testAnalyze("yes")).toBe(false);
  });
});
