// server/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth'); // Import middleware xác thực

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập và nhận token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin người dùng đang đăng nhập
 * @access  Private (Yêu cầu token hợp lệ)
 */
router.get('/me', verifyToken, authController.getMe);

// Bạn có thể thêm các route khác như /register, /logout, /refresh-token ở đây

module.exports = router;