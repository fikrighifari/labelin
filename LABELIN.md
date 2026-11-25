# Labelin

A lightweight Indonesian-language, local-first address book and shipping label workspace built with React, TypeScript, and Vite.

## Use the workspace

New guest and personal workspaces start with no addresses, sender profiles, or print history. Existing personal data is preserved. On upgrade, only unchanged sample records are removed from the old guest workspace. Open the account menu at the bottom of the sidebar to register or sign in.

- **Buku alamat:** create, search, categorize, edit, and delete contacts. Select **Buat label** to prefill a recipient.
- **Profil pengirim:** save multiple sender addresses and select a default.
- **Editor label:** edit sender and recipient details, preview the label, save recipients, add a delivery note, change media, and choose up to 20 copies. Drafts are saved locally and can be resumed from the dashboard.
- **Preferensi printer:** use the inline paper controls for thermal, A4, A5, A6, A7, US Letter, US Legal, and additional thermal templates, including 2 × 3 in, 4 × 8 in and 58 × 100 mm. The template, dimensions, and display unit are retained in preferences, drafts, and print history.
- **Riwayat cetak:** search, inspect, delete, or reprint saved snapshots. A cancelled print dialog is not recorded unless the user explicitly confirms printing.

## Print settings

Set the default paper size directly on the dashboard, or change an individual label using the controls above its live preview. Choose a template or type the width and height; valid edits update the preview immediately. Switching mm/in preserves physical size (1 inch = 25.4 mm). After **Cetak label**, choose **Pilih printer & cetak** and select an installed printer under **Destination / Tujuan** in the native print dialog. If the printer driver does not offer the custom size, register the same dimensions in the driver's paper settings.

The visible **ID / English** buttons in the workspace and editor headers switch the interface and label headings without changing any address data or losing a draft. The chosen language is remembered on this device.

Choose the matching media in the printer driver, set scale to **100% / actual size**, and disable browser headers and footers. Thermal output is a full **100 × 150 mm** page. A4 output uses a **100 × 150 mm** cut-out label positioned **10 mm** from the top-left of a **210 × 297 mm** sheet. Each copy occupies a separate page. The printed reference is a personal label ID, not a carrier tracking number. Each address shows its location title before the street. Preview zoom goes up to 300% without changing print dimensions.

## Accounts and storage

Email registration and login use the same-origin `/api/account` Vercel function and a shared PostgreSQL database. Passwords are verified server-side with salted scrypt hashes. Each browser gets a separate revocable, 30-day HttpOnly session cookie (Secure in production); the database stores only its hash. A stored browser profile alone cannot read or write cloud records.

Sign in with the same account and sign-in method on another device to restore addresses, sender profiles, print history, printer preferences and the last saved label draft. The application keeps a local working copy for offline use, sends edits after a short debounce, and pulls remote updates on focus, reconnect and while the workspace is visible. “Synced online” indicates a successful server round trip; pending edits are not reported as synced. Revision checks and a three-way, record-by-record merge preserve independent changes and deletions. If the same record is changed on two devices, the later successfully synced edit takes precedence. Guest data is never uploaded. Clearing browser storage does not delete a successfully synced account.

**Existing device-only accounts:** sign in once on the browser where the account was originally registered. A successful check of its existing password allows migration into a new cloud account; an existing cloud account is never overwritten. After migration, use the same credentials on other devices. Legacy data is preserved locally. Starting from a different device cannot recover data that was never uploaded.

**Owner setup / account service recovery:** the last production check returned HTTP 503, and PostgreSQL rejected the bundled bootstrap credentials. Check the existing database in the provider console (including whether the temporary instance was claimed or suspended). Restore access to that database; set its current pooled connection string as the server-only `DATABASE_URL` in Vercel’s Production environment, and in Preview if applicable, then redeploy. The database user needs access to the `labelin_*` tables and permission to initialize the schema. A replacement empty database will not restore existing accounts. Do not publish credentials or the private owner handoff in `CLOUD-SETUP.local.md`. Confirm `/api/account` returns HTTP 200 with JSON before testing signup and login in a fresh browser.

**Proxy origins / cookies:** serve the API and UI on the same public origin. The API recognizes same-origin browser requests even if a trusted proxy changes the upstream Host. If the proxy strips browser metadata, preserve the bootstrap cookie and CSRF header, or set `LABELIN_ALLOWED_ORIGINS` to the exact trusted HTTPS UI origin(s), separated by commas, and redeploy. Do not add wildcards or arbitrary embedding-site origins. If partitioned cookies are blocked in a preview, open the app in its own tab and allow site cookies. For local development place server settings in `.env.local` and restart Vite. For a deployed site use the host’s server environment settings, not a client-side variable.

### Google Sign-In

Create a Google OAuth **Web application** client and add the application's exact origin to its Authorized JavaScript origins. Set **VITE_GOOGLE_CLIENT_ID** in the deployment environment and rebuild. Alternatively, use the configuration panel exposed by **Lanjutkan dengan Google** when no client ID is configured. Only a public client ID is needed; never put a client secret in Vite environment variables.

The server independently validates the Google token's audience against `GOOGLE_CLIENT_ID` (or `VITE_GOOGLE_CLIENT_ID` in the server environment) and requires a verified Google email before issuing an application session. The browser's client-ID setting does not grant server trust. Configure the same approved client ID on the server; email accounts work independently of Google configuration. OAuth access tokens are not persisted.

## Production build

```sh
npm install
npm run lint
npm run build
```

Deploy the full project to Vercel, including `api/` and `server/`, not just `dist/`. The frontend remains the existing Vite application; the two API functions require PostgreSQL. Keep the production deployment publicly accessible and share its stable production address across devices. Vite development middleware uses the same API handlers. Fonts and artwork remain local.
