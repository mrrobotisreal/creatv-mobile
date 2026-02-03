
<img width="1500" height="300" alt="CreaTV_WinAppsProjectCard" src="https://github.com/user-attachments/assets/1bd056f0-cb9a-43eb-aae1-bc66e3bf330c" />

<p align="center">
  <a href="https://docs.creatv.io"><strong>docs.creatv.io</strong></a>
  ·
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#running-the-app">Running the App</a>
  ·
  <a href="#release-builds">Release Builds</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-informational" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-iOS%20%26%20Android-informational" />
  <img alt="License" src="https://img.shields.io/badge/License-See%20LICENSE-informational" />
</p>

# CreaTV Mobile (creatv-mobile)

> ⚠️ This README is NOT up to date with the repository and is still being designed/written.

CreaTV is a next-generation video platform built to empower creators and deliver a premium viewing experience. This repository contains the **mobile application** for **iOS and Android**, optimized for performance, reliability, and mobile-first constraints (variable connectivity, device resources, and native platform behaviors).

**Docs:** https://docs.creatv.io

---

## Table of Contents

- [What’s in this Repo](#whats-in-this-repo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Install](#install)
  - [iOS Setup](#ios-setup)
  - [Android Setup](#android-setup)
- [Running the App](#running-the-app)
- [Environment Configuration](#environment-configuration)
- [Native Modules](#native-modules)
- [Testing](#testing)
- [Release Builds](#release-builds)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## What’s in this Repo

This repository typically includes:
- The CreaTV mobile client (React Native + TypeScript)
- Native iOS and Android integrations (Swift/Obj-C, Kotlin/Java) for performance-critical features
- Authentication, API integration, caching, and analytics plumbing
- A mobile-first UX for watching, browsing, and creator workflows (as enabled)

---

## Tech Stack

### Mobile App
- React Native (CLI-based)
- TypeScript

### Navigation & State
- React Navigation (or equivalent, depending on configuration)
- TanStack React Query (server-state caching, retries, deduping)

### Observability & Analytics (typical)
- PostHog (product analytics)
- Sentry (crash/error monitoring) *(optional but recommended)*

### Platform / APIs
- CreaTV backend APIs (API Gateway + microservices)
- Auth provider (Firebase Auth and/or Supabase, depending on environment)

---

## Getting Started

### Requirements

#### General
- Node.js **20+** (Node **23+** recommended)
- Package manager: **pnpm** / **yarn** / npm (use what the repo is configured for)

#### iOS (macOS required)
- Xcode (latest stable recommended)
- CocoaPods (`sudo gem install cocoapods`), or `bundle exec pod ...` if using Bundler
- Watchman (recommended): `brew install watchman`

#### Android
- Android Studio (with SDK + emulator)
- JDK **17** (recommended)
- Android SDK + platform tools configured (`ANDROID_HOME`)

---

### Install

```bash
# from the repo root
npm install
# or: yarn install
```

---

### iOS Setup

```bash
cd ios
pod install
cd ..
```

If you use Bundler:

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

---

### Android Setup

- Open `android/` in Android Studio to let Gradle sync.
- Ensure you have at least one emulator created (or a physical device connected).

---

## Running the App

### Start Metro

```bash
npm start
# or: yarn start / npm run start
```

### Run iOS

```bash
npm ios
# or: npx react-native run-ios
```

### Run Android

```bash
npm android
# or: npx react-native run-android
```

> If your scripts differ, run `npm -l` (or inspect `package.json`) to see the project’s canonical commands.

---

## Environment Configuration

Create a local env file:

```bash
cp .env.example .env.local
```

**Common environment variables (example names):**
- `CREATV_API_BASE_URL` — API base URL for your environment
- `AUTH_PROVIDER` — `firebase` | `supabase` (if applicable)
- `FIREBASE_*` or `SUPABASE_*` — provider-specific config
- `POSTHOG_KEY`, `POSTHOG_HOST` — analytics *(optional)*
- `SENTRY_DSN` — error monitoring *(optional)*

> Do not commit `.env.local`. Treat it as developer-specific.

---

## Native Modules

CreaTV mobile is designed to leverage native code where it provides meaningful wins:
- iOS: `ios/` (Swift/Objective-C)
- Android: `android/` (Kotlin/Java)

If you add/modify native modules:
- Keep the JS API stable and typed
- Add platform parity notes (if behavior differs)
- Document required entitlements/permissions (camera, photos, mic, etc.)

---

## Testing

Typical test layers:
- Unit tests: `npm test` (Jest)
- Type checks: `npm typecheck`
- Lint: `npm lint`

Optional (recommended as the app grows):
- E2E tests (Detox)
- Crash reproduction + performance profiling in CI

---

## Release Builds

### iOS (Release)
- Use Xcode for signing + archive
- Recommended: configure Fastlane for repeatable releases

### Android (Release)
From `android/`:

```bash
./gradlew assembleRelease
# or: ./gradlew bundleRelease
```

> Release signing requires keystores and CI secrets. Keep signing material out of the repo.

---

## Troubleshooting

Common fixes:
- Reset Metro cache:
  ```bash
  npm start -- --reset-cache
  ```
- Clean iOS build:
  ```bash
  cd ios && xcodebuild clean && cd ..
  ```
- Reinstall pods:
  ```bash
  cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
  ```
- Clean Android build:
  ```bash
  cd android && ./gradlew clean && cd ..
  ```

If something is deeply cursed, try a full reinstall:
- Delete `node_modules/`
- Reinstall dependencies
- Re-run `pod install` (iOS) and Gradle sync (Android)

---

## Security

If you discover a security issue, please follow a responsible disclosure process.

- See: `SECURITY.md` (recommended to add if not present)

---

## Contributing

- See: `CONTRIBUTING.md` (recommended)
- Consider adding: `CODE_OF_CONDUCT.md` for community-facing repos

---

## License

This project is licensed under the terms in the repository’s `LICENSE` file.

---

© 2026 CreaTV Ltd., All Rights Reserved · [LICENSE](./LICENSE)
