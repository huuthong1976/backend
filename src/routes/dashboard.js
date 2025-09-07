// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

// Import controller chứa logic nghiệp vụ
const dashboardController = require('../controllers/dashboardController');

// Import middleware để bảo vệ các route
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// --- ÁP DỤNG MIDDLEWARE XÁC THỰC ---
// Tất cả các route được định nghĩa trong file này đều yêu cầu người dùng phải đăng nhập.
// Token hợp lệ sẽ được kiểm tra trước khi bất kỳ hàm controller nào được gọi.
router.use(verifyToken);

// --- ĐỊNH NGHĨA ROUTE CHO DASHBOARD ---

/**
 * @route   GET /api/dashboard/summary
 * @desc    Lấy tất cả dữ liệu tổng hợp cho trang Dashboard chính.
 * Bao gồm các chỉ số, biểu đồ và danh sách công việc.
 * @access  Private (Chỉ các vai trò quản lý cấp cao và admin)
 */
router.get(
    '/summary', 
    // Middleware phân quyền: chỉ những vai trò được liệt kê mới có quyền truy cập.
    authorizeRoles(['Admin', 'TongGiamDoc', 'TruongDonVi']), 
    // Hàm xử lý logic nghiệp vụ từ controller
    dashboardController.getDashboardSummary
);

/*
// Ghi chú:
// Trong tương lai, nếu bạn muốn thêm các API khác cho dashboard,
// ví dụ như lấy dữ liệu chi tiết cho một biểu đồ, bạn có thể thêm chúng ở đây.
// 
// router.get(
//     '/kpi-chart-details',
//     authorizeRoles(['admin', 'director', 'manager']),
//     dashboardController.getKpiChartDetails
// );
*/

module.exports = router;