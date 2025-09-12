const { Op } = require('sequelize');
const { Employee } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function findUserByLogin(login) {
  const key = String(login || '').trim();
  if (!key) return null;

  // Lọc theo username/email, đang active và chưa bị xóa
  return Employee.findOne({
    where: {
      [Op.or]: [{ username: key }, { email: key }],
      isActive: true,
      deletedAt: null
    },
    attributes: ['id','username','email','fullName','role','companyId','passwordHash']
  });
}

const comparePassword = (plain, hash) =>
  bcrypt.compare(plain || '', hash || '');

function generateTokens(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');

  const payload = { id: user.id, role: user.role, company_id: user.companyId ?? null };
  const accessToken = jwt.sign(
    payload,
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  // Trả thêm 'token' cho UI cũ nếu đang đọc key này
  return { accessToken, token: accessToken };
}

module.exports = { findUserByLogin, comparePassword, generateTokens };
