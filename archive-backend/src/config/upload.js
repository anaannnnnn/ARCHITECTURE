const multer = require('multer');
const path = require('path');
const os = require('os');

// Files land in a temp dir briefly, get pushed to Google Drive, then deleted.
const upload = multer({
  dest: path.join(os.tmpdir(), 'archive-uploads'),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB — CAD/Revit files can be large
});

module.exports = upload;
