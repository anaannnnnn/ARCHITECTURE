const db = require('../db/connection');

function create({ title, description, created_by_user_id }) {
  const stmt = db.prepare(`
    INSERT INTO studio_kits (title, description, created_by_user_id)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(title, description || null, created_by_user_id || null);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  const kit = db.prepare('SELECT * FROM studio_kits WHERE id = ?').get(id);
  if (!kit) return null;

  const resources = db
    .prepare(
      `SELECT r.* FROM resources r
       JOIN studio_kit_resources skr ON skr.resource_id = r.id
       WHERE skr.studio_kit_id = ?`
    )
    .all(id);

  const caseStudies = db
    .prepare(
      `SELECT cs.* FROM case_studies cs
       JOIN studio_kit_case_studies skcs ON skcs.case_study_id = cs.id
       WHERE skcs.studio_kit_id = ?`
    )
    .all(id);

  return { ...kit, resources, case_studies: caseStudies };
}

function list({ q, limit = 20, offset = 0 } = {}) {
  let query = 'SELECT * FROM studio_kits WHERE 1=1';
  const params = [];

  if (q) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

function addResource(studioKitId, resourceId) {
  db.prepare(
    'INSERT OR IGNORE INTO studio_kit_resources (studio_kit_id, resource_id) VALUES (?, ?)'
  ).run(studioKitId, resourceId);
}

function removeResource(studioKitId, resourceId) {
  db.prepare(
    'DELETE FROM studio_kit_resources WHERE studio_kit_id = ? AND resource_id = ?'
  ).run(studioKitId, resourceId);
}

function addCaseStudy(studioKitId, caseStudyId) {
  db.prepare(
    'INSERT OR IGNORE INTO studio_kit_case_studies (studio_kit_id, case_study_id) VALUES (?, ?)'
  ).run(studioKitId, caseStudyId);
}

function removeCaseStudy(studioKitId, caseStudyId) {
  db.prepare(
    'DELETE FROM studio_kit_case_studies WHERE studio_kit_id = ? AND case_study_id = ?'
  ).run(studioKitId, caseStudyId);
}

function remove(id) {
  return db.prepare('DELETE FROM studio_kits WHERE id = ?').run(id);
}

module.exports = {
  create,
  findById,
  list,
  addResource,
  removeResource,
  addCaseStudy,
  removeCaseStudy,
  remove,
};
