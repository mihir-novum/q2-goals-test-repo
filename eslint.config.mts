/**
 * ESLint Configuration
 *
 * Stack   : Next.js · TypeScript · React
 * Config  : Flat config (eslint.config.ts), ESLint v10
 * Plugins : typescript-eslint, eslint-plugin-react, eslint-plugin-react-hooks,
 *           eslint-plugin-unused-imports, @eslint/json, @eslint/markdown,
 *           @eslint/css
 *
 *
 * Naming conventions enforced across the codebase:
 *   snake_case  — variables, functions, parameters, class members,
 *                 type/interface properties, object literal keys
 *   PascalCase  — classes, type aliases, interfaces, enums, React components
 *   camelCase   — React hooks (e.g., useHook)
 *   UPPER_CASE  — module-level constants
 *
 * Type-aware rules (no-floating-promises, await-thenable, etc.) require a
 * tsconfig.json at the project root. The parser resolves it automatically
 * via `parserOptions.project: true`.
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintReact from "@eslint-react/eslint-plugin";

export default defineConfig([
  // --- JavaScript base --------------------------------------------------------
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // --- TypeScript recommended -------------------------------------------------
  tseslint.configs.recommended,

  // --- React Hooks (flat) -----------------------------------------------------
  {
    ...pluginReactHooks.configs.flat["recommended-latest"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
  {
    ...eslintReact.configs["recommended-type-checked"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },

  // --- TypeScript / React rules -----------------------------------------------
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // -----------------------------------------------------------------------
      // NAMING CONVENTIONS
      // -----------------------------------------------------------------------
      "@typescript-eslint/naming-convention": [
        "error",

        {
          selector: "variable",
          modifiers: ["destructured"],
          format: null,
        },
        {
          selector: [
            "classProperty",
            "objectLiteralProperty",
            "typeProperty",
            "classMethod",
            "objectLiteralMethod",
            "typeMethod",
            "accessor",
            "enumMember",
          ],
          modifiers: ["requiresQuotes"],
          format: null,
        },

        // Catch-all: anything not matched by a more specific selector below
        // must be snake_case.
        {
          selector: "default",
          format: ["snake_case"],
          leadingUnderscore: "allow",
          trailingUnderscore: "forbid",
        },

        // REACT HOOKS: Any variable or function starting with "use" MUST be camelCase.
        // This targets hooks explicitly and prevents `use_hook` or `UseHook`.
        {
          selector: ["variable", "function"],
          filter: {
            regex: "^(use|set)",
            match: true,
          },
          format: ["camelCase", "snake_case"],
        },

        // Variables: allow snake_case (standard), UPPER_CASE (constants),
        // and PascalCase (for React components like `const MyComp = () => ...`)
        {
          selector: "variable",
          format: ["snake_case", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          filter: {
            regex: "Ref$",
            match: true,
          },
          format: ["camelCase"],
        },

        // Functions: allow snake_case (standard) and PascalCase (for React components)
        {
          selector: "function",
          format: ["snake_case", "PascalCase"],
        },

        // Parameters: prefix with _ to suppress unused-parameter warnings
        {
          selector: "parameter",
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },

        // Class instance, static properties, and methods: snake_case
        {
          selector: ["classProperty", "classMethod"],
          format: ["snake_case"],
          leadingUnderscore: "allow",
        },

        // Class names, Type aliases, interfaces, and enums: PascalCase
        {
          selector: ["class", "typeLike"],
          format: ["PascalCase"],
        },

        // Object Literals: allow snake_case AND camelCase (to support external configs)
        {
          selector: ["objectLiteralProperty", "objectLiteralMethod"],
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },

        // Interfaces & Types: strict snake_case
        {
          selector: ["typeProperty", "typeMethod"],
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },
        // Enum members: UPPER_CASE
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },

        // Imports are unrestricted
        {
          selector: "import",
          format: ["camelCase", "PascalCase", "snake_case", "UPPER_CASE"],
        },
      ],

      // -----------------------------------------------------------------------
      // UNUSED IMPORTS AND VARIABLES
      // -----------------------------------------------------------------------
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // -----------------------------------------------------------------------
      // EXPLICIT RETURN TYPES
      // -----------------------------------------------------------------------
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // -----------------------------------------------------------------------
      // EXPLICIT ACCESS SPECIFIERS ON CLASS MEMBERS
      // -----------------------------------------------------------------------
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "explicit",
          overrides: {
            constructors: "no-public",
            accessors: "explicit",
          },
        },
      ],

      // -----------------------------------------------------------------------
      // TYPE SAFETY
      // -----------------------------------------------------------------------
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: { attributes: false },
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",

      // -----------------------------------------------------------------------
      // CODE QUALITY
      // -----------------------------------------------------------------------
      "prefer-const": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-duplicate-imports": "error",
      curly: ["error", "all"],
      "no-unneeded-ternary": "error",
      "prefer-template": "error",
      "object-shorthand": ["error", "always"],
      "no-param-reassign": ["error", { props: true }],
      "no-return-await": "error",
      "no-else-return": ["error", { allowElseIf: false }],

      // -----------------------------------------------------------------------
      // REACT AND HOOKS
      // -----------------------------------------------------------------------
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  // --- Config file overrides --------------------------------------------------
  {
    files: [
      "*.config.{js,ts,mjs,cjs}",
      "next.config.*",
      "tailwind.config.*",
      "postcss.config.*",
      "prettier.config.*",
    ],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },

  // --- Test file overrides ----------------------------------------------------
  {
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/test/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  // --- JSON -------------------------------------------------------------------
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: ["json/recommended"],
  },

  // --- Markdown ---------------------------------------------------------------
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },

  // --- CSS --------------------------------------------------------------------
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    languageOptions: {
      tolerant: true,
    },
    rules: {
      "css/no-invalid-at-rules": "off",
      "css/use-baseline": "off",
      "css/no-important": "off",
    },
  },

  // --- Global ignores ---------------------------------------------------------
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "eslint.config.mts",
    "next-env.d.ts",
    "package.json",
    "postcss.config.mjs",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "next.config.ts",
    "next-env.d.ts",
    ".env.*",
    "README.md",
    "scripts/**",
    "node_modules/**",
  ]),
]);
