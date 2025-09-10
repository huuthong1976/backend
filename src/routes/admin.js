// server/routes/admin.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Chỉ có Admin mới được truy cập route này
router.post('/create-user', protect, authorizeRoles(['Admin']), userController.createUserByAdmin);

module.exports = router;