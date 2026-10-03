const bcrypt = require('bcryptjs');
const db = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, username, email, full_name, phone, role, is_active, is_online, last_login, created_at FROM users WHERE 1=1';
    const params = [];
    let idx = 1;
    if (role) { query += ` AND role = $${idx++}`; params.push(role); }
    if (search) { query += ` AND (username ILIKE $${idx} OR full_name ILIKE $${idx} OR email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getOnline = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, role, last_login FROM users WHERE is_online = TRUE ORDER BY last_login DESC'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, full_name, phone, role, is_active, created_at`,
      [username, email, hash, full_name, phone, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Username or email already exists' });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, phone, role } = req.body;
    const result = await db.query(
      `UPDATE users SET username=$1, email=$2, full_name=$3, phone=$4, role=$5
       WHERE id=$6 RETURNING id, username, email, full_name, phone, role`,
      [username, email, full_name, phone, role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.toggleLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, username, is_active',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.assignRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const result = await db.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, role',
      [role, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};