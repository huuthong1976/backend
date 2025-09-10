// server/routes/api.js
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const kpiController = require('../controllers/kpiController');
const kpiAspectRoutes = require('./kpiAspects'); // ✅ Router này đã xử lý mọi thứ cho /kpi-aspects

// ✅ Bổ sung middleware xác thực cho tất cả các route bên dưới
router.use(protect);

router.use('/kpi-aspects', kpiAspectRoutes);


router.get('/kpi/subordinates-for-evaluation', kpiController.getSubordinatesForManager);
router.get('/kpi/dashboard/summary', kpiController.getDashboardSummary);
// ... (các route khác)

module.exports = router;