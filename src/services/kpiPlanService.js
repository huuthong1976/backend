// server/services/kpiPlanService.js
const db = require('../config/db');

/**
 * Lấy kế hoạch KPI hàng tháng của một nhân viên
 * @param {object} filters - Chứa userId, month, year
 * @returns {Array} - Mảng các công việc/KPI đã đăng ký
 */
const getEmployeePlan = async (filters) => {
    const { userId, month, year } = filters;
    try {
        // Tên bảng và các cột có thể cần điều chỉnh cho khớp với database của bạn
        const sql = `
        SELECT * FROM kpi_plans 
        WHERE employee_id = ? AND month = ? AND year = ?
        ORDER BY id ASC;
        `;
        const [planItems] = await db.query(sql, [userId, month, year]);
        return planItems;
    } catch (error) {
        console.error("Lỗi khi lấy kế hoạch KPI từ DB:", error);
        throw error;
    }
};
// ✅ Hàm mới để lấy danh sách nhân viên cấp dưới


module.exports = {
    getEmployeePlan,
    
};