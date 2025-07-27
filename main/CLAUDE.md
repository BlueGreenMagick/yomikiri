# CLAUDE.md (`/main`)

## Structure

- `./src/entryPoints`: This folder stores the entry points for each page. Each entrypoint is in the path `entryPoints/[platform]/[page]/`. This folder always have `index.ts` which serves as the TS entry point. It is used as an entry point for ESBuild bundling. The folder may also store `index.html`, which serves as the HTML entry point importing bundled typescript. The folder stores code that is only used for that specific entry point.
  - `./src/entryPoints/android`: android webview entry point
    - `content`: Script that is injected into external web pages displayed in the webview
  - `./src/entryPoints/desktop`: desktop extension entry point
    - `background`: extension content script
    - `content`: extension content script
    - `options`: option page
    - `popup`: extension popup
  - `./src/entryPoints/ios`: ios web extension entry point.
    - `background`: extension background script
    - `content`: extension content script
    - `popup`: extension popup
    - `x-callback`: extension page that is used as app url x-callback destination. The page script opens the last Safari tab to resume browsing after opening a custom app URL scheme.
  - `./src/entryPoints/iosapp`: ios webview entry point.
    - `dictionary`: dictionary page
    - `options`: app options page
    - `optionsAnkiTemplate`: sub-page in options for Anki template configuration
- `./src/features`: Stores code shared by multiple entry points. They are grouped by feature into sub directories.
  - `./src/features/components`: Stores generic Svelte components used by multiple features or entry points.
- `./src/platform`: Stores platform-specific code.
- `./src/assets`: Stores assets.
  - `./src/assets/static`: Stores static assets. These assets are not 'imported' by TS code, and have to be manually bundled for use.
  - Files outside `static` are imported by TS code.
- `./test`: Stores vitest tests
- `./manifest.json.ejs`: Used to build `manifest.json` for web extension.
- `esbuild.config.ts`: The main frontend code is bundled by esbuild.

## Patterns

### Error Handling

- Use `YomikiriError` type from `main/src/features/error.ts`
- Backend errors are wrapped and transformed to frontend-safe formats
- Toast notifications are used for user-facing error messages (`features/toast`)

### State Management

- **Config**: Global app configuration managed in `main/src/features/config.ts`
- **Context**: Platform-specific context via `ctx.ts` files in each platform directory
- **Reactive state**: Svelte stores for component state management
- **Persistence**: Platform-specific store (IndexedDB for desktop, rust DB store(yomikiri-backend-uniffi/db) for mobile)

### Component Patterns

- **Generic components**: Located in `main/src/features/components/`
- **Feature-specific components**: Co-located with their feature logic
- **Platform variants**: Use platform detection to conditionally render UI
- **Actions**: Custom Svelte actions in `main/src/features/components/actions.ts`

### Backend Integration

- **Type safety**: Generated TypeScript bindings ensure type safety between Rust and frontend
- **Platform abstraction**: Backend calls abstracted through platform-specific modules

### Platform-Specific Code

Platform specific code live in `src/platform/{platform_name}/`.

- **Desktop**: Browser extension APIs, content scripts, background scripts
- **iOS**: Native messaging, Safari extension APIs, app URL schemes
- **Android**: WebView integration, native method calls
- **Shared logic**: Common functionality abstracted in `main/src/platform/shared/`
- **types**: Common types shared between all platforms.

Outside the directory, you may only use code that is exported from `@/platform/{platform_name}` (`index.ts`).
There is ane exception for Desktop and iOS platforms, where for tree shaking purposes, different `ctx.ts` are imported based on extension execution context (background, page, content script).

#### Web Extension

For web extension platforms(`desktop`, `ios`), the platform directory has the following sub-directories: `background`, `page`, `content`.

- `content/` contains code that may only be used in content scripts.
- `page/` contains code that may be used in extension page context.
- `background/` contains code that may be used in background script context.

The dependency order is as follows: `content` < `page` < `background`.
Code in `page` may use code in `content`, and `background` can use all code. (unless otherwise specified.)

### Import Conventions

- Use `@/dir/...` for cross-directory (module) imports (e.g., `@/features/...`)
- Use `#icons/filename.svg` for ionicons (e.g., `#icons/add-circle-outline.svg`)
