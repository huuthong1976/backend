// src/controllers/authController.js
const db = require('../models');
const authService = require('../services/authService');

// NOTE:
// - KHÔNG định nghĩa lại findUserByUsername/comparePassword/generateTokens ở đây.
// - Chỉ gọi qua authService để thống nhất 1 nguồn logic.

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
    }

    // 1) Tìm user
    const user = await authService.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    // 2) So khớp mật khẩu (hỗ trợ cả passwordHash & password_hash)
    const hashed = user.passwordHash ?? user.password_hash ?? '';
    const ok = await authService.comparePassword(password, hashed);
    if (!ok) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    // 3) Tạo token qua service (có thể trả { accessToken } hoặc { accessToken, refreshToken })
    const { accessToken, refreshToken } = authService.generateTokens(user);

    // 4) Chuẩn hoá user trả về (giữ shape cũ để không vỡ UI)
    const payloadUser = {
      id: user.id,
      fullName: user.fullName ?? user.full_name ?? user.username,
      role: user.role,
      company_id: user.companyId ?? user.company_id,
    };

    // Nếu hệ thống của bạn dùng cookie thay vì bearer token, bật dòng dưới:
    // res.cookie('token', accessToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 86400000 });

    return res.status(200).json({
      message: 'Đăng nhập thành công!',
      user: payloadUser,
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
    });
  } catch (err) {
    return next(err); // để global error handler xử lý thống nhất
  }
};

exports.getMe = (req, res) => {
  // Middleware verifyToken đã gắn user vào req.user
  const { id, role, company_id, companyId } = req.user || {};
  return res.status(200).json({ id, role, company_id: company_id ?? companyId });
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    // Một số token cũ có thể dùng employee_id, token mới dùng id → hỗ trợ cả hai
    const employeeId = req.user?.employee_id ?? req.user?.id;
    if (!employeeId) {
      return res.status(400).json({ error: 'Thiếu employee id trong token.' });
    }
    const profile = await db.Employee.findByPk(employeeId);
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });
    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
};
