# Household Finance — GitHub + Cloudflare + Supabase account login

## Download Household Finance (Windows, Mac, Android, iOS)

**Dedicated download center:** https://finance.ajdapp.org/download

- Windows 10/11 x64: [Household-Finance-Windows-Setup.exe](https://github.com/Jhamal96/Finances/releases/download/desktop-latest/Household-Finance-Windows-Setup.exe)
- Mac (Apple Silicon and Intel): [Household-Finance-macOS.dmg](https://github.com/Jhamal96/Finances/releases/download/desktop-latest/Household-Finance-macOS.dmg)
- Android preview: [Household-Finance-Android.apk](https://github.com/Jhamal96/Finances/releases/download/android-preview/Household-Finance-Android.apk)
- iPhone/iPad: open https://finance.ajdapp.org/ in Safari, then Share → Add to Home Screen.
- Inside the finance website: **Settings → Download Household Finance → Download App**.

The Windows and Mac desktop shells open the live authenticated site, not a new budget or database. Apps share online records only after signing in with an authorized Finance account; browser and native app local storage remain separate. Desktop installers are unsigned test builds, and the Android APK is debug signed. Because this GitHub repository is private, release downloads require authorized repository access. Do not distribute private GitHub repository access or Supabase credentials publicly.

**Cloudflare deployment:** GitHub saves the source at `index.html` and the static asset copy at `public/index.html`; both contain the latest dashboard updates. Confirm that a GitHub change reaches the live `finances` Worker, since a push alone may not update its assets. A full `wrangler deploy` using this repository's complete `public/` directory publishes the page directly. The optional overlay files in `cloudflare/` record temporary updates made while the preceding asset set was retained; a full asset deployment replaces an overlay. Keep deploying to the existing `finances` Worker.


**Live custom domain:** `https://finance.ajdapp.org/` (also deployed to `https://finances.jhamal16.workers.dev/`)  
**Cloudflare Worker:** `finances`  
**Supabase project:** `vxpufrahrnwmtgltjstd`

## Install the Finance App (Chrome/Edge/iPhone/Android)

This version adds **⬇ Install** in the dashboard header, an **Install Finance App** button on the login page, and **Settings → Install Finance App** with a file-checking tool. The actual Chrome address-bar **Install** label is controlled by Chrome and **cannot be forced from website code**. We deliberately do not call `preventDefault()` on `beforeinstallprompt`, so we do not suppress Chrome's normal install promotions.

To verify production deployment, open all of these URLs and confirm none gives 404:

- `https://finances.jhamal16.workers.dev/`
- `https://finances.jhamal16.workers.dev/manifest.webmanifest`
- `https://finances.jhamal16.workers.dev/service-worker.js`
- `https://finances.jhamal16.workers.dev/icon-192.png`
- `https://finances.jhamal16.workers.dev/icon-512.png`

**Chrome / Edge on desktop:** open the website over HTTPS and use **Install** in the address bar, or browser menu → **Install page as app** (menu wording varies). Your in-app Install button can open the native prompt if the browser offers the `beforeinstallprompt` event. If the browser does not, it shows instructions.

**iPhone / iPad:** open in Safari → Share → **Add to Home Screen**. iOS does not support the JavaScript `beforeinstallprompt` flow.

**Android Chrome:** browser menu → **Install app** or **Add to Home screen**.

Note: A service worker being registered and notifications being allowed do not guarantee Chrome will display the toolbar Install chip. It may wait for engagement, skip it for already installed apps, or use a different installation UI. Installing the site does not replace account sync or JSON backups.

## What this version adds

- First screen: **Log In / Sign Up / Forgot Password / Forgot Username**.
- Users select a username **and** recovery email when creating an account. Sign in using either **email + password** or **username + password**. An email is mandatory for recovery.
- Forgot username: enter account email, receive a secure **email sign-in link**, and see the username in **Settings → Account & Security** after the link opens. The app does not disclose which emails exist.
- Forgot password: email reset link, then enter and confirm a new password.
- Settings: current account, change username, change password, email password reset, log out.
- Accounts have distinct cloud `household_user_data` rows, protected by Supabase RLS; existing local copies are keyed to the signed-in user's UUID. **One account ≠ another account's data.**
- Keeps Pay in 4, all other finance sections, JSON export/import, per-tab navigation, automatic month rollover, and app alerts.

**Passwords and secret keys are NOT stored in GitHub.** Supabase Authentication manages passwords, sessions, and emails. The browser must never receive the service-role key.

## MUST: Back up BEFORE changing your existing app

1. Open your **existing** dashboard, including the old `test.jhamal16.workers.dev` deployment if that is where your records are stored.
2. In Settings, use **Save All Pages (1 JSON)**. Store this finance backup privately, off GitHub.
3. Keep your existing deployed site and Supabase `household_data` row intact until you see ALL of your finance entries under the new account.
4. Back up any other browsers/devices that contain unsynced records.

**Changing from `test...` to `finances...` changes browser origins, so their local storage does not transfer automatically.** The login version does not read or edit the old public `household_data` `main` row.

## Step 1: Supabase database SQL

1. Supabase project dashboard → **SQL Editor** → New query.
2. Open `supabase/finance_auth_setup.sql`, paste it, and run it once.
3. This creates `finance_profiles`, `household_user_data`, signup trigger and security policies, and rate-limiting support for username login. It does not delete old records.
4. Under **Authentication → Providers → Email**, enable Email signups (and **Confirm email**, recommended).
5. Under **Authentication → URL Configuration** set **Site URL** to `https://finances.jhamal16.workers.dev/`, and add Redirect URLs for:
   - `https://finances.jhamal16.workers.dev/`
   - `https://finances.jhamal16.workers.dev/**`
   - In particular, allow the password recovery URL `https://finances.jhamal16.workers.dev/?auth=recovery` (the wildcard generally covers it).
6. Supabase default SMTP has email deliverability/rate limitations. For reliable confirmation/password recovery, configure your own SMTP under **Authentication → SMTP Settings**.

## Step 2: Deploy username-login Edge Function to Supabase

**Email login and signup work with SQL + website, but login with a *username* needs this additional secure server-side function.** The function accepts username/password, privately resolves the user's recovery email using an admin secret, then asks Supabase Auth to verify the password.

1. In Supabase project **Edge Functions**, create a function named **`finance-username-login`** and copy code from `supabase/functions/finance-username-login/index.ts`.
2. Set **Verify JWT** to **OFF** for this *public login* function (the code enforces its own origin restriction, credential verification, and SQL rate limits). The included `supabase/config.toml` sets `verify_jwt=false` for CLI-based deployment.
3. In Supabase Edge Function secrets, add **`FINANCE_SERVICE_ROLE_KEY`** with the project's private legacy **service_role** secret (or use `SUPABASE_SERVICE_ROLE_KEY`, which may be provided automatically). **NEVER put this secret in the website, `wrangler.toml`, GitHub, or ChatGPT.**
4. Deploy. Test username login on the site. Emails use Supabase Auth directly.

**Supabase CLI option** from the repository root (if already installed):

```sh
supabase login
supabase link --project-ref vxpufrahrnwmtgltjstd
supabase functions deploy finance-username-login --no-verify-jwt
```

Manage the private secret through Supabase project settings; do NOT commit a `.env` with secrets.

## Step 3: Publish on GitHub and Cloudflare

1. Upload/commit `public/`, `wrangler.toml`, README and (optionally) the Supabase SQL/function sources into your **private GitHub repository**.
2. Cloudflare → Workers & Pages → `finances` Worker → Settings → Builds → connect that GitHub repository's production `main` branch (or create the Worker from GitHub if it does not exist).
3. Repository root: `/`; Build command: leave blank; Deploy command: `npx wrangler deploy`.
4. Deploy and verify these URLs return files instead of 404:
   - `https://finances.jhamal16.workers.dev/`
   - `https://finances.jhamal16.workers.dev/service-worker.js`
   - `https://finances.jhamal16.workers.dev/manifest.webmanifest`
5. If an older PWA still loads, refresh once and close/reopen the installed app after deployment; the service-worker cache version was updated.

## Step 4: Create your account & restore your finances

1. Open `https://finances.jhamal16.workers.dev/` → **Sign Up**.
2. Choose a username, an email, and a password of 8+ characters. Confirm your email if prompted.
3. Sign in with email/password or username/password.
4. Open **Settings → All-in-One Finance Backup → Import JSON Backup**, then select your old backup. Existing records from your old site are not silently given to anyone.
5. Verify **His, Her, Combined, ESSO, Payment Plans, Pay in 4, Purchase Plan, Money Allocation**, and earlier months. Test a new entry; refresh and verify it persists; open a second tab or device under the **same account** and verify syncing.
6. Use **Settings → Account & Security** to change your username or password, or log out.

**If you are upgrading the same browser/hostname as the old app:** a button **Import Old Device Data (This Browser)** can appear in Settings when the old `household_finance_v12` local copy exists and the new account is empty. Import ONLY after confirming you're signed into the correct account. This preserves the old browser copy.

## Security notes & remaining limitations

- **The old `household_data` table may still be accessible to anonymous visitors** depending on its existing policies. This new login does not change its permissions. After safely migrating and confirming all data, protect/revoke old anonymous access (`REVOKE ALL ON public.household_data FROM anon, authenticated;`) in the Supabase SQL Editor **if you no longer need old clients**. Review existing policies/grants before using this statement.
- RLS prevents one logged-in account from reading or updating a different user's cloud data. Anyone with **physical access to an unlocked device** may be able to inspect retained local browser data or downloaded backups, so protect devices and backups.
- This version does **not** merge different users into a shared household. One login sees its own household finance dataset. Household invitations/sharing would require a separate permissions model.
- Different-device edits on the *same account* can still conflict because the app syncs an entire JSON document. The existing conflict warnings and backups remain important; this isn't a database transaction-level merge system.
- Closed-app notification reminders require a **separate Web Push sender**; the login screen alone does not add that.
- Supabase email flows and the username Edge Function cannot be fully tested until deployed into your real Supabase project.

## File map

- `public/index.html` — complete finance app, login and Settings.
- `public/service-worker.js`, `public/manifest.webmanifest`, icons — installable web app.
- `wrangler.toml` — Cloudflare Worker name `finances`, static assets in `public`.
- `supabase/finance_auth_setup.sql` — RLS and username profile database setup.
- `supabase/functions/finance-username-login/index.ts` — secure username-login endpoint.
- `supabase/config.toml` — disable JWT verification for login function only.
