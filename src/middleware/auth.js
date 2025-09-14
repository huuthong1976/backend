// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Những đường public: KHÔNG yêu cầu token.
 * Dùng includes thay vì startsWith để vẫn hoạt động nếu bạn mount ở /api, /v1, ...
 */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot',
  '/health',
  '/public/',       // mọi tài nguyên tĩnh public
];

/** Kiểm tra request có phải đường public hay không */
function isPublicRequest(req) {
  // Bỏ qua preflight CORS
  if (req.method === 'OPTIONS') return true;

  const url = (req.originalUrl || req.url || '').toLowerCase();
  return PUBLIC_PATHS.some((p) => url.includes(p));
}

/**
 * Middleware cơ bản: xác thực JWT, nhưng BỎ QUA các đường public.
 * Giữ nguyên API export như file gốc.
 */
const protect = async (req, res, next) => {
  try {
    // Bỏ qua bảo vệ cho các đường public
    if (isPublicRequest(req)) return next();

    let token;

    // Ưu tiên: Authorization: Bearer <token>
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    }

    // Phương án dự phòng: cookie "token"
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Phương án dự phòng: query ?token=...
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Yêu cầu token để xác thực.' });
    }

    // Verify JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth] JWT_SECRET chưa được cấu hình!');
      return res.status(500).json({ error: 'Cấu hình máy chủ thiếu JWT_SECRET.' });
    }

    const decoded = jwt.verify(token, secret);

    // Gắn user lên req để router phía sau dùng
    req.user = decoded; // Có thể thay bằng user DB nếu cần

    return next();
  } catch (error) {
    // Token sai / hết hạn
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

/**
 * Middleware nâng cao: Kiểm tra token VÀ vai trò được phép.
 */
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.user;
    const ok =
      user &&
      user.role &&
      allowedRoles.map((r) => String(r).toLowerCase()).includes(String(user.role).toLowerCase());

    if (!ok) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
