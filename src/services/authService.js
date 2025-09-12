// server/services/authService.js
const { pool, getPool } = require('../config/db');  // ĐẢM BẢO file này export pool/getPool
const db = (typeof getPool === 'function') ? getPool() : pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Tìm user theo username **hoặc** email.
 * Trả về null nếu không có.
 */
async function findUserByUsername(usernameOrEmail) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('DB pool not initialized (db.query is undefined)');
  }
  const sql = `
    SELECT
      id,
      username,
      email,
      password_hash AS passwordHash,   -- alias để đồng bộ với controller
      role,
      employee_code,
      company_id
    FROM employees
    WHERE username = ? OR email = ?
    LIMIT 1
  `;
  const [rows] = await db.query(sql, [usernameOrEmail, usernameOrEmail]);
  return rows && rows[0] ? rows[0] : null;
}

/** So khớp mật khẩu */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword || '');
};

/** Tạo access token (8h mặc định, có thể đổi bằng JWT_EXPIRES_IN) */
const generateTokens = (employee) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET');
  }
  const payload = {
    id: employee.id,
    role: employee.role,
    company_id: employee.company_id,
  };

  // console.log('>>> login payload:', payload); // bật khi cần debug

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return { accessToken };
};

module.exports = {
  findUserByUsername,
  comparePassword,
  generateTokens,
};
