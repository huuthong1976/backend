// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware cơ bản: Chỉ kiểm tra token có hợp lệ hay không.
 * Dùng cho các API mà bất kỳ người dùng nào đã đăng nhập cũng có thể gọi.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Yêu cầu token để xác thực.' });
    }
    
    // ... logic xác thực token của bạn ...
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Gắn user vào request và đi tiếp
    req.user = decoded; // Hoặc thông tin user lấy từ DB
    next();

  } catch (error) {
    // Dòng 29 bị lỗi của bạn nằm ở đây
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
    protect, 
    authorizeRoles,
};