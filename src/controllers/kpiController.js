// server/controllers/kpiController.js
const kpiService = require('../services/kpiService');
const { Op } = require('sequelize');
// ✅ Import employeeService nếu cần
const employeeService = require('../services/employeeService'); 

/**
 * Lấy chi tiết một kế hoạch KPI, bao gồm các mục tiêu con và danh sách KPI đơn vị có thể liên kết.
 */
const getKpiPlanDetails = async (req, res) => {
    try {
        const { planId } = req.params;
        const loggedInUser = req.user; // Lấy từ middleware xác thực

        const result = await kpiService.findKpiPlanById(planId);
        
        if (!result || !result.plan) {
            return res.status(404).json({ error: 'Không tìm thấy kế hoạch KPI.' });
        }
        
        // --- Logic Kiểm tra Quyền ---
        // Người dùng có quyền xem nếu:
        // 1. Là Admin/Director.
        // 2. Là Manager và KPI thuộc công ty của họ.
        // 3. Là nhân viên và đó là KPI của chính họ.
        const plan = result.plan;
        const employee = await employeeService.getById(plan.employee_id); // Cần employeeService

        const canView = (
            loggedInUser.role === 'Admin' ||
            loggedInUser.role === 'TongGiamDoc' ||
            (loggedInUser.role === 'TruongDonVi' && loggedInUser.company_id === employee.company_id) ||
            (loggedInUser.id === plan.employee_id)
        );

        if (!canView) {
            return res.status(403).json({ error: 'Bạn không có quyền xem kế hoạch này.' });
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Get KPI Plan Details Error:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu chi tiết kế hoạch KPI.' });
    }
};

/**
 * Tạo mới hoặc cập nhật (Lưu nháp) một kế hoạch KPI.
 */
const saveKpiPlan = async (req, res) => {
    try {
        const planData = req.body;
        const loggedInUser = req.user;

        // --- Logic Kiểm tra Quyền ---
        // Chỉ cho phép nhân viên tự lưu kế hoạch của mình khi ở trạng thái DRAFT
        if (loggedInUser.id !== planData.employee_id || planData.status !== 'DRAFT') {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
        }

        const result = await kpiService.upsertKpiPlan(planData);
        res.status(200).json({ success: true, message: 'Lưu nháp kế hoạch thành công.', data: result });

    } catch (error) {
        console.error('Save KPI Plan Error:', error);
        res.status(500).json({ error: 'Lỗi server khi lưu kế hoạch KPI.' });
    }
};

/**
 * Nộp kế hoạch/kết quả để chuyển sang bước tiếp theo trong quy trình.
 */
const submitKpiForReview = async (req, res) => {
    try {
        const { planId } = req.params;
        const { items, nextStatus } = req.body; // Frontend gửi lên trạng thái tiếp theo
        const loggedInUser = req.user;

        const plan = await kpiService.findKpiPlanById(planId);
        if (!plan || !plan.plan) {
            return res.status(404).json({ error: 'Không tìm thấy kế hoạch KPI.' });
        }

        // --- Logic Kiểm tra Quyền và Trạng thái ---
        const currentStatus = plan.plan.status;
        let canSubmit = false;

        switch (currentStatus) {
            case 'DRAFT': // Nộp kế hoạch
                canSubmit = (loggedInUser.id === plan.plan.employee_id && nextStatus === 'SELF_ASSESSMENT');
                break;
            case 'SELF_ASSESSMENT': // Nộp tự đánh giá
                canSubmit = (loggedInUser.id === plan.plan.employee_id && nextStatus === 'PENDING_REVIEW');
                break;
            case 'PENDING_REVIEW': // Manager duyệt
                // Cần thêm logic kiểm tra user có phải là manager của nhân viên không
                canSubmit = (loggedInUser.role === 'TruongDonVi' && nextStatus === 'DIRECTOR_REVIEW');
                break;
            case 'DIRECTOR_REVIEW': // TGĐ duyệt
                canSubmit = (loggedInUser.role === 'TongGiamDoc' && nextStatus === 'COMPLETED');
                break;
        }

        if (!canSubmit) {
            return res.status(403).json({ error: 'Hành động không hợp lệ với trạng thái hoặc vai trò hiện tại.' });
        }
        
        // Nếu hợp lệ, tiến hành cập nhật
        await kpiService.upsertKpiPlan({ id: planId, items, status: nextStatus });

        res.status(200).json({ success: true, message: 'Nộp thành công.' });
    } catch (error) {
        console.error('Submit KPI For Review Error:', error);
        res.status(500).json({ error: 'Lỗi server khi nộp kế hoạch/kết quả.' });
    }
};

exports.getSubordinatesForManager = async (req, res) => {
    try {
      const { company_id, month, year, status } = req.query;
      const user = req.user;
  
      const subordinates = await kpiService.getSubordinatesForManager(user, company_id, month, year, status);
  
      const data = subordinates.map(s => {
        const k = s.kpi_plans && s.kpi_plans.length ? s.kpi_plans[0] : null;
        const kpi_status = k ? k.status : 'Chưa tạo';
  
        if (status && status !== 'all' && kpi_status !== status) return null;
  
        return {
          id: s.id,
          full_name: s.full_name,
          position_name: s.position ? s.position.position_name : null,  // ✅ trả về tên chức vụ
          kpi_status,
        };
      }).filter(Boolean);
  
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Lỗi server khi lấy danh sách nhân viên cấp dưới.' });
    }
  };
  


exports.getDashboardSummary = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;
        const user = req.user; // Dữ liệu người dùng từ middleware xác thực

        const summary = await kpiService.getDashboardSummary(user, { company_id, month, year });
        res.status(200).json(summary);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu tóm tắt dashboard:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu tóm tắt dashboard.' });
    }
};


module.exports = {
    getKpiPlanDetails,
    saveKpiPlan,
    submitKpiForReview,
    getSubordinatesForManager: exports.getSubordinatesForManager,
    getDashboardSummary: exports.getDashboardSummary,
};