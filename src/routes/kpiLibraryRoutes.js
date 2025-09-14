// server/routes/kpiLibraryRoutes.js
const express = require('express');
const router = express.Router();
const kpiLibraryController = require('../controllers/kpiLibraryController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Tất cả các route trong file này đều yêu cầu đăng nhập

router.use(protect);




router.get('/tree', kpiLibraryController.getKpiLibraryTree);

/**
 * @route   GET /api/kpi-library/flat
 * @desc    Lấy danh sách KPI trong thư viện (dạng PHẲNG) - DÙNG CHO FRONTEND
 */
router.get('/flat', kpiLibraryController.getKpiLibrary);



/**
 * @route   POST /api/kpi-library
 * @desc    Tạo một KPI mới
 */
router.post('/', kpiLibraryController.createKpi);

/**
 * @route   PUT /api/kpi-library/:id
 * @desc    Cập nhật một KPI theo ID
 */
router.put('/:id', kpiLibraryController.updateKpi);

/**
 * @route   DELETE /api/kpi-library/:id
 * @desc    Xóa một KPI theo ID
 */
router.delete('/:id', kpiLibraryController.deleteKpi);
// Route mới cho Export
router.get('/export', kpiLibraryController.exportKpis);

// Route mới cho Import, dùng middleware 'upload' của multer
router.post('/import', upload.single('file'), kpiLibraryController.importKpis);

module.exports = router;