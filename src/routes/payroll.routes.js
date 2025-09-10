const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const multer = require('multer');
// ✅ BƯỚC 1: Import middleware xác thực và phân quyền
const asyncHandler = require('express-async-handler');
const { protect, authorizeRoles } = require('../middleware/auth'); 

//const upload = multer({ storage: multer.memoryStorage() });

// ✅ BƯỚC 2: Áp dụng middleware asyncHandler cho TẤT CẢ các route trong file này
// Mọi yêu cầu đến /api/payroll/* đều phải được xác thực trước
router.use(protect);


/// === API Lấy dữ liệu ===
router.get('/companies', asyncHandler(payrollController.getCompanies));
router.get('/departments', asyncHandler(payrollController.getDepartments));
router.get('/summary', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.getPayrollSummary));
router.get('/payslip', asyncHandler(payrollController.getPayslipDetail));
router.get('/template', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.downloadTemplate));

// === API Hành động (Yêu cầu quyền cao hơn) ===
// SỬA 3: Sử dụng đúng middleware `authorize`
router.post('/calculate', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.calculatePayroll));
router.post('/save-adjustments', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.saveAdjustments));
//router.post('/import-adjustments', upload.single('file'), authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.importAdjustments));

// === API Xuất file & Thông báo (Yêu cầu quyền cao hơn) ===
router.get('/export', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.exportPayroll));
router.post('/export-pdf', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.exportPayslipPdf));
router.post('/send-zalo', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.sendZaloNotification));
router.post('/send-email', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.sendEmailNotification));
router.post('/export-payslip-excel', authorizeRoles(['Admin', 'KeToan']), asyncHandler(payrollController.exportPayslipExcel));
module.exports = router;