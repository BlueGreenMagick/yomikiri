import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from "node:fs";
import path from "node:path";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";
import postCssImport from "postcss-import";
import Package from "./package.json" assert { type: "json" };
import AdmZip from "adm-zip";
import tsconfigPaths from 'vite-tsconfig-paths'

const PRODUCTION = process.env.NODE_ENV?.toLowerCase() === "production";
const DEVELOPMENT = !PRODUCTION;

const TARGET = process.env.TARGET_PLATFORM;

if (
  TARGET === undefined ||
  !["chrome", "firefox", "safari_desktop", "ios", "iosapp"].includes(TARGET)
) {
  throw new Error(
    `TARGET_PLATFORM env variable must be set to one of chrome/firefox/safari_desktop/ios/iosapp, but is set to: ${TARGET}`
  );
}
const FOR_CHROME = TARGET === "chrome";
const FOR_FIREFOX = TARGET === "firefox";
const FOR_SAFARI_DESKTOP = TARGET === "safari_desktop";

const FOR_DESKTOP = ["chrome", "firefox", "safari_desktop"].includes(TARGET);
const FOR_IOS = TARGET === "ios";
const FOR_IOSAPP = TARGET === "iosapp";

const WATCH = DEVELOPMENT && !FOR_IOS;

/** Package */
const VERSION = Package.version;

const svelteConfiguredPlugin = svelte({
  preprocess: sveltePreprocess({
    postcss: {
      plugins: [postCssImport()]
    }
  }),
  compilerOptions: { css: true },
  onwarn: (warning, defaultHandler) => {
    const ignore = [
      "a11y-no-noninteractive-tabindex",
      "a11y-click-events-have-key-events",
      "css-unused-selector",
    ];
    if (ignore.includes(warning.code)) return;
    defaultHandler!(warning)
  },
  extensions: ['.svelte', '.svg']
})

function platformAliasDestination(): string {
  if (FOR_IOS) {
    return 'platform/ios'
  } else if (FOR_IOSAPP) {
    return 'platform/iosapp'
  } else {
    return 'platform/desktop'
  }
}

function buildGeneratedJsPlugin(): Plugin {
  let rootSrc
  return {
    name: 'buildGeneratedJsPlugin',

    resolveId(source, importer, options) {
      if (path.resolve(importer ?? "", source) === fullpath('generated')) {
        console.log('gen')
      }
      return null
    },

    configResolved(config) {
      rootSrc = path.resolve(import.meta.dirname, config.root)
    }
  }
}

function buildManifestPlugin(): Plugin {
  return {
    name: 'buildManifestPlugin',

    generateBundle() {
      const raw = fs.readFileSync('./src/manifest.json.ejs', { encoding: 'utf-8' })
      const rendered = ejs.render(raw, {
        version: VERSION,
        chrome: FOR_CHROME,
        firefox: FOR_FIREFOX,
        safari_desktop: FOR_SAFARI_DESKTOP,
        desktop: FOR_DESKTOP,
        ios: FOR_IOS,
        v2: FOR_FIREFOX || FOR_SAFARI_DESKTOP,
      });

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: rendered
      })
    },
  }
}

/* resolve path relative to './src' */
function fullpath(relative: string): string {
  return path.resolve(import.meta.dirname, 'src', relative)
}

export default defineConfig({
  root: 'src',
  base: '',
  mode: 'production',
  define: {
    __VERSION__: Package.version,
  },
  publicDir: false,
  assetsInclude: ['**/*.wasm', '**/*.json.gz', '**/*.yomikiridict', '**/*.yomikiriindex', '**/*.chunk'],
  build: {
    target: [
      "es2017",
      ...(FOR_IOS || FOR_IOSAPP ? ["safari15.4"] : []),
      ...(FOR_CHROME ? ["chrome99"] : []),
      ...(FOR_FIREFOX ? ["firefox55"] : []),
      ...(FOR_SAFARI_DESKTOP ? ["safari14.1"] : []),
    ],
    outDir: `build/${TARGET}`,
    assetsDir: 'res/assets',
    sourcemap: DEVELOPMENT ? 'inline' : false,
    minify: false,
    emptyOutDir: true,
    watch: null,
    rollupOptions: {
      input: {
        'content': 'src/extension/content/index.ts',
        'background': 'src/extension/background/index.ts',
        'popup': 'src/extension/popup/index.ts'
      },
      output: {
        dir: `build/${TARGET}`,
        format: 'es',
        entryFileNames: 'res/[name].js',
        inlineDynamicImports: false
      },
    },
  },
  json: {
    stringify: true,
  },
  plugins: [
    svelteConfiguredPlugin,
    buildManifestPlugin(),
    buildGeneratedJsPlugin()
  ],
  resolve: {
    alias: {
      '@platform': fullpath(platformAliasDestination()),
      '~': fullpath('.'),
      '@icons': fullpath('../node_modules/ionicons/dist/svg'),
    }
  }
})

