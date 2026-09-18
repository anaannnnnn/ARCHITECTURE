const db = require('../db/connection');
const bcrypt = require('bcryptjs');

function create({ name, email, password, role = 'student' }) {
  const password_hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(name, email, password_hash, role);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
}

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

module.exports = { create, findById, findByEmail, verifyPassword };
