// src/middleware/auth.js
const jwt = require('jsonwebtoken');

// Yêu cầu JWT
const protect = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // nên có { id, role, ... }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Phân quyền theo vai trò (không phân biệt hoa–thường)
const authorize = (...roles) => {
  const allow = roles.flat().map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allow.includes(String(role).toLowerCase())) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
};

// Alias để tương thích các file đang dùng verifyToken/authorizeRoles
const verifyToken = protect;
const authorizeRoles = (roles) => authorize(...roles);

module.exports = { protect, authorize, verifyToken, authorizeRoles };
