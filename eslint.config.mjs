import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript rules - Strict type safety
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error", // Upgraded from warn to error
      // Removed unsafe rules due to parser configuration complexity in Next.js
      // "@typescript-eslint/no-unsafe-assignment": "warn",
      // "@typescript-eslint/no-unsafe-call": "warn",
      // "@typescript-eslint/no-unsafe-member-access": "warn",
      // "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      
      // React rules
      "react-hooks/exhaustive-deps": "warn",
      
      // Console and debugging - Stricter rule to prevent console statements in production
      "no-console": "error",
      
      // Note: Removed code style rules (semi, quotes, indent) to avoid conflict with Prettier
      // Prettier handles all code formatting, and "prettier" config disables conflicting ESLint rules
    },
  },
  // Allow console statements in test files
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}", "**/__tests__/**/*"],
    rules: {
      "no-console": "off",
    },
  },
  // Special rules for scripts directory - allow CommonJS require
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
    languageOptions: {
      parserOptions: {
        project: false, // Don't use TypeScript project for script files
      },
    },
  },
];

export default eslintConfig;
