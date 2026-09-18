const jwt = require('jsonwebtoken');
const { z } = require('zod');
const userModel = require('../models/userModel');
require('dotenv').config();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = userModel.findByEmail(parsed.data.email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const user = userModel.create(parsed.data);
  const token = signToken(user);
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = userModel.findByEmail(parsed.data.email);
  if (!user || !userModel.verifyPassword(user, parsed.data.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, token });
}

module.exports = { register, login };
