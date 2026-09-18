const db = require('../db/connection');

function create({ user_id, name }) {
  const stmt = db.prepare('INSERT INTO collections (user_id, name) VALUES (?, ?)');
  const info = stmt.run(user_id, name);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) return null;
  return { ...collection, items: getItems(id) };
}

function listForUser(userId) {
  const collections = db.prepare('SELECT * FROM collections WHERE user_id = ?').all(userId);
  return collections.map((c) => ({ ...c, items: getItems(c.id) }));
}

/**
 * Items reference either a case_study or a resource by item_type + item_id.
 * This resolves each item to its actual row so the API returns full objects,
 * not just bare IDs.
 */
function getItems(collectionId) {
  const rows = db
    .prepare('SELECT * FROM collection_items WHERE collection_id = ? ORDER BY added_at DESC')
    .all(collectionId);

  return rows.map((row) => {
    if (row.item_type === 'case_study') {
      const item = db.prepare('SELECT * FROM case_studies WHERE id = ?').get(row.item_id);
      return { ...row, item };
    }
    if (row.item_type === 'resource') {
      const item = db.prepare('SELECT * FROM resources WHERE id = ?').get(row.item_id);
      return { ...row, item };
    }
    return row;
  });
}

function addItem(collectionId, { item_type, item_id }) {
  const stmt = db.prepare(
    'INSERT INTO collection_items (collection_id, item_type, item_id) VALUES (?, ?, ?)'
  );
  const info = stmt.run(collectionId, item_type, item_id);
  return info.lastInsertRowid;
}

function removeItem(collectionId, itemId) {
  db.prepare('DELETE FROM collection_items WHERE collection_id = ? AND id = ?').run(
    collectionId,
    itemId
  );
}

function remove(id) {
  return db.prepare('DELETE FROM collections WHERE id = ?').run(id);
}

function belongsToUser(collectionId, userId) {
  const row = db
    .prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?')
    .get(collectionId, userId);
  return !!row;
}

module.exports = { create, findById, listForUser, addItem, removeItem, remove, belongsToUser };
