import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintRegexp from 'eslint-plugin-regexp'
import eslintSvelte from 'eslint-plugin-svelte'
import eslintSvelteParser from 'svelte-eslint-parser'
import tseslintParser from '@typescript-eslint/parser'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...eslintSvelte.configs['flat/recommended'],
  eslintRegexp.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        project: ['main/tsconfig.json', 'extra/generate-license/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte']
      }
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: eslintSvelteParser,
      parserOptions: {
        parser: tseslintParser
      }
    },
    
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
        }
      ]
    }
  }
)