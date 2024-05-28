import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintRegexp from "eslint-plugin-regexp";
import eslintSvelte from "eslint-plugin-svelte";
import eslintSvelteParser from "svelte-eslint-parser";
import eslintPrettier from "eslint-config-prettier";
import tseslintParser from "@typescript-eslint/parser";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  eslintPrettier,
  ...tseslint.configs.strictTypeChecked,
  ...eslintSvelte.configs["flat/recommended"],
  eslintRegexp.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        project: ["main/tsconfig.json", "extra/generate-license/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: eslintSvelteParser,
      parserOptions: {
        parser: tseslintParser,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "svelte/valid-compile": ["error", { ignoreWarnings: true }],
      // does not support 'generics' attribute
      "no-undef": "off",
    },
  },
  {
    files: ["main/src/**/*"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNever: true,
          allowNumber: true,
        },
      ],
      "@typescript-eslint/no-unnecessary-condition": "off",
      "no-constant-condition": "off",
      "no-inner-declarations": "off",
      "svelte/no-inner-declarations": "off",
      "@typescript-eslint/dot-notation": "off",
    },
  },
  {
    ignores: ["main/build/**/*"],
  },
);
