// server/routes/kpiEvaluation.js
const express = require('express');
const router = express.Router();
const kpiEvaluationController = require('../controllers/kpiEvaluationController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Áp dụng middleware xác thực cho tất cả các route trong file này
// Mọi request đến đây đều phải có token hợp lệ
router.use(verifyToken);

/**
 * @route   GET /api/kpi-evaluation/:planId
 * @desc    Lấy thông tin chi tiết một bản đánh giá KPI
 * @access  Private (Người dùng liên quan hoặc quản lý cấp cao)
 */
router.get('/:planId', kpiEvaluationController.getEvaluation);

/**
 * @route   POST /api/kpi-evaluation/:planId/submit
 * @desc    Nộp kết quả đánh giá (dành cho User, Manager, Director)
 * Controller sẽ tự xử lý logic dựa trên vai trò của người nộp.
 * @access  Private (Tất cả các vai trò đã đăng nhập)
 */
router.post('/:planId/submit', kpiEvaluationController.submitEvaluation);

/**
 * @route   PUT /api/kpi-evaluation/:planId/status
 * @desc    Cập nhật trạng thái của một kế hoạch KPI (nghiệp vụ quản trị)
 * Ví dụ: Mở lại kỳ đánh giá cho nhân viên.
 * @access  Private (Chỉ Admin)
 */
router.put(
    '/:planId/status',
    authorizeRoles(['admin']), // Chỉ Admin mới có quyền truy cập route này
    kpiEvaluationController.updateStatus
);

module.exports = router;