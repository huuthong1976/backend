// server/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Tất cả endpoint dưới đây yêu cầu đăng nhập
router.use(protect);

// Cho phép thêm vài role phổ biến nếu bạn cần xem nhanh (có thể bỏ)
const ALLOWED = ['Admin', 'TongGiamDoc', 'TruongDonVi'];

router.get(
  '/summary',
  authorizeRoles(ALLOWED),
  dashboardController.getDashboardSummary
);

module.exports = router;
