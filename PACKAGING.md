# ERP Nexus — Desktop (EXE) & Phone (APK) packaging

The web app, the desktop app and the phone app are **one system**. The desktop
and phone builds are thin, secure shells around the **live web system**
(`https://procurement-erp-6e271.web.app`), so all three always run the exact
same app, the same login, the same roles and the same live Firebase data —
nothing to keep in sync by hand.

```
                 ┌──────────────────────────────┐
   Web  ───────▶ │  procurement-erp-6e271.web.app │ ◀─────── Desktop (Electron)
                 │   (Next.js + Firebase, live)   │ ◀─────── Phone   (Capacitor)
                 └──────────────────────────────┘
```

## How to get the installers

The installers are built by GitHub Actions (they can't be compiled on Linux CI
for other OSes locally). From the repo:

1. **Actions** tab → **Build desktop app (EXE / DMG / AppImage)** → **Run workflow**.
   When it finishes, open the run and download from **Artifacts**:
   - `erp-nexus-desktop-windows-latest` → the **`.exe`** installer (Windows)
   - `erp-nexus-desktop-macos-latest` → the `.dmg` (macOS)
   - `erp-nexus-desktop-ubuntu-latest` → the `.AppImage` (Linux)
2. **Actions** tab → **Build Android app (APK)** → **Run workflow**.
   Download the **`erp-nexus-apk`** artifact → the **`app-debug.apk`**, then
   sideload it onto an Android phone (enable "install unknown apps").

## Local dev

- Desktop: `cd desktop && npm install && npm start` (opens the live app in a window).
- Point either shell at a different URL with the `ERP_NEXUS_URL` env var (desktop)
  or `server.url` in `mobile/capacitor.config.json` (phone).

## Layout

| Path | What it is |
|------|------------|
| `desktop/main.js` | Electron shell (secure: contextIsolation + sandbox, external links open in the browser) |
| `desktop/package.json` | electron + electron-builder config (win `.exe`, mac `.dmg`, linux `.AppImage`) |
| `mobile/capacitor.config.json` | Capacitor config — loads the live site via `server.url` |
| `mobile/www/index.html` | offline fallback screen (shown only if the live app can't be reached) |
| `.github/workflows/desktop-build.yml` | builds the desktop installers |
| `.github/workflows/android-build.yml` | builds the APK |

## Good to know / future steps

- **Firebase auth** works from the desktop and phone because they load the real
  hosting origin, which is already an authorized Firebase domain.
- The **APK is a debug build** (unsigned) — perfect for internal sideloading. For
  the Google Play Store, add a signing key and switch to a release build.
- The desktop `.exe` is **unsigned**; Windows SmartScreen may warn on first run
  (choose "More info → Run anyway"). Add code-signing later to remove the warning.
- Want the apps to work **fully offline** (bundle the UI instead of loading it
  live)? That's a follow-up: build `next` (`NEXT_EXPORT=true npm run build`),
  copy `next/out` into the shell, and drop `server.url`.
