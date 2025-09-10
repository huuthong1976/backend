// server/services/kpiPlanService.js
const db = require('../config/db'); // Giả sử db là connection pool của mysql2/promise

/**
 * Lấy chi tiết kế hoạch KPI hàng tháng của một nhân viên cùng các mục tiêu con.
 * @param {object} filters - Chứa userId, month, year.
 * @returns {object|null} - Kế hoạch và các mục tiêu hoặc null nếu không tìm thấy.
 */
const getEmployeePlan = async (filters) => {
    const { userId, month, year } = filters;
    const connection = await db.getConnection();
    try {
        const planSql = `SELECT * FROM kpi_plans WHERE employee_id = ? AND month = ? AND year = ?;`;
        const [plans] = await connection.query(planSql, [userId, month, year]);

        if (plans.length === 0) {
            return null; // Không tìm thấy kế hoạch
        }

        const plan = plans[0];
        const itemsSql = `SELECT * FROM kpi_plan_items WHERE plan_id = ? ORDER BY id ASC;`;
        const [items] = await connection.query(itemsSql, [plan.id]);

        plan.items = items; // Gắn các mục tiêu vào đối tượng kế hoạch
        return plan;
    } catch (error) {
        console.error("Lỗi khi lấy kế hoạch KPI từ DB:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Tạo mới một kế hoạch KPI và các mục tiêu con trong một transaction.
 * @param {object} planData - Chứa employee_id, month, year.
 * @param {Array} items - Mảng các mục tiêu con (name, weight).
 * @returns {number} - ID của kế hoạch vừa được tạo.
 */
const createKpiPlan = async (planData, items) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Thêm bản ghi vào bảng chính `kpi_plans`
        const planSql = `INSERT INTO kpi_plans (employee_id, month, year, status) VALUES (?, ?, ?, ?);`;
        const [planResult] = await connection.query(planSql, [
            planData.employee_id,
            planData.month,
            planData.year,
            'Mới tạo'
        ]);
        const newPlanId = planResult.insertId;

        // 2. Thêm hàng loạt các mục tiêu vào bảng `kpi_plan_items`
        const itemSql = `INSERT INTO kpi_plan_items (plan_id, name, weight) VALUES ?;`;
        const itemValues = items.map(item => [newPlanId, item.name, item.weight]);
        await connection.query(itemSql, [itemValues]);

        await connection.commit();
        return newPlanId;
    } catch (error) {
        await connection.rollback(); // Nếu có lỗi, hoàn tác tất cả thay đổi
        console.error("Lỗi khi tạo kế hoạch KPI:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật điểm số và trạng thái của kế hoạch.
 * @param {object} data - Chứa planId, items, và userRole.
 * @returns {object} - Thông báo và trạng thái mới.
 */
const updateScoresAndStatus = async ({ planId, items, userRole }) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let nextStatus = '';
        let scoreField = '';

        // Logic xác định trạng thái tiếp theo và cột điểm cần cập nhật
        if (userRole === 'NhanvienCM') { // Giả định vai trò, bạn có thể thay đổi
            nextStatus = 'Chờ TĐV chấm';
            scoreField = 'self_score';
        } else if (userRole === 'TruongDonVi') {
            nextStatus = 'Chờ TGĐ chấm';
            scoreField = 'manager_score';
        } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
            nextStatus = 'Hoàn thành';
            scoreField = 'director_score';
        } else {
            throw new Error('Vai trò không hợp lệ để chấm điểm.');
        }

        // Cập nhật điểm cho từng mục tiêu
        for (const item of items) {
            const updateItemSql = `UPDATE kpi_plan_items SET ${scoreField} = ? WHERE id = ? AND plan_id = ?;`;
            await connection.query(updateItemSql, [item[scoreField], item.id, planId]);
        }

        // Cập nhật trạng thái cho kế hoạch chính
        const updatePlanSql = `UPDATE kpi_plans SET status = ? WHERE id = ?;`;
        await connection.query(updatePlanSql, [nextStatus, planId]);

        await connection.commit();
        return { message: 'Nộp đánh giá thành công!', status: nextStatus };
    } catch (error) {
        await connection.rollback();
        console.error("Lỗi khi cập nhật điểm và trạng thái:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách ID nhân viên cấp dưới của một quản lý.
 * @param {number} managerId - ID của người quản lý.
 * @returns {Array<number>} - Mảng chứa ID của các nhân viên cấp dưới.
 */
const getSubordinates = async (managerId) => {
    try {
        const sql = `SELECT id FROM employees WHERE manager_id = ?;`;
        const [rows] = await db.query(sql, [managerId]);
        return rows.map(row => row.id);
    } catch (error)
        console.error("Lỗi khi lấy danh sách nhân viên cấp dưới:", error);
        throw error;
    }



module.exports = {
    getEmployeePlan,
    createKpiPlan,
    updateScoresAndStatus,
    getSubordinates,
};