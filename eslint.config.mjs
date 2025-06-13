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
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      
      // React rules
      "react-hooks/exhaustive-deps": "warn",
      
      // Console and debugging
      "no-console": ["warn", { allow: ["warn", "error"] }],
      
      // Note: Removed code style rules (semi, quotes, indent) to avoid conflict with Prettier
      // Prettier handles all code formatting, and "prettier" config disables conflicting ESLint rules
    },
  },
];

export default eslintConfig;
