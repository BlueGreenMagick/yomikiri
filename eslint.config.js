import eslint from "@eslint/js";
import tseslintParser from "@typescript-eslint/parser";
import eslintPrettier from "eslint-config-prettier";
import eslintRegexp from "eslint-plugin-regexp";
import eslintSvelte from "eslint-plugin-svelte";
import globals from "globals";
import eslintSvelteParser from "svelte-eslint-parser";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  eslintPrettier,
  ...tseslint.configs.strictTypeChecked,
  ...eslintSvelte.configs["flat/recommended"],
  eslintRegexp.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
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
      // for reactive statement dependencies
      "@typescript-eslint/no-unused-expressions": "off",
      // $: state, func()
      "@typescript-eslint/no-confusing-void-expression": "off",
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
    rules: {
      "@typescript-eslint/no-deprecated": [
        "error",
        {
          allow: [
            {
              from: "lib",
              name: "execCommand",
            },
          ],
        },
      ],
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
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
          },
        },
      ],
      "no-constant-condition": "off",
      "no-inner-declarations": "off",
      "svelte/no-inner-declarations": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    ignores: ["main/build/**/*"],
  },
);
