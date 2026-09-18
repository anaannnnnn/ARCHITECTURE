const db = require('../db/connection');

function create(data) {
  const stmt = db.prepare(`
    INSERT INTO resources
      (title, category, software, building_typology, description,
       drive_file_id, drive_download_url, file_format, license_note, uploaded_by_user_id)
    VALUES (@title, @category, @software, @building_typology, @description,
            @drive_file_id, @drive_download_url, @file_format, @license_note, @uploaded_by_user_id)
  `);
  const info = stmt.run({
    software: null,
    building_typology: null,
    description: null,
    license_note: null,
    uploaded_by_user_id: null,
    ...data,
  });
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
}

function search({ category, software, building_typology, q, limit = 30, offset = 0 }) {
  let query = 'SELECT * FROM resources WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (software) {
    query += ' AND software = ?';
    params.push(software);
  }
  if (building_typology) {
    query += ' AND building_typology = ?';
    params.push(building_typology);
  }
  if (q) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

function remove(id) {
  return db.prepare('DELETE FROM resources WHERE id = ?').run(id);
}

module.exports = { create, findById, search, remove };
