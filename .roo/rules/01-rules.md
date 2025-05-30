# Yomikiri Project Rules

## Project Overview
Yomikiri is a multi-platform Japanese learning tool (Chrome/Firefox extensions, iOS/Android apps) for word lookup and Anki integration. Core backend in Rust, frontend in TypeScript/Svelte.

## Architecture
- **Backend**: Rust crates in `/crates` - shared across platforms via WASM/UniFFI
- **Frontend**: TypeScript/Svelte in `/main/src`
- **iOS**: Native Swift in `/safari` + web extension + action extension (shared `YomikiriTokenizer` Rust binary)
- **Android**: Kotlin in `/android` + WebView
- **Build**: Taskfile-based, use `task dev` for Chrome dev, `task build:extensions` for release

## Platform Constraints
- **iOS**: Memory optimization critical - web extension and app run in separate processes but share config
- **Cross-platform**: Use UniFFI for mobile bindings, WASM for web
- **Generated files**: Dictionary and bindings auto-generated in `/generated`, don't edit directly

## Development Workflow
- **Format**: `task format` (runs dprint + rustfmt)
- **Lint**: `task lint`
- **Test**: `task test`
- **Check**: `task check`

## Code Style
- **Rust**: Follow `rustfmt` and `clippy` defaults
- **TypeScript**: Follow existing patterns, use proper typing
  - Import from different directories using `@/dir/...` (e.g., `@/features/...`)
  - Import ionicons using `#icons/filename.svg` (e.g., `#icons/add-circle-outline.svg`)
- **Error handling**: Use `anyhow` for applications, `thiserror` for library error types, [`YomikiriError`](main/src/features/error.ts) for TypeScript

## Performance Guidelines
- Optimize memory usage for mobile (especially iOS)
- Efficient dictionary loading and Japanese text tokenization
- Lazy loading for large data structures

## Key Patterns
- Cross-platform types defined in `crates/yomikiri-backend/src`
- Platform entry points in `main/src/entryPoints`
- Japanese text processing via Lindera tokenizer (mecab-like library written in Rust)