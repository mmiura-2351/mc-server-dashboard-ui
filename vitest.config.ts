import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      // Coverage provider - using v8 for better performance
      provider: "v8",

      // Include patterns for coverage
      include: ["src/**/*.{ts,tsx}"],

      // Exclude patterns from coverage
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/__tests__/**",
        "src/**/test/**",
        "src/test/**",
        "src/**/*.d.ts",
        "src/**/types.ts",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/page.tsx", // Exclude Next.js page components as they're mainly routing
      ],

      // Coverage thresholds - aim for 80% as mentioned in the requirements
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },

      // Report formats
      reporter: [
        "text", // Terminal output
        "text-summary", // Brief summary in terminal
        "html", // HTML report for detailed viewing
        "lcov", // For CI/CD integration
        "json", // For programmatic access
      ],

      // Output directory for reports
      reportsDirectory: "./coverage",

      // Clean coverage results before running
      clean: true,

      // Skip coverage if no tests are found
      skipFull: false,
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
