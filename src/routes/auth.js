// server/routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/health', (_req, res) => res.json({ ok: true }));

// Đăng nhập
router.post('/login', auth.login);

// Nếu chưa dùng verifyToken, tạm mở không middleware để tránh undefined:
router.get('/me', auth.getMe);
router.get('/current-user', auth.getCurrentUser);

module.exports = router;
