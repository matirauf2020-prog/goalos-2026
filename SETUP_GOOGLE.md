# GoalOS 2026 — Google Drive daily backups + Gmail reminders

This is the **updated GitHub Pages version** of GoalOS. Your private Excel/GoalOS JSON is **not included** in the website ZIP. You do the GitHub part yourself.

## What the automation actually does

- **Local saving:** All your changes save immediately in your current browser.
- **Drive cloud sync:** After you sign in to Google Drive in GoalOS and click **Back up now** for the first time, GoalOS stores `GoalOS_Live_Data.json` in **your own private Google Drive**. While Google authorization remains active in the open browser, subsequent edits automatically sync to that file after ~3.5 seconds. **You must reconnect when access expires or you reopen the page.** The green indicator means authorized, not that every edit necessarily succeeded; check **Last successful cloud save**.
- **Daily snapshots:** The optional Google Apps Script copies the latest cloud file into a private **GoalOS Daily Backups** folder once per day. This runs when the GoalOS website is closed. It is a snapshot of the **last successfully uploaded** data — Google cannot read unsynced local browser changes.
- **Gmail reminders:** The same private script checks upcoming deadlines daily and sends ONE summary email if goals are at your selected reminder thresholds (default **7, 3, 1 and 0 days**). It skips Completed/Rejected goals, and does not resend the same threshold for the same goal and due date. The sender is the Google account that authorized the script, and the recipient is the address you enter in the private script.
- **No public data:** GitHub hosts website *code only*. Your private backup, financial data, and reminder destination stay in your Google account.

> **Important:** GitHub Pages alone does not run background jobs. Daily emails and Drive copies depend on enabling the Google Apps Script time-driven trigger. Also, Drive connection in a browser is not a permanent sign-in — OAuth access tokens expire, and you will be asked to reconnect. Automatic Drive upload on edits cannot run when the website is closed.

## Part 1 — Publish/update the website on GitHub

1. Unzip `GoalOS_2026_Google_Drive_Gmail_Upgrade.zip`.
2. Upload the **contents** of the ZIP (including `index.html`, `app.js`, `drive-sync.js`, `site-config.js`, `styles.css`, and all support files) into the root of the **same** GitHub Pages repository you already use. Replace the older app files. Do not upload your Excel or personal JSON.
3. In repository **Settings → Pages**, choose **Deploy from a branch → `main` → `/(root)`**. The public URL should resemble `https://YOUR-USERNAME.github.io/goalos-2026/`.
4. In your website, go to **Settings & backup → Import JSON** and choose the personal JSON file from your earlier Excel conversion. Do this locally, *not* via the GitHub upload screen.

## Part 2 — Google Drive connection (once per browser session, and when tokens expire)

