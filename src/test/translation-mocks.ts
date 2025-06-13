import { vi } from "vitest";

/**
 * Common translations used across multiple test files
 */
export const commonTranslations: Record<string, string> = {
  // Common UI elements
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.success": "Success",

  // Error messages
  "errors.generic": "An error occurred",
  "errors.operationFailed": "Operation {action} failed",
  "errors.networkError": "Network error occurred",
  "errors.unauthorized": "Unauthorized access",
  "errors.notFound": "Resource not found",

  // Server related translations
  "servers.title": "Servers",
  "servers.loadingServerDetails": "Loading server details...",
  "servers.serverNotFound": "Server not found",
  "servers.backToDashboard": "← Back to Dashboard",
  "servers.information": "Information",
  "servers.settings": "Settings",
  "servers.properties": "Properties",
  "servers.files": "Files",
  "servers.backups": "Backups",
  "servers.serverInformation": "Server Information",
  "servers.serverActions": "Server Actions",
  "servers.description": "Description",
  "servers.deleteConfirmation":
    "Are you sure you want to delete this server? This action cannot be undone.",

  // Server status
  "servers.status.running": "Running",
  "servers.status.stopped": "Stopped",
  "servers.status.starting": "Starting...",
  "servers.status.stopping": "Stopping...",
  "servers.status.error": "Error",
  "servers.status.unknown": "Unknown",

  // Server actions
  "servers.actions.start": "Start Server",
  "servers.actions.stop": "Stop Server",
  "servers.actions.restart": "Restart Server",
  "servers.actions.delete": "Delete Server",
  "servers.actions.starting": "Starting...",
  "servers.actions.stopping": "Stopping...",
  "servers.actions.restarting": "Restarting...",
  "servers.actions.deleting": "Deleting...",

  // Server fields
  "servers.fields.version": "Minecraft Version",
  "servers.fields.type": "Server Type",
  "servers.fields.maxPlayers": "Max Players",
  "servers.fields.memoryLimit": "Memory Limit",
  "servers.fields.port": "Port",
  "servers.fields.created": "Created",
};

/**
 * Creates a mock translation function with parameter substitution
 */
export const createMockTranslation = (
  customTranslations: Record<string, string> = {}
) => {
  const allTranslations = { ...commonTranslations, ...customTranslations };

  return vi.fn((key: string, params?: Record<string, string>) => {
    let translation = allTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, paramValue);
      });
    }
    return translation;
  });
};

/**
 * Mock language context with translation function
 */
export const createMockLanguageContext = (
  customTranslations: Record<string, string> = {},
  locale: string = "en"
) => ({
  useTranslation: () => ({
    t: createMockTranslation(customTranslations),
    locale,
  }),
});

/**
 * Global language context state
 */
let languageContext = createMockLanguageContext();

/**
 * Sets up language context mock for tests
 */
export const setupLanguageMock = (
  customTranslations: Record<string, string> = {},
  locale: string = "en"
) => {
  languageContext = createMockLanguageContext(customTranslations, locale);
  return languageContext;
};

/**
 * Gets current language context
 */
export const getLanguageContext = () => languageContext;

// Setup the actual mock
vi.mock("@/contexts/language", () => getLanguageContext());
