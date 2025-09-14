// server/routes/auth.js
const router = require('express').Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Đăng nhập: PUBLIC
router.post('/login', login);

// Lấy thông tin user hiện tại: PRIVATE
router.get('/me', protect, getMe);

module.exports = router;

