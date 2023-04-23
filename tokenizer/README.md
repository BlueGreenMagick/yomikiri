When bundling this library, `.wasm` file need to be loaded as file url.

If using esbuild, add `loader: { ".wasm": "file" }` to the build options.
See 'esbuild.config.js' file for more information.

Run `yarn dev` to test changes.