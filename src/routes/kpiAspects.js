const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const kpiAspectController = require('../controllers/kpiAspectController');

// ---- APIs ----

// GET /api/kpi-aspects -> Lấy danh sách định nghĩa khía cạnh
router.get('/', protect, kpiAspectController.getBscPerspectives);                

// GET /api/kpi-aspects/weights -> Lấy tỷ trọng đã lưu
router.get('/weights', protect, kpiAspectController.getBscWeights);

// ✅ THÊM ROUTE NÀY: POST /api/kpi-aspects/weights -> Lưu tỷ trọng
router.post('/weights', protect, kpiAspectController.savePerspectiveWeights);

// Các route không dùng tới
router.post('/', protect, kpiAspectController.create);
router.put('/:id', protect, kpiAspectController.update);
router.delete('/:id', protect, kpiAspectController.remove);

module.exports = router;