const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const multer = require('multer');
// ✅ BƯỚC 1: Import middleware xác thực và phân quyền
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// ✅ BƯỚC 2: Áp dụng middleware verifyToken cho TẤT CẢ các route trong file này
// Mọi yêu cầu đến /api/payroll/* đều phải được xác thực trước
router.use(verifyToken);


// === API Lấy dữ liệu ===
// Các route này có thể cần phân quyền chi tiết hơn tùy theo yêu cầu
router.get('/companies', authorizeRoles(['Admin', 'KeToan', 'NhanSu']), payrollController.getCompanies);
router.get('/departments', authorizeRoles(['Admin', 'KeToan', 'NhanSu']), payrollController.getDepartments);
router.get('/summary', authorizeRoles(['Admin', 'KeToan', 'NhanSu']), payrollController.getPayrollSummary);
router.get('/payslip', payrollController.getPayslipDetail); // Nhân viên có thể tự xem của mình
router.get('/template', authorizeRoles(['Admin', 'KeToan', 'NhanSu']), payrollController.downloadTemplate);


// === API Hành động (Yêu cầu quyền cao hơn) ===
router.post('/calculate', authorizeRoles(['Admin', 'KeToan']), payrollController.calculatePayroll);
router.post('/save-adjustments', authorizeRoles(['Admin', 'KeToan']), payrollController.saveAdjustments);
router.post('/import-adjustments', upload.single('file'), authorizeRoles(['Admin', 'KeToan']), payrollController.importAdjustments);


// === API Xuất file & Thông báo (Yêu cầu quyền cao hơn) ===
router.get('/export', authorizeRoles(['Admin', 'KeToan']), payrollController.exportPayroll);
router.post('/export-pdf', authorizeRoles(['Admin', 'KeToan']), payrollController.exportPayslipPdf);
router.post('/send-zalo', authorizeRoles(['Admin', 'KeToan']), payrollController.sendZaloNotification);
router.post('/send-email', authorizeRoles(['Admin', 'KeToan']), payrollController.sendEmailNotification);
router.post('/export-payslip-excel', authorizeRoles(['Admin', 'KeToan']), payrollController.exportPayslipExcel);

module.exports = router;