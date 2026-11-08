/* GoalOS Google Drive sync (browser-only OAuth token; no token stored on disk). */
(function () {
  'use strict';
  const KEY = 'goalos.drive.settings.v1';
  const REMOTE_FILE = 'GoalOS_Live_Data.json';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } })();
  let fileId = saved.fileId || '';
  let lastSync = saved.lastSync || '';
  let enabled = Boolean(saved.enabled);
  let connected = false;
  let token = '';
  let tokenExpiresAt = 0;
  let syncTimer = null;
  let busy = false;
  let needsUpload = false;
  let api = null;
  let tokenClient = null;
  let status = 'Not connected';

  function saveSettings() {
    localStorage.setItem(KEY, JSON.stringify({fileId, lastSync, enabled}));
  }
  function notify(message) {
    if (api && api.toast) api.toast(message);
  }
  function repaint() { if (api && api.renderSettings) api.renderSettings(); }
  function signedIn() { return Boolean(connected && token && Date.now() < tokenExpiresAt - 30000); }
  function fileLink() { return fileId ? 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view' : ''; }
  async function request(url, options = {}) {
    if (!signedIn()) throw new Error('Google Drive session expired. Connect Google Drive again.');
    const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: 'Bearer ' + token } });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = raw; }
    if (!response.ok) {
      if (response.status === 401) connected = false;
      throw new Error((data && data.error && data.error.message) || ('Google Drive error ' + response.status));
    }
    return data;
  }
  async function findRemoteFile() {
    const query = "name = '" + REMOTE_FILE + "' and trashed = false";
    const url = API + '?q=' + encodeURIComponent(query) + '&fields=' + encodeURIComponent('files(id,name,modifiedTime),nextPageToken') + '&orderBy=modifiedTime%20desc&pageSize=30';
    const result = await request(url);
    const match = (result.files || [])[0];
    fileId = match ? match.id : '';
    saveSettings();
    return match || null;
  }
  async function uploadNow(silent = false) {
    if (!api || !api.getData || !api.getData()) throw new Error('Import or create your private workspace first.');
    if (!signedIn()) throw new Error('Connect Google Drive before uploading.');
    if (busy) { needsUpload = true; return; }
    busy = true;
    const payload = JSON.stringify(api.getData());
    try {
      if (new Blob([payload]).size > 4.8 * 1024 * 1024) throw new Error('Data is too large for this Drive upload. Use Export JSON instead.');
      if (!fileId) await findRemoteFile();
      let result;
      if (fileId) {
        try {
          result = await request(UPLOAD + '/' + encodeURIComponent(fileId) + '?uploadType=media&fields=id,name,modifiedTime', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: payload
          });
        } catch (error) {
          if (/not found|not exist|404/i.test(error.message)) {
            fileId = '';
            saveSettings();
          } else throw error;
        }
      }
      if (!fileId) {
        const boundary = 'goalos_' + Date.now();
        const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'
          + JSON.stringify({name: REMOTE_FILE, mimeType: 'application/json'})
          + '\r\n--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'
          + payload + '\r\n--' + boundary + '--';
        result = await request(UPLOAD + '?uploadType=multipart&fields=id,name,webViewLink', {
          method: 'POST', headers: {'Content-Type':'multipart/related; boundary=' + boundary}, body
        });
      }
      if (!result || !result.id) throw new Error('Drive did not confirm the upload.');
      fileId = result.id;
      lastSync = new Date().toISOString();
      enabled = true;
      status = 'Synced successfully';
      saveSettings();
      if (!silent) notify('Private data backed up to Google Drive.');
    } catch (e) {
      status = 'Sync failed: ' + e.message;
      if (!silent) notify(e.message);
      throw e;
    } finally {
      busy = false;
      repaint();
      if (needsUpload) {
        needsUpload = false;
        if (signedIn() && enabled) changed();
      }
    }
  }
  function changed() {
    if (!enabled || !signedIn() || !fileId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => uploadNow(true).catch(e => console.warn('GoalOS Drive sync:', e.message)), 3500);
  }
  function connect() {
    const clientId = String(window.GOALOS_GOOGLE_CLIENT_ID || '').trim();
    if (!clientId || /PASTE|YOUR_|\.\.\./i.test(clientId)) { notify('First add your OAuth Client ID in site-config.js. See SETUP_GOOGLE.md.'); return; }
    if (!window.google || !google.accounts || !google.accounts.oauth2) { notify('Google Sign-In is not available. Check your connection and browser popup settings.'); return; }
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: async response => {
          if (!response || response.error || !response.access_token) { notify('Google connection was not completed.'); return; }
          if (!(response.scope || '').split(' ').includes(SCOPE)) { notify('Google Drive file access was not granted.'); return; }
          token = response.access_token;
          tokenExpiresAt = Date.now() + Math.max(60, Number(response.expires_in) || 3600) * 1000;
          connected = true;
          status = 'Connected — select Back up now to start';
          try {
            // Discover the file if you have used GoalOS in another browser before.
            await findRemoteFile();
            notify('Google Drive connected. Choose Back up now or Restore from Drive.');
          } catch (e) { notify('Connected, but could not find existing backups: ' + e.message); }
          repaint();
        },
        error_callback: () => { notify('Google authorization popup was closed or blocked.'); }
      });
    }
    // Called synchronously from the user's button click (popup-safe).
    tokenClient.requestAccessToken({prompt: 'consent'});
  }
  async function restore() {
    if (!signedIn()) throw new Error('Connect Google Drive before restoring.');
    if (!fileId) await findRemoteFile();
    if (!fileId) throw new Error('No GoalOS_Live_Data.json file was found in this Google Drive account.');
    const incoming = await request(API + '/' + encodeURIComponent(fileId) + '?alt=media');
    if (!incoming || !Array.isArray(incoming.tasks) || !Array.isArray(incoming.transactions) || !Array.isArray(incoming.loans)) {
      throw new Error('This Drive file is not a valid GoalOS backup.');
    }
    if (!window.confirm('Replace ALL data in this browser with the Google Drive copy? Export your current JSON first if you want to keep it.')) return;
    if (api && api.restoreData) api.restoreData(incoming);
    status = 'Restored from Drive';
    repaint();
    notify('Your Google Drive data was restored.');
  }
  async function handle(action) {
    if (action === 'connect-drive') return connect();
    if (action === 'disconnect-drive') {
      clearTimeout(syncTimer);
      enabled = false; token = ''; connected = false; tokenExpiresAt = 0;
      status = 'Disconnected'; saveSettings(); repaint(); notify('Disconnected. Automatic syncing on this device is off.');
      return;
    }
    if (action === 'sync-drive') { try { await uploadNow(); } catch (_) {} return; }
    if (action === 'restore-drive') { try { await restore(); } catch (e) { notify(e.message); } }
  }
  function html() {
    const link = fileLink();
    const time = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
    const isConnected = signedIn();
    return `<div class="google-status"><span class="google-indicator ${isConnected?'online':'offline'}"></span><strong>${esc(isConnected ? 'Drive connected' : 'Drive disconnected')}</strong></div>
      <p class="field-help">${esc(status)}. Last successful cloud save: <strong>${esc(time)}</strong>.</p>
      <div class="settings-actions google-buttons">
        <button type="button" data-action="connect-drive" class="btn btn-primary">${esc(isConnected?'Reconnect Google Drive':'Connect Google Drive')}</button>
        <button type="button" data-action="sync-drive" class="btn btn-neutral" ${!isConnected?'disabled':''}>Back up now</button>
        <button type="button" data-action="restore-drive" class="btn btn-neutral" ${!isConnected?'disabled':''}>Restore from Drive</button>
        ${isConnected?'<button type="button" data-action="disconnect-drive" class="btn btn-neutral">Disconnect</button>':''}
      </div>
      ${link?`<p class="field-help"><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open my private Drive file ↗</a></p>`:''}
      <div class="notice private"><strong>How cloud backup works:</strong> After your first Back up now, edits sync to Drive automatically while this tab has an active Google connection. A separate daily Apps Script job creates a dated Drive snapshot and sends deadline emails, even when this tab is closed. If you edit after disconnecting, reconnect and back up to upload the changes.</div>`;
  }
  window.GoalOSDrive = {
    init(helpers) { api = helpers; }, html, handle, changed,
    getStatus() {return {connected: signedIn(), lastSync, fileId, enabled};}
  };
})();
