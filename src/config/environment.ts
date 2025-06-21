// Environment type for better type safety
export type Environment = "development" | "production" | "test";

// Helper function for runtime environment detection
export function getEnvironmentMode() {
  // Check for runtime environment override first, with fallback to development
  // Use explicit checks for empty strings to handle edge cases properly
  const nextRuntimeEnv = process.env.NEXT_RUNTIME_ENV;
  const nodeEnv = process.env.NODE_ENV;

  const runtimeEnv = ((nextRuntimeEnv && nextRuntimeEnv.trim()) ||
    (nodeEnv && nodeEnv.trim()) ||
    "development") as Environment;

  return {
    isProduction: runtimeEnv === "production",
    isDevelopment: runtimeEnv === "development",
    isTest: runtimeEnv === "test",
  };
}
