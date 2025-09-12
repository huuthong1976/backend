const { sequelize, Employee } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function findUserByUsername(usernameOrEmail) {
  const identifier = String(usernameOrEmail || '').trim();
  if (!identifier) return null;
  return Employee.findOne({
    where: { [Op.or]: [{ username: identifier }, { email: identifier }] },
  });
}

const comparePassword = (password, hashed) =>
  bcrypt.compare(password || '', hashed || '');

function generateTokens(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  const companyId = user.companyId ?? user.company_id ?? null;
  const payload = { id: user.id, role: user.role, company_id: companyId };
  const accessToken = jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  return { accessToken, token: accessToken }; // giữ tương thích UI cũ
}

module.exports = { findUserByUsername, comparePassword, generateTokens };
