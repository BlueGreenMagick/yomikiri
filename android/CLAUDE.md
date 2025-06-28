# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the Android directory for the Yomikiri project. For project overview and general architecture, see `/CLAUDE.md` in the project root.

## Android App Architecture

The Android app is written in Kotlin using Jetpack Compose and integrates with the shared Rust backend via UniFFI bindings. The app consists of:

- **MainActivity**: Main app entry point with Compose UI setup
- **AppEnvironment**: Application state management and backend integration
- **BackendManager**: Thread-safe manager for Rust backend instances with connection pooling
- **DictionaryManager**: Handles dictionary file management and loading
- **YomikiriWebView**: WebView component that loads the main Svelte UI from `/main`
- **UniFFI Bindings**: Auto-generated Kotlin bindings for Rust backend (`uniffi.yomikiri_backend_uniffi`)

The app uses a hybrid architecture where:
- Native UI components (header, navigation) are built with Jetpack Compose
- Core UI functionality is rendered via WebView loading the built Svelte app from `/main`
- Backend logic (dictionary lookup, tokenization) runs in Rust via UniFFI

## Key Dependencies

- **Jetpack Compose**: Modern Android UI toolkit
- **Anki-Android API**: Integration with Anki flashcard app
- **UniFFI**: Rust-Kotlin FFI bindings for backend integration
- **WebKit**: WebView for loading main Svelte UI
- **DataStore**: Preferences storage

## Development Commands

From the android directory:

- `task prepare`: Copy generated files (Rust libs, Kotlin bindings, main UI, dictionary) into Android project
- `task build`: Build the Android app (`./gradlew build`)
- `task lint`: Run Android linting (`./gradlew lint`)
- `task check`: Run checks (`./gradlew check`)
- `task test`: Run unit tests (`./gradlew test`)

From project root:
- `task build:android`: Full Android build including dependencies
- `task prepare:android`: Prepare Android dependencies (called by Android gradle build)

## Build Process

1. **Dependencies preparation**: `task prepare:android` generates:
   - Rust backend compiled for Android targets (`jniLibs/`)
   - UniFFI Kotlin bindings (`backend/uniffi/`)
   - Main Svelte UI built for Android (`assets/main/`)
   - Dictionary files (`assets/dictionary/`)

2. **Android build**: `./gradlew build` runs the standard Android build after dependencies are ready

## Generated Files (Do Not Edit)

These files are auto-generated and should not be manually edited:
- `app/src/main/jniLibs/` - Rust native libraries for different Android architectures
- `app/src/main/java/com/yoonchae/yomikiri/backend/uniffi/` - UniFFI Kotlin bindings
- `app/src/main/assets/main/` - Built Svelte UI from `/main`
- `app/src/main/assets/dictionary/` - Dictionary files

## Testing

- Unit tests: `./gradlew test`
- Instrumented tests: `./gradlew connectedAndroidTest`
- UI tests using Compose testing framework in `androidTest/`

## Key Development Patterns

- Backend operations must use `BackendManager.withBackend()` for thread safety
- WebView integration handles communication between Kotlin and Svelte UI
- Memory optimization is critical due to mobile constraints
- Always use generated UniFFI bindings for Rust backend communication