1. Open [Google Cloud Console](https://console.cloud.google.com/) with the Google account you want to use for backup.
2. Create/select a project (example: `GoalOS Personal`). Enable **Google Drive API** under **APIs & Services → Library**.
3. Set up **Google Auth Platform → Branding/Audience** (may appear as OAuth consent screen). Choose an **External** app if using a normal personal Gmail account. If the project is in **Testing**, add **your Gmail address** as a test user. Testing consent may expire after seven days; you may need to re-authorize. For longer-lived use, review Google's production/publishing and verification requirements.
4. Under **Clients**, create **OAuth client ID → Web application**.
5. In **Authorized JavaScript origins**, add **only the origin**, without the repository path, e.g. `https://YOUR-USERNAME.github.io` (not `https://YOUR-USERNAME.github.io/goalos-2026/`). For localhost testing, optionally add `http://localhost:8000`. Do not paste the GitHub origin into Authorized redirect URIs — this integration uses the Google Identity Services token popup flow.
6. Copy the OAuth **Client ID** (ends with `.apps.googleusercontent.com`). Edit the website file `site-config.js` and replace `PASTE_YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID_HERE` with the Client ID, keeping single quotation marks. This ID is a public identifier, **not** a client secret. Never add a client secret or access token to GitHub.
7. Upload the edited `site-config.js` to the same GitHub repo and wait for Pages to serve the change. Open the site, go to **Settings & backup → Connect Google Drive**, select your Google account, and approve access to files created by GoalOS. Browser popups must be allowed. Google may show a testing/unverified-app screen for your private app.
8. Click **Back up now**. GoalOS should show **Last successful cloud save** and **Open my private Drive file**. Check the actual private file in your Drive account. Now edits made while authorized and online sync automatically.
9. To restore your Drive copy to this browser, click **Restore from Drive** and confirm. **WARNING:** Restoring replaces all your browser workspace data; export a manual JSON backup first.

**Important for multiple devices:** This is not a multi-user realtime database. An already-loaded browser will not automatically pull remote changes; use Restore from Drive, and avoid overwriting newer changes from another device.

## Part 3 — Gmail reminders and 24-hour daily snapshots

1. Visit [Google Apps Script](https://script.google.com/home/projects/create) **signed in to the same Google account used for Drive**.
2. Create a new standalone script project (example: `GoalOS Daily Automation`).
3. Open the ZIP file `google-apps-script/Code.gs`, copy **all its contents**, and paste them into the Apps Script editor, replacing the default starter code.
4. At the top, replace `YOUR_EMAIL@gmail.com` with the email address where you want your alerts. You can also change `TIMEZONE: 'Asia/Karachi'` to your timezone. Optionally add your GitHub Pages URL to `APP_URL` so emails link to GoalOS. **Do not upload this customized email address to a public GitHub repo** — edit it privately in Apps Script only.
5. **Save** the script project.
6. In the Apps Script editor's **Run** function dropdown, choose `installDailyTrigger`, click **Run**, and approve the permissions requested for your own Drive, sending email, and managing triggers. It creates one **daily** trigger. Re-running this setup function replaces the old daily trigger, preventing duplicate daily jobs.
7. Choose `sendTestEmail` and click **Run**. Confirm a test email arrived (check Spam too).
8. Go back to GoalOS, confirm **Back up now** has uploaded `GoalOS_Live_Data.json`, and open **Settings & backup → Gmail deadline reminders**. Set reminder days (e.g. `7,3,1,0`) and click **Save reminder preferences**. Ensure those changes have synced successfully to Drive.
9. Optional test: in Apps Script choose `runGoalOSDaily` and run it manually. It will create today's snapshot and send reminders **only if goals currently match your selected deadlines**. Otherwise it will log “No new deadline emails are due today”. The real scheduled job runs every day automatically.
10. Inspect **Google Apps Script → Triggers** to verify that `runGoalOSDaily` has a time-driven trigger. In **Executions** you can inspect failures. The daily job usually fires within the selected hour; it is **not guaranteed to run at an exact minute or exactly 24 hours after the prior run**.

## Privacy, reliability & limitations

- GitHub can serve the public website with free Pages hosting, but it **must not contain** `GoalOS_Live_Data.json`, any `GoalOS_Backup_*.json` files, your original Excel file, or other sensitive personal data. `site-config.js` holds an OAuth **client ID only**.
- **Google Drive browser access is restricted to files created/opened by this app** (`drive.file`), while the private Apps Script requires Drive read/write permission to find and copy your cloud backup. The private script also asks for permission to send emails from your Google account. Only authorize code you have reviewed.
- OAuth connections have token expiry, Google Cloud publishing and consent rules, and Google Apps Script quotas. A saved backup is not guaranteed unless GoalOS confirms a successful cloud save and the file is visible in Drive.
- Daily snapshots are created even if your web app is closed, but only **of the most recent data previously uploaded to Drive**.
- Gmail reminders are emailed only for goals with a valid `YYYY-MM-DD` due date that are not Completed or Rejected; a reminder is sent at each matching threshold **once** per goal/due date/threshold, as long as the script's saved properties have not been deleted.
- The script does not send messages to anyone other than the private recipient you entered. It does not send financial account details in email.
- If Drive/Gmail authorization is revoked, quotas are reached, or the Apps Script trigger stops, backups or reminders will stop. Check execution history occasionally.
- The app can still be used completely offline in local-only mode with manual JSON backups.

## Common problems

| Problem | Fix |
| --- | --- |
| Connect says “add OAuth Client ID” | Edit and upload `site-config.js` first. |
| `origin_mismatch` / `redirect_uri_mismatch` | Put **`https://USERNAME.github.io`** in Authorized **JavaScript origins**; don't include a path. Check GitHub Pages URL and client ID. |
| Google popup is blocked | Allow popups, use Chrome/Edge with a normal browser profile, and try again. |
| OAuth app is in Testing | Add yourself as a test user and expect re-authorization; review production/verification options. |
| Drive save shows connection expired | Click **Connect Google Drive** again, then **Back up now**. |
| No reminders arriving | Run `sendTestEmail`, then check the script **Triggers**, **Executions**, recipient email, data Drive file, and reminder thresholds. |
| Can't restore | Reconnect Google Drive, choose the correct Google account, then **Restore from Drive**. |
| Opened `index.html` locally but Google connect fails | Publish to GitHub Pages HTTPS and use the configured origin, or test with an allowed `localhost` origin. |

Google official docs: [Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Google Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Apps Script triggers](https://developers.google.com/apps-script/guides/triggers/installable), [Apps Script MailApp](https://developers.google.com/apps-script/reference/mail/mail-app).
