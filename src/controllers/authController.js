
const { findUserByLogin, comparePassword, generateTokens } = require('../services/authService');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
    }

    const user = await findUserByLogin(username);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const { accessToken, token } = generateTokens(user);

    // cập nhật thống kê đăng nhập (tuỳ chọn)
    // await user.update({ lastLogin: new Date(), loginCount: (user.loginCount || 0) + 1 });

    return res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        fullName: user.fullName || user.username,
        role: user.role,
        company_id: user.companyId ?? null,
      },
      accessToken,
      token,
    });
  } catch (err) {
    next(err);
  }
};
