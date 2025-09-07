// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Thay thế bằng secret key thực tế của bạn
const JWT_SECRET = process.env.JWT_SECRET;  

const authMiddleware = (req, res, next) => {
    // Lấy token từ header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Không có token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Lỗi xác thực token:', err);
            return res.sendStatus(403); // Token không hợp lệ
        }
        // Gắn thông tin người dùng đã được giải mã vào request
        // user có thể chứa { id, role, company_id }
        req.user = user; 
        next();
    });
};

module.exports = authMiddleware;