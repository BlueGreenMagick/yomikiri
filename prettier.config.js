/** @type {import('prettier').Config} */
export default {
  experimentalTernaries: true,
  plugins: ["prettier-plugin-svelte"],
  overrides: [
    {
      files: ["**/*.yml", "**/*.yaml"],
      options: {
        singleQuote: true,
      },
    },
  ],
};
