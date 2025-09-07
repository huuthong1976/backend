// server/routes/kpiPlan.js
const express = require('express');
const router = express.Router();
const kpiPlanController = require('../controllers/kpiPlanController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Tất cả các route đều yêu cầu đăng nhập
router.use(verifyToken);

// === KPI CÁ NHÂN ===
// Lấy kế hoạch của bản thân
router.get('/my-plan', kpiPlanController.getMyPlan);

// Tạo mới kế hoạch rỗng
router.post('/my-plan', kpiPlanController.createMyPlan);

// Cập nhật kế hoạch (Lưu nháp / chỉnh sửa)
router.put('/my-plan', kpiPlanController.updateMyPlan);

// Nộp đánh giá KPI
router.post('/my-plan/submit-assessment', kpiPlanController.submitAssessment);

// Sắp xếp thứ tự KPI
//router.put('/my-plan/reorder', kpiPlanController.reorderMyPlan);

// === NGHIỆP VỤ QUẢN LÝ ===
// Lấy kế hoạch của nhân viên bất kỳ
//router.get('/employee-plan', kpiPlanController.getEmployeePlan);

// Cập nhật trạng thái KPI (dành cho quản lý)
//router.put('/my-plan/:id', authorizeRoles(['TruongDonVi', 'Admin']), kpiPlanController.updateStatus);

// Duyệt KPI hàng loạt
router.post('/bulk-approve', authorizeRoles(['TruongDonVi', 'TongGiamDoc', 'Admin']), kpiPlanController.bulkApprove);

module.exports = router;
