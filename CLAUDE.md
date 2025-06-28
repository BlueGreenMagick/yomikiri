# CLAUDE.md (`/`)

This CLAUDE.md file describes an overview of the Yomikiri project code. This file is located in the project root directory.

## Project Overview

Yomikiri is a multi-platform Japanese immersion learning tool for word lookup and Anki flashcard integration. It's available as Chrome/Firefox extensions, iOS/Android apps, and includes features like hover definitions, sentence translation, and grammar explanations.

## Architecture

The project follows a monorepo structure with shared Rust backend and platform-specific frontends.

Most UI is drawn by web frontend located in `/main/`. It uses SvelteJS. Some UI in Android and iOS is drawn natively using Jetpack Compose and SwiftUI.

Some shared complex logic (Japanese tokenization, morphological analysis, and dictionary search) is written in rust located in `/crates/yomikiri-backend`. The crate is exposed for desktop browser extensions as a wasm (`/crates/yomikiri-backend-wasm/`), and for iOS/Android app natively compiled with Swift/Kotlin bindings (`/crates/yomikiri-backend-uniffi`)

Some crates and packages are used to generate files and artifacts that are bundled with the software.

### Rust Crates

- `/crates/yomikiri-dictionary`: Dictionary data structures, entry parsing, and search functionality
- `/crates/yomikiri-dictionary-generator`: CLI tool to download JMDict/JMNEDict XML files and generate `.yomikiridict` file
- `/crates/jmdict`: JMDict and JMNEDict XML parser (Japanese-English dictionary data)
- `/crates/japanese-utils`: Japanese text utilities and helper functions
- `/crates/unidic-types`: UniDic morphological analyzer type definitions
- `/crates/unidic`: UniDic dictionary transformation and generation tools.
- `/crates/yomikiri-backend`: Main backend logic - tokenization, dictionary lookup, grammar analysis
- `/crates/yomikiri-backend-wasm`: WASM bindings of `yomikiri-backend` crate for desktop web extensions
- `/crates/yomikiri-backend-uniffi`: UniFFI bindings of `yomikiri-backend` for iOS/Android native integration. A Swift/Kotlin bindings for the crate is generated.

### JS packages

- `/main`: Main web UI and logic.
- `/extra/generate-license`: Collects third-party licenses of the project dependencies and generate license file.

### Other directories

- `/safari`: iOS app written in Swift and SwiftUI. Contains Safari web extension and action extension.
- `/android`: Android app written in Kotlin and Jetpack Compose.
- `extra/resources`: Contains app icons, screenshots, and other resources that aren't used for building the app. Mostly used in README.md and other documentations.
- `/extra/taskfile`: Taskfile that holds shared tasks and constants.
  - `/extra/taskfile/Consts-Taskfile.yml`: Holds directory path constants that are used by multiple taskfiles. Especially all paths in `/generated`, which need to be included in the taskfile for crate/package that generates the files, and the taskfile that uses the files.
  - `/extra/taskfile/Rust-Taskfile.yml`: Holds `format`, `check`, `lint`, `test`, `_rustup_install`, and `_void` task which are shared by all rust crate taskfiles. `_void` task is an empty task. `_rustup_install` executes `rustup target add {{.TARGET}}`.
- `extra/scripts`: Directory for scripts used in root project.
- `/generated`: All generated artifacts are generated into this directory, where they are then used by other package/crate.

## Build Process Order

The build system follows this dependency order:

### Shared Dependencies

1. Download JMDict/JMneDict XML and generate `.yomikiridict` dictionary file
2. Download UniDic file, and transform the file to add & remove entries, and encode the values for smaller file size.
3. Collect and generate third-party license files.
4. TS bindings for yomikiri-backend crate is generated, as `@yomikiri/backend-bindings` package.

### Platform-specific build

#### Desktop Browser Extension

1. `yomikiri-backend-wasm` is built into wasm
2. `/main` is built for chrome and firefox

#### iOS

1. `yomikiri-backend-uniffi` crate is built for ios.
2. `yomikiri-backend-uniffi` Swift bindings are generated using UniFFI
3. `/main` is built for ios and iosapp

#### Android

1. `task build:android` runs `./android/gradlew build`, which runs `task prepare:android` at the step of build step
1. `yomikiri-backend-uniffi` crate is built for android.
1. `yomikiri-backend-uniffi` Kotlin bindings are generated using UniFFI
1. `/main` is built for android
1. Generated android files are copied into their places within `/android`
1. gradle build continues and builds apk file

## Common Development Commands

### Main Commands

The below commands can be run in root, and in most project subdirectories.
These commands are defined in the directory's `Taskfile.yml` file.

- `task format`: Format code
- `task lint`: Lint
- `task test`: Test code
- `task check`: Check code
- `task build`: Build
- `task check-format` (Only in project root)

**Standard workflow**: Make changes → `task format` → `task lint` → `task test` → `task build`

### Build Commands (only at project root)

- `task build:chrome`
- `task build:firefox`
- `task build:ios`
- `task build:android`
- `task build:all`

## Development Workflow

## Key Development Patterns

- Shared types defined in `crates/yomikiri-backend/src`
  - TypeScript bindings generated via `task backend:tsbinding`
  - Native mobile bindings generated via UniFFI
- Memory optimization is critical for backend crate for iOS (web extension has a memory limit of 80MB)
- Resources such as dictionary files and platform bindings are auto-generated into `/generated/`
  - Don't edit the generated files directly.
