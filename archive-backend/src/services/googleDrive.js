/**
 * Google Drive is used purely as FILE STORAGE for downloadable resources
 * (CAD blocks, Revit families, textures, portfolio templates, etc).
 * Structured/searchable data (titles, tags, category, software) lives in SQLite —
 * this module just uploads/reads/links files and hands back an ID + URL to store there.
 */
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

let driveClient = null;

/**
 * Two ways to supply the service account credentials, so the same code works
 * locally and on a host like Render where you can't upload a file:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON — the full JSON key content, pasted as an
 *      env var (this is what you'll use on Render — see README's deploy section).
 *   2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH — a local file path to the downloaded
 *      key (used for local development; the file is git-ignored).
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON.');
    }
  } else {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath || !fs.existsSync(keyPath)) {
      throw new Error(
        'No Google service account credentials found. Set either GOOGLE_SERVICE_ACCOUNT_JSON ' +
        '(paste the key JSON directly — used on Render) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH ' +
        '(local file path — used for local dev). See .env.example.'
      );
    }
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Upload a local file (already saved to disk by multer) to the shared Drive folder.
 * Returns { fileId, downloadUrl }.
 */
async function uploadResourceFile(localFilePath, fileName, mimeType) {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: rootFolderId ? [rootFolderId] : undefined,
    },
    media: {
      mimeType,
      body: fs.createReadStream(localFilePath),
    },
    fields: 'id, webViewLink, webContentLink',
  });

  // Make it readable via link (anyone with the link can view/download).
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const file = await drive.files.get({
    fileId: res.data.id,
    fields: 'id, webViewLink, webContentLink',
  });

  return {
    fileId: file.data.id,
    downloadUrl: file.data.webContentLink || file.data.webViewLink,
  };
}

async function deleteResourceFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

async function listFolderContents(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webContentLink)',
  });
  return res.data.files;
}

module.exports = { uploadResourceFile, deleteResourceFile, listFolderContents };
