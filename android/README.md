# Household Finance Android App (APK)

A small Android WebView wrapper for the live, login-protected Household Finance Dashboard:
https://finances.jhamal16.workers.dev/

## Download the Android APK

1. Open [GitHub Actions](../../actions/workflows/android-apk.yml).
2. Open the newest **successful** "Build Household Finance Android APK" run.
3. Under **Artifacts**, select `Household-Finance-Android-APK`. Download and extract the ZIP to find `Household-Finance-Android.apk`.
4. Alternatively check [GitHub Releases](../../releases/tag/android-preview) for a persistent preview APK.
5. On Android, open the APK and permit installation from your file manager if prompted. Only install builds from this repository.

This is a *debug-preview APK*, not a Play Store release. Each GitHub Actions build signs with a temporary debug key, so installing a new build over an older debug APK may require uninstalling the previous one. For a stable release, configure private production signing credentials in GitHub secrets.

## Features and limitations

- Loads the existing Cloudflare finance website over HTTPS: site updates appear without rebuilding the APK.
- Supports Supabase login and local WebView storage, native Back navigation, and selecting files to import.
- **WebView and Chrome use separate sign-in sessions**; sign in inside the APK once.
- JSON/CSV downloads made with browser `blob:` URLs are **not supported by this preview WebView**. For full backups, open the website in Android Chrome or the installable Chrome PWA.
- Browser/PWA notifications do not automatically become native Android background notifications inside the WebView.
- Network connection required for login and cross-account cloud syncing.
- Finance data remains in Supabase; the APK embeds **no private service-role keys**.

## Build locally

Install Android SDK API 35, Build Tools 35.0.0, JDK 17 and Gradle 8.9.

Run from repository root:
```bash
gradle --no-daemon -p android :app:assembleDebug
```

APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

Build tooling: Android Gradle Plugin 8.7.3, Gradle 8.9, Java 17.

## Note on privacy

The current Finance website allows every registered and email-verified account to edit one shared household dataset. Register accounts only for trusted household members.
