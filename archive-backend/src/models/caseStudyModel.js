const db = require('../db/connection');

function create(data) {
  const stmt = db.prepare(`
    INSERT INTO case_studies
      (title, architect, typology, location, climate_zone, year_built,
       structural_system, area_sqm, summary, source, source_ref, created_by_user_id)
    VALUES (@title, @architect, @typology, @location, @climate_zone, @year_built,
            @structural_system, @area_sqm, @summary, @source, @source_ref, @created_by_user_id)
  `);
  const info = stmt.run({
    architect: null,
    typology: null,
    location: null,
    climate_zone: null,
    year_built: null,
    structural_system: null,
    area_sqm: null,
    summary: null,
    source: 'student',
    source_ref: null,
    created_by_user_id: null,
    ...data,
  });
  return findById(info.lastInsertRowid);
}

function findById(id) {
  const caseStudy = db.prepare('SELECT * FROM case_studies WHERE id = ?').get(id);
  if (!caseStudy) return null;
  const media = db.prepare('SELECT * FROM case_study_media WHERE case_study_id = ?').all(id);
  return { ...caseStudy, media };
}

function search({ typology, architect, climate_zone, q, limit = 20, offset = 0 }) {
  let query = 'SELECT * FROM case_studies WHERE 1=1';
  const params = [];

  if (typology) {
    query += ' AND typology = ?';
    params.push(typology);
  }
  if (architect) {
    query += ' AND architect LIKE ?';
    params.push(`%${architect}%`);
  }
  if (climate_zone) {
    query += ' AND climate_zone = ?';
    params.push(climate_zone);
  }
  if (q) {
    query += ' AND (title LIKE ? OR summary LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

function addMedia(caseStudyId, { media_type, url, caption, license, source }) {
  const stmt = db.prepare(`
    INSERT INTO case_study_media (case_study_id, media_type, url, caption, license, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(caseStudyId, media_type, url, caption || null, license || null, source || null);
  return info.lastInsertRowid;
}

module.exports = { create, findById, search, addMedia };
