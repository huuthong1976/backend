// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware cơ bản: Chỉ kiểm tra token có hợp lệ hay không.
 * Dùng cho các API mà bất kỳ người dùng nào đã đăng nhập cũng có thể gọi.
 */
const verifyToken = (req, res, next) => {
    try {
      let token = null;
  
      // Ưu tiên Authorization: Bearer <token>
      const auth = req.headers.authorization || req.headers.Authorization;
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  
      // Fallback: Cookie / Header / Query (nếu bạn dùng)
      if (!token && req.cookies?.token) token = req.cookies.token;
      if (!token && req.headers['x-access-token']) token = req.headers['x-access-token'];
      if (!token && req.query?.token) token = req.query.token;
  
      if (!token) {
        return res.status(401).json({ error: 'Không tìm thấy token xác thực.' });
      }
  
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
  };
  

/**
 * Middleware nâng cao: Kiểm tra token VÀ vai trò được phép.
 * @param {string[]} allowedRoles - Mảng các vai trò được phép truy cập. 
 * Ví dụ: ['admin', 'manager']
 */
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        // Lấy thông tin người dùng đã được middleware verifyToken giải mã trước đó
        const user = req.user;

        // Kiểm tra xem vai trò của người dùng có nằm trong danh sách được phép không
        if (!user || !user.role || !allowedRoles.map(role => role.toLowerCase()).includes(user.role.toLowerCase())) {
            return res.status(403).json({ 
                error: 'Bạn không có quyền thực hiện hành động này.' 
            });
        }

        // Nếu có quyền, tiếp tục
        next();
    };
};

module.exports = {
    verifyToken,
    authorizeRoles,
};