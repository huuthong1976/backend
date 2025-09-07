// server/controllers/kpiEvaluationController.js
const kpiEvaluationService = require('../services/kpiEvaluationService');
const kpiService = require('../services/kpiService'); // Dùng lại service để lấy thông tin plan

/**
 * Lấy thông tin chi tiết một bản đánh giá (thực chất là một kế hoạch KPI).
 * Controller này chỉ đơn giản là gọi lại hàm từ kpiController để bảo đảm tính nhất quán.
 */
const getEvaluation = async (req, res) => {
    try {
        const { planId } = req.params;
        const loggedInUser = req.user;

        const plan = await kpiService.findKpiPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Không tìm thấy kế hoạch/bản đánh giá KPI.' });
        }

        // --- Logic Kiểm tra Quyền ---
        // Ví dụ: User chỉ được xem KPI của mình, Manager được xem của nhân viên trong công ty...
        const canView = (
            loggedInUser.role === 'admin' ||
            loggedInUser.role === 'director' ||
            (loggedInUser.role === 'manager' && loggedInUser.company_id === plan.company_id) ||
            (loggedInUser.id === plan.employee_id)
        );

        if (!canView) {
            return res.status(403).json({ error: 'Bạn không có quyền xem bản đánh giá này.' });
        }
        
        res.status(200).json(plan);
    } catch (error) {
        console.error('Get Evaluation Error:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu đánh giá.' });
    }
};


/**
 * Xử lý hành động NỘP KẾT QUẢ của các vai trò (User, Manager, Director).
 * Đây là hàm "trái tim" của controller, xử lý nhiều nghiệp vụ.
 */
const submitEvaluation = async (req, res) => {
    try {
        const { planId } = req.params;
        const { items } = req.body; // Frontend gửi lên các mục KPI đã được cập nhật điểm
        const user = req.user;

        const plan = await kpiService.findKpiPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Không tìm thấy kế hoạch KPI.' });
        }

        let nextStatus = ''; // Trạng thái tiếp theo của plan

        // --- Logic Phân quyền và Xác định Trạng thái tiếp theo ---
        switch (user.role) {
            case 'user':
                if (plan.employee_id !== user.id || plan.status !== 'SELF_ASSESSMENT') {
                    return res.status(403).json({ error: 'Bạn không có quyền hoặc đã hết hạn nộp tự đánh giá.' });
                }
                nextStatus = 'PENDING_REVIEW'; // User nộp xong -> Chờ Manager duyệt
                break;
            
            case 'manager':
                // Cần thêm logic kiểm tra xem user này có phải là quản lý của nhân viên trong plan không
                if (plan.status !== 'PENDING_REVIEW') {
                    return res.status(403).json({ error: 'Không thể duyệt khi kế hoạch không ở trạng thái "Chờ quản lý duyệt".' });
                }
                nextStatus = 'DIRECTOR_REVIEW'; // Manager duyệt xong -> Chờ TGĐ duyệt
                break;

            case 'director':
                if (plan.status !== 'DIRECTOR_REVIEW') {
                    return res.status(403).json({ error: 'Không thể duyệt khi kế hoạch không ở trạng thái "Chờ TGĐ duyệt".' });
                }
                nextStatus = 'COMPLETED'; // TGĐ duyệt xong -> Hoàn thành
                break;

            default:
                return res.status(403).json({ error: 'Vai trò không hợp lệ.' });
        }
        
        // Gọi service để lưu các thay đổi vào DB
        await kpiEvaluationService.submitEvaluation(planId, items, nextStatus);

        res.status(200).json({ success: true, message: `Nộp kết quả đánh giá thành công. Trạng thái mới: ${nextStatus}` });

    } catch (error) {
        console.error(`Submit Evaluation Error by ${req.user.role}:`, error);
        res.status(500).json({ error: 'Lỗi server khi nộp kết quả đánh giá.' });
    }
};

/**
 * Chuyển trạng thái của một kế hoạch KPI (ví dụ: Admin mở lại kỳ đánh giá).
 */
const updateStatus = async (req, res) => {
    try {
        const { planId } = req.params;
        const { newStatus } = req.body;

        // Validation cơ bản
        if (!newStatus) {
            return res.status(400).json({ error: 'Vui lòng cung cấp trạng thái mới.' });
        }
        
        // Chỉ Admin mới có quyền tự do chuyển trạng thái
        // (Đây là ví dụ, bạn có thể thêm các vai trò khác)
        if (req.user.role !== 'admin') {
             return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
        }

        const updated = await kpiService.updatePlanStatus(planId, newStatus);
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy kế hoạch KPI để cập nhật.' });
        }

        res.status(200).json({ success: true, message: `Đã cập nhật trạng thái thành công.` });

    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái.' });
    }
};


module.exports = {
    getEvaluation,
    submitEvaluation,
    updateStatus,
};