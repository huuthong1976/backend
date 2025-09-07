// server/controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');

/**
 * Lấy dữ liệu tổng hợp cho trang Dashboard.
 * Hàm này đóng vai trò là "bộ não" chính, nhận request,
 * chuyển tiếp thông tin cần thiết xuống tầng service và trả về kết quả.
 */
const getDashboardSummary = async (req, res) => {
    try {
        // --- BƯỚC 1: LẤY THÔNG TIN CẦN THIẾT ---
        // req.user được thêm vào từ middleware xác thực, chứa thông tin (id, role, company_id)
        // req.query chứa các tham số lọc từ URL (ví dụ: ?year=2025&companyId=1)
        const user = req.user;
        const filters = req.query;

        // --- BƯỚC 2: GỌI SERVICE ĐỂ LẤY DỮ LIỆU ---
        // Truyền cả `user` và `filters` xuống tầng service.
        // Tầng service sẽ tự quyết định phạm vi dữ liệu dựa trên các thông tin này.
        const summaryData = await dashboardService.getSummaryData(user, filters);
        
        // --- BƯỚC 3: GỬI PHẢN HỒI THÀNH CÔNG ---
        // Trả về dữ liệu đã được tổng hợp với mã trạng thái 200 OK.
        res.status(200).json(summaryData);

    } catch (error) {
        // --- BƯỚC 4: XỬ LÝ LỖI TẬP TRUNG ---
        // Ghi lại lỗi chi tiết ra console của server để gỡ lỗi
        console.error('Error in getDashboardSummary controller:', error);
        
        // Trả về một phản hồi lỗi chung cho client với mã 500
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu dashboard.' });
    }
};

// Bạn có thể bổ sung các hàm controller khác cho dashboard ở đây nếu cần trong tương lai
// Ví dụ: Lấy dữ liệu chi tiết cho một biểu đồ cụ thể
// const getKpiChartDetails = async (req, res) => { ... };


module.exports = {
    getDashboardSummary,
    // getKpiChartDetails,
};