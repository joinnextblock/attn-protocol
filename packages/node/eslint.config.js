import js from "@eslint/js";
import globals from "globals";

/**
 * Node Package ESLint Configuration
 * Standalone JavaScript ESLint config for the node service
 */

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // Naming conventions: snake_case for variables, functions, methods
      "camelcase": "off",
      // Allow unused vars with underscore prefix
      "no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
    },
  },
  {
    ignores: [
      "data/**",
      "test-*.js",
      "node_modules/**",
      "**/*.test.js",
    ],
  },
];
