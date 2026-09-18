const fs = require('fs');
const resourceModel = require('../models/resourceModel');
const googleDrive = require('../services/googleDrive');

function list(req, res) {
  const { category, software, building_typology, q, limit, offset } = req.query;
  const results = resourceModel.search({
    category,
    software,
    building_typology,
    q,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ results });
}

function getOne(req, res) {
  const resource = resourceModel.findById(Number(req.params.id));
  if (!resource) return res.status(404).json({ error: 'Not found' });
  res.json(resource);
}

/**
 * Expects multipart/form-data with a `file` field (handled by multer in the route)
 * plus title/category/software/etc in the body. Uploads the file to Google Drive,
 * then stores the resulting file ID + link as a resource row in SQLite.
 */
async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'file is required' });

  const { title, category, software, building_typology, description, file_format, license_note } = req.body;
  if (!title || !category) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'title and category are required' });
  }

  try {
    const { fileId, downloadUrl } = await googleDrive.uploadResourceFile(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    const resource = resourceModel.create({
      title,
      category,
      software,
      building_typology,
      description,
      drive_file_id: fileId,
      drive_download_url: downloadUrl,
      file_format,
      license_note,
      uploaded_by_user_id: req.user?.id || null,
    });

    res.status(201).json(resource);
  } finally {
    fs.unlink(req.file.path, () => {}); // clean up local temp file either way
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  const resource = resourceModel.findById(id);
  if (!resource) return res.status(404).json({ error: 'Not found' });

  if (resource.drive_file_id) {
    try {
      await googleDrive.deleteResourceFile(resource.drive_file_id);
    } catch (err) {
      console.warn('Drive file deletion failed (continuing to remove DB row):', err.message);
    }
  }

  resourceModel.remove(id);
  res.status(204).send();
}

module.exports = { list, getOne, upload, remove };
