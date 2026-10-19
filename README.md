# Household Finance Dashboard — GitHub + Cloudflare Workers

Production URL: https://finances.jhamal16.workers.dev

## Before deploying

1. Open the previous finance site on the device that still shows your records.
2. Choose **Save All Pages (1 JSON)** and store that backup outside the repository.
3. Keep your existing site running until the new deployment and data import work.
4. **Keep personal financial exports out of GitHub.** Use a private repository; review Supabase Row Level Security and authentication separately. A publishable key is not a security boundary.

## Upload to GitHub

Use an existing **private** finance repository or create one. At its root, commit this exact structure:

```
wrangler.toml
public/
  index.html
  service-worker.js
  manifest.webmanifest
  icon-192.png
  icon-512.png
```

These files are included in this ZIP. If your repository already contains an `index.html` at the root, the Cloudflare config here uses **public/index.html**, not the root copy. Keep only the intended current version in `public/` to avoid confusion.

## Connect GitHub to Cloudflare Workers

### New Worker
1. Go to https://dash.cloudflare.com > **Workers & Pages** > **Create application** > **GitHub**.
2. Authorize your GitHub account and select your finance repository.
3. Select production branch `main` (or your actual default branch).
4. Worker name **finances** (must match `wrangler.toml`).
5. Set **Root directory** to repository root (`/` or leave blank).
6. **Build command**: none / leave blank (this is a plain HTML app).
7. **Deploy command**: `npx wrangler deploy`.
8. Save and deploy.

### Existing `finances` Worker
1. Open **Workers & Pages > finances > Settings > Builds > Connect**.
2. Connect the GitHub repository and set branch, commands, and root as above.
3. Push a commit to trigger the deployment.

## Test deployment

All of the following URLs must work without HTTP 404:
- https://finances.jhamal16.workers.dev/
- https://finances.jhamal16.workers.dev/index.html
- https://finances.jhamal16.workers.dev/service-worker.js
- https://finances.jhamal16.workers.dev/manifest.webmanifest
- https://finances.jhamal16.workers.dev/icon-192.png

On the installed finance app: **Check Alert Setup**, then **Test Alert**.
On iPhone: install the **new domain** as a Home Screen web app using Safari; old Home Screen installations still point to the old domain.

## Restore financial data

Import the saved **all-pages JSON** backup if cloud sync doesn't repopulate the records. Check every section before adding new transactions. GitHub is for **website code**, not for live user data. Browser storage is per-domain; cross-device records depend on your Supabase sync and its access rules. Do not upload export JSON, local storage dumps, or credentials to this repository.

## Reminder limitation

This package supports **Test Alert** and an installable service worker. Scheduled background notifications while the app is closed still require a separate server-side Web Push sender.
