// server/services/dashboardService.js
const { pool, getPool }  = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;

/**
 * Lấy dữ liệu tổng hợp cho trang Dashboard, truy vấn trực tiếp từ MySQL.
 * @param {object} user - Thông tin người dùng đăng nhập (chứa role, company_id).
 * @param {object} filters - Bộ lọc từ giao diện (ví dụ: companyId, month, year).
 * @returns {object} - Dữ liệu tổng hợp cho Dashboard.
 */
const getSummaryData = async (user, filters) => {
    // Xác định tháng và năm hiện tại để lọc
    const month = filters.month || new Date().getMonth() + 1; // JS month là 0-11
    const year = filters.year || new Date().getFullYear();

    // --- Xây dựng mệnh đề WHERE động để phân quyền và lọc ---
    let companyFilterSql = '';
    const companyParams = [];

    if (user.role === 'TruongDonVi') {
        companyFilterSql = 'AND e.company_id = ?';
        companyParams.push(user.company_id);
    } else if ((user.role === 'Admin' || user.role === 'TongGiamDoc') && filters.companyId) {
        companyFilterSql = 'AND e.company_id = ?';
        companyParams.push(filters.companyId);
    }
    
    // --- Thực hiện các câu lệnh SQL song song để tăng hiệu năng ---
    try {
        const [
            [[{ totalEmployees }]],
            [[{ kpiCompletionRate }]],
            [[{ totalPayroll }]],
            [pendingKpiTasks],
            [kpiByDepartment],
            [companies]
        ] = await Promise.all([
            // 1. Lấy tổng số nhân viên đang làm việc
            db.query(
                `SELECT COUNT(id) as totalEmployees FROM employees e WHERE e.status = 'Đang làm việc' ${companyFilterSql}`,
                companyParams
            ),
            // 2. Lấy tỷ lệ hoàn thành KPI trung bình (lấy điểm của quản lý)
            db.query(
                `SELECT AVG(pi.manager_score) as kpiCompletionRate
                 FROM kpi_plan_items pi
                 JOIN kpi_plans p ON pi.plan_id = p.id
                 JOIN employees e ON p.employee_id = e.id
                 WHERE p.month = ? AND p.year = ? ${companyFilterSql}`,
                [month, year, ...companyParams]
            ),
            // 3. Lấy tổng quỹ lương đã chi trả trong tháng
            db.query(
                `SELECT SUM(p.net_salary) as totalPayroll 
                 FROM payrolls p 
                 JOIN employees e ON p.employee_id = e.id 
                 WHERE p.month = ? AND p.year = ? ${companyFilterSql}`,
                [month, year, ...companyParams]
            ),
            // 4. Lấy danh sách kế hoạch KPI cần duyệt (chờ Manager hoặc Director duyệt)
            db.query(
                `SELECT p.id, e.full_name, p.status 
                 FROM kpi_plans p JOIN employees e ON p.employee_id = e.id 
                 WHERE p.status IN ('PENDING_REVIEW', 'DIRECTOR_REVIEW') ${companyFilterSql}
                 ORDER BY p.updated_at DESC
                 LIMIT 5`,
                companyParams
            ),
            // 5. Lấy điểm KPI trung bình theo từng phòng ban
            db.query(
                `SELECT d.department_name as department, AVG(pi.manager_score) as score
                 FROM kpi_plan_items pi
                 JOIN kpi_plans p ON pi.plan_id = p.id
                 JOIN employees e ON p.employee_id = e.id
                 JOIN departments d ON e.id = d.id
                 WHERE p.month = ? AND p.year = ? ${companyFilterSql}
                 GROUP BY d.department_name
                 ORDER BY score DESC`,
                [month, year, ...companyParams]
            ),
            // 6. Lấy danh sách công ty (chỉ khi user là admin/director)
            (user.role === 'Admin' || user.role === 'TongGiamDoc')
                ? db.query('SELECT id, company_name as name FROM companies ORDER BY name ASC')
                : Promise.resolve([[]]) // Trả về mảng rỗng nếu không có quyền
        ]);

        return {
            totalEmployees: totalEmployees || 0,
            kpiCompletionRate: parseFloat(kpiCompletionRate || 0).toFixed(2),
            totalPayroll: totalPayroll || 0,
            pendingPlans: pendingKpiTasks.length,
            pendingKpiTasks,
            kpiByDepartment,
            companies,
        };
    } catch (error) {
        console.error("Dashboard Service Error:", error);
        throw new Error('Lỗi khi tổng hợp dữ liệu dashboard từ cơ sở dữ liệu.');
    }
};

module.exports = {
    getSummaryData,
};