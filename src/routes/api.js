// server/routes/api.js
const express = require('express');
const router = express.Router();
const bscConfigController = require('../controllers/bscConfigController');
const { verifyToken } = require('../middleware/auth');
const kpiController = require('../controllers/kpiController');
// ✅ Bổ sung middleware xác thực cho tất cả các route
router.use(verifyToken);

router.get('/perspectives', bscConfigController.getBscPerspectives);
// === Cấu hình tỷ trọng BSC ===
// Lấy tỷ trọng BSC
router.get('/perspectives/weights', bscConfigController.getBscWeights);
// Cập nhật tỷ trọng BSC
router.post('/perspectives/weights', bscConfigController.updateBscWeights);
router.get('/kpi/subordinates-for-evaluation', kpiController.getSubordinatesForManager);
router.get('/kpi/dashboard/summary', kpiController.getDashboardSummary);
// ... (các route khác)

module.exports = router;