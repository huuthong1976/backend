const { sequelize, Employee } = require('../models'); // lấy ORM từ models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function findUserByUsername(usernameOrEmail) {
  // Cách ORM (khuyến nghị)
  const user = await Employee.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('username')),
      usernameOrEmail.toLowerCase()
    ),
  });

  // Nếu muốn hỗ trợ email nữa:
  if (!user) {
    return await Employee.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        usernameOrEmail.toLowerCase()
      ),
    });
  }
  return user;
  // (Hoặc raw: const [rows] = await sequelize.query('SELECT ...'); return rows[0] || null)
}

const comparePassword = (password, hashed) =>
  bcrypt.compare(password || '', hashed || '');

function generateTokens(user) {
  if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET');
  const payload = { id: user.id, role: user.role, company_id: user.companyId };
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return { accessToken };
}

module.exports = { findUserByUsername, comparePassword, generateTokens };
