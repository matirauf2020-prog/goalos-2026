# GoalOS 2026 — Google Drive & Gmail Edition

A responsive GitHub Pages personal finances/goals app with browser-local storage, optional private Google Drive sync, daily Drive snapshots and Gmail goal deadline reminders through your private Google Apps Script.

**Start here: [SETUP_GOOGLE.md](SETUP_GOOGLE.md)** (or `START_HERE.txt`).

## Files

- `index.html`, `styles.css`, `app.js` — main GoalOS app.
- `drive-sync.js` — optional Google Identity Services + Google Drive REST API integration (Drive `drive.file` scope).
- `site-config.js` — **paste your public OAuth Web Client ID only**. Do not put secrets in it.
- `google-apps-script/Code.gs` — copy into your **private** Apps Script project; set the reminder email there and run the daily trigger setup.
- `SETUP_GOOGLE.md` — complete configuration instructions for GitHub Pages, OAuth/Google Drive, and Gmail reminders.
- `icon.svg`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `.gitignore` — PWA assets and GitHub Pages support.

## Security model

**No user workbook or GoalOS JSON is included in the public website ZIP.** Data is imported in the browser, saved locally, and optionally copied via user's temporary OAuth access token to their own Google Drive. Tokens are kept in browser memory, not localStorage. The separate private Apps Script is independently authorized to read this cloud file, create daily snapshots and send email. Daily automation works while GoalOS is closed, but only on the **latest successfully synced cloud data**.

## Reminder settings

In Settings & backup, choose your days-before-deadline list (default `7,3,1,0`), and enable/disable automatic emails. After changes, confirm the Drive file is synced so the daily script reads updated settings. Completed/Rejected tasks are excluded. See the guide for testing with Apps Script.

## Limitations

A static GitHub Pages site cannot refresh expired Google OAuth sessions while closed and cannot make uploads from browser localStorage when closed. The independent time-driven Apps Script, once configured, handles daily cloud snapshots and email reminders. Google account authorization, API quotas, consent-screen restrictions and your own cloud setup still apply.
