// server/routes/companyKpiRoutes.js
const express = require('express');
const router = express.Router();

// Import controller chứa logic nghiệp vụ
const companyKpiController = require('../controllers/companyKpiController');

// Import middleware để bảo vệ các route
const { protect, authorizeRoles } = require('../middleware/auth');

// --- ÁP DỤNG MIDDLEWARE XÁC THỰC ---
router.use(protect);


// --- ĐỊNH NGHĨA CÁC ROUTE (ENDPOINT) ---

/**
 * @route   GET /api/company-kpi
 * @desc    Lấy danh sách KPI của công ty (có lọc và phân quyền)
 * @access  Private (Tất cả các vai trò sau khi đăng nhập)
 */
router.get('/', companyKpiController.listCompanyKpis);

// ✅ BỔ SUNG ROUTE MỚI TẠI ĐÂY
/**
 * @route   GET /api/company-kpi/library
 * @desc    Lấy danh sách KPI từ thư viện (dùng cho dropdown)
 * @access  Private (Tất cả các vai trò sau khi đăng nhập)
 */
router.get('/library', companyKpiController.getKpiLibrary);


/**
 * @route   GET /api/company-kpi/:id
 * @desc    Lấy chi tiết một KPI bằng ID
 * @access  Private
 */
router.get('/:id', companyKpiController.getCompanyKpiById);

/**
 * @route   POST /api/company-kpi
 * @desc    Tạo mới một chỉ số KPI
 * @access  Private (Chỉ Admin và Manager)
 */
router.post(
    '/', 
    authorizeRoles(['admin', 'TruongDonVi']),
    companyKpiController.createCompanyKpi
);
router.post(
    '/bulk-register',
    authorizeRoles(['admin', 'TruongDonVi']),
    companyKpiController.bulkRegisterCompanyKpis
);
/**
 * @route   PUT /api/company-kpi/:id
 * @desc    Cập nhật một chỉ số KPI
 * @access  Private (Chỉ Admin và Manager)
 */
router.put(
    '/:id', 
    authorizeRoles(['admin', 'TruongDonVi']), 
    companyKpiController.updateCompanyKpi
);

/**
 * @route   POST /api/company-kpi/bulk-update
 * @desc    Cập nhật hàng loạt các chỉ số KPI
 * @access  Private (Chỉ Admin và Manager)
 */
router.post(
    '/bulk-update',
    authorizeRoles(['admin', 'TruongDonVi']),
    companyKpiController.bulkUpdateCompanyKpis
);

/**
 * @route   DELETE /api/company-kpi/:id
 * @desc    Xóa một chỉ số KPI
 * @access  Private (Chỉ Admin)
 */
router.delete(
    '/:id', 
    authorizeRoles(['admin', 'TruongDonVi']), 
    companyKpiController.deleteCompanyKpi
);

/**
 * @route   POST /api/company-kpi/:registrationId/allocate
 * @desc    Phân bổ chỉ tiêu tháng cho một KPI
 * @access  Private (Chỉ Admin và Manager)
 */
router.post(
    '/:registrationId/allocate', 
    authorizeRoles(['admin', 'TruongDonVi']), 
    companyKpiController.allocateMonthlyTargets
);

module.exports = router;