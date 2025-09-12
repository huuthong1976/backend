// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Lấy token từ request:
 * - Authorization: Bearer <token>
 * - (tuỳ chọn) cookie: accessToken / token
 */
function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (h.startsWith('Bearer ')) {
    const t = h.slice(7).trim();
    if (t && t !== 'null' && t !== 'undefined') return t;
  }
  // Bật nếu bạn muốn lấy từ cookie
  if (req.cookies) {
    if (req.cookies.accessToken) return req.cookies.accessToken;
    if (req.cookies.token) return req.cookies.token;
  }
  return null;
}

/**
 * Middleware xác thực cơ bản:
 * - Verify JWT
 * - Gắn req.user và req.companyId
 */
const protect = (req, res, next) => {
  try {
    // Bỏ qua preflight
    if (req.method === 'OPTIONS') return next();

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Thiếu token xác thực (Bearer token).' });
    }

    if (!process.env.JWT_SECRET) {
      console.warn('[WARN] JWT_SECRET chưa được cấu hình - không thể xác thực JWT.');
      return res.status(500).json({ error: 'Máy chủ thiếu cấu hình JWT.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded nên chứa: { id, role, company_id, ... }
    req.user = decoded || {};
    req.companyId =
      decoded?.company_id ??
      decoded?.companyId ??
      null;

    return next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }
};

/**
 * Middleware phân quyền theo vai trò
 * @param {string|string[]} allowedRoles
 */
const authorizeRoles = (allowedRoles) => {
  const allow = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const allowLower = allow.filter(Boolean).map(r => String(r).toLowerCase());

  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowLower.includes(String(role).toLowerCase())) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
