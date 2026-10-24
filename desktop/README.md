# Household Finance — Windows and Mac

This Electron desktop shell opens the **existing** secure Finance Dashboard at https://finance.ajdapp.org/. It does **not** create a new household, replicate private finance records, bypass Supabase Auth, or modify the data schema.

## Where to download

- Download center: https://finance.ajdapp.org/download
- Windows x64 installer: [Household-Finance-Windows-Setup.exe](https://github.com/Jhamal96/Finances/releases/download/desktop-latest/Household-Finance-Windows-Setup.exe)
- macOS Intel / Apple Silicon installer: [Household-Finance-macOS.dmg](https://github.com/Jhamal96/Finances/releases/download/desktop-latest/Household-Finance-macOS.dmg)
- Android APK preview: [Household-Finance-Android.apk](https://github.com/Jhamal96/Finances/releases/download/android-preview/Household-Finance-Android.apk)
- iOS/iPadOS: use the Home Screen installation from Safari; there is no .apk for iOS.

The repository is private. Users need authorized GitHub access to download release installers.

## Details

Both Windows and macOS packages are **unsigned test builds**, not notarized or verified by OS app stores. Only install builds you trust. Release signing and a stable upgrade path should be configured before public distribution.

The shell needs internet access for authenticated Supabase finance records, and it uses a local Electron session independent of Safari/Chrome or Android. Sign in again inside the app; the shared household records will still be loaded from the same Supabase backend.

Electron's renderer uses sandboxing, context isolation, Node.js disabled, permission restrictions, and system-browser handling for external links. Some browser features (for example, external login return links and browser-initiated file downloads) might behave differently in the desktop shell; keep the web dashboard available as a fallback.

To build locally, run `cd desktop && npm install && npm start`; build on the corresponding OS with `npm run dist:win` or `npm run dist:mac`. GitHub Actions automatically creates both installers and publishes the `desktop-latest` prerelease.
