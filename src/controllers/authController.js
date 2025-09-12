// src/controllers/authController.js
const db = require('../models');
const authService = require('../services/authService');
const bcrypt = require('bcryptjs'); // fallback nếu service chưa export compare

// Helper: tìm user theo username/email, ưu tiên dùng service
async function findUser(login) {
  if (typeof authService.findUserByLogin === 'function') {
    return authService.findUserByLogin(login);
  }
  if (typeof authService.findUserByUsername === 'function') {
    return authService.findUserByUsername(login);
  }
  // Fallback cuối (không nên cần tới nếu service chuẩn):
  return db.Employee.findOne({
    where: db.sequelize.where(
      db.sequelize.fn('LOWER', db.sequelize.col('username')),
      String(login || '').toLowerCase()
    ),
  });
}

// Helper: so khớp password, ưu tiên service
async function comparePassword(plain, hash) {
  if (typeof authService.comparePassword === 'function') {
    return authService.comparePassword(plain, hash);
  }
  return bcrypt.compare(plain || '', hash || '');
}

// Helper: tạo token, ưu tiên service
function makeTokens(user) {
  if (typeof authService.generateTokens === 'function') {
    // Nhiều UI cũ đọc key "token", service của bạn nên trả cả { accessToken, token }
    return authService.generateTokens(user);
  }
  // Fallback an toàn nếu thiếu (yêu cầu JWT_SECRET – nên dùng service chuẩn)
  throw new Error('generateTokens is not available from authService');
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
    }

    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    // Hỗ trợ cả alias camelCase và snake_case
    const hashed = user.passwordHash ?? user.password_hash ?? '';
    const ok = await comparePassword(password, hashed);
    if (!ok) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const { accessToken, token } = makeTokens(user);

    // (tùy chọn) cập nhật thống kê đăng nhập
    // await user.update({ lastLogin: new Date(), loginCount: (user.loginCount || 0) + 1 });

    return res.status(200).json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        fullName: user.fullName ?? user.full_name ?? user.username,
        role: user.role,
        company_id: user.companyId ?? user.company_id ?? null,
      },
      accessToken,
      token: token || accessToken, // giữ tương thích UI cũ
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/auth/me
exports.getMe = (req, res) => {
  const { id, role } = req.user || {};
  const company_id = req.user?.company_id ?? req.user?.companyId ?? null;
  return res.status(200).json({ id, role, company_id });
};

// GET /api/auth/current-user
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Token mới dùng id; token cũ có thể là employee_id
    const empId = req.user?.id ?? req.user?.employee_id;
    if (!empId) return res.status(400).json({ error: 'Thiếu id trong token.' });

    const profile = await db.Employee.findByPk(empId);
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });

    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
};
