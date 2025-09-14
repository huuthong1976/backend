// server/controllers/authController.js
const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const signJwt = (user) => {
  const payload = { id: user.id, role: user.role, company_id: user.company_id };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });

    // Nếu dùng paranoid và muốn bỏ qua user đã xóa mềm, giữ nguyên.
    // Nếu cần đăng nhập cả user bị soft-delete: thêm { paranoid: false }
    const user = await db.Employee.findOne({
      where: { username },
      // Không cần attributes hotfix nếu model đã tắt createdAt,
      // nhưng có thể giữ cho chắc:
      attributes: [
        'id', 'full_name', 'email', 'role', 'company_id',
        'employee_code', 'position_id',
        ['password_hash', 'password'], // alias đảm bảo có dữ liệu cho bcrypt
      ],
    });

    if (!user)
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });

    const token = signJwt(user);

    return res.status(200).json({
      token, // <-- Frontend đang chờ field này
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        company_id: user.company_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Lỗi server nội bộ.' });
  }
};

exports.getMe = async (req, res) => {
  // yêu cầu middleware protect đã decode JWT và gắn req.user
  const { id, role, company_id } = req.user || {};
  return res.status(200).json({ id, role, company_id });
};
