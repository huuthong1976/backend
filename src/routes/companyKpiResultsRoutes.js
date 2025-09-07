// server/routes/companyKpiResultsRoutes.js
const express = require('express');
const router = express.Router();
const companyKpiResultsController = require('../controllers/companyKpiResultsController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Tất cả các route trong file này đều yêu cầu xác thực
router.use(verifyToken);

/**
 * @route   GET /api/company-kpi-results
 * @desc    Lấy dữ liệu kết quả KPI hàng tháng của đơn vị
 * @access  Private
 */
router.get('/', companyKpiResultsController.getResults);

/**
 * @route   POST /api/company-kpi-results
 * @desc    Lưu (cập nhật) kết quả thực tế của KPI hàng tháng
 * @access  Private (Admin, Manager)
 */
router.post(
    '/', 
    authorizeRoles(['admin', 'TruongDonVi']), 
    companyKpiResultsController.saveResults
);
router.get('/company-kpi-summary', companyKpiResultsController.getSummary);

module.exports = router;