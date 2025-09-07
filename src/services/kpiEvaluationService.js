// server/services/kpiEvaluationService.js
const db = require('../config/db');

/**
 * Cập nhật điểm số đánh giá và chuyển trạng thái của kế hoạch KPI.
 * Hàm này sử dụng transaction để đảm bảo tất cả các thao tác đều thành công hoặc thất bại cùng lúc.
 * @param {number} planId - ID của kế hoạch KPI.
 * @param {Array<object>} items - Mảng các mục KPI với điểm số đã được cập nhật.
 * @param {string} nextStatus - Trạng thái mới của kế hoạch sau khi nộp (ví dụ: 'PENDING_REVIEW').
 * @returns {boolean} - true nếu thành công.
 */
const submitEvaluation = async (planId, items, nextStatus) => {
    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!planId || !Array.isArray(items) || !nextStatus) {
        throw new Error('Dữ liệu đầu vào không hợp lệ để lưu kết quả đánh giá.');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Cập nhật điểm số cho từng mục KPI (kpi_plan_items)
        for (const item of items) {
            const sql = `
                UPDATE kpi_plan_items 
                SET 
                    result = ?, 
                    self_score = ?, 
                    manager_score = ?, 
                    director_score = ?
                WHERE 
                    id = ? AND plan_id = ?;
            `;
            // Chỉ cập nhật các trường được cung cấp để tránh ghi đè null
            await connection.query(sql, [
                item.result,
                item.self_score,
                item.manager_score,
                item.director_score,
                item.id,
                planId
            ]);
        }

        // 2. Cập nhật trạng thái chung của kế hoạch KPI (kpi_plans)
        const planUpdateSql = 'UPDATE kpi_plans SET status = ?, updated_at = NOW() WHERE id = ?';
        const [result] = await connection.query(planUpdateSql, [nextStatus, planId]);

        await connection.commit();

        // Trả về true nếu có ít nhất một dòng trong bảng kpi_plans được cập nhật
        return result.affectedRows > 0;
    } catch (error) {
        // Nếu có bất kỳ lỗi nào, hủy bỏ tất cả các thay đổi
        await connection.rollback();
        console.error("Submit Evaluation Service Transaction Error:", error);
        throw new Error('Lưu kết quả đánh giá vào cơ sở dữ liệu thất bại.');
    } finally {
        // Luôn trả lại kết nối sau khi hoàn thành
        connection.release();
    }
};

/**
 * Lấy danh sách lịch sử thay đổi của một kế hoạch KPI (nếu có bảng log).
 * @param {number} planId - ID của kế hoạch KPI.
 * @returns {Array} - Mảng các bản ghi lịch sử.
 */
const getEvaluationHistory = async (planId) => {
    // Giả sử bạn có một bảng 'kpi_plan_history' để ghi lại các thay đổi
    // Cột trong bảng có thể là: id, plan_id, user_id, action, old_status, new_status, timestamp
    const sql = `
        SELECT h.*, u.full_name as user_name 
        FROM kpi_plan_history h
        JOIN users u ON h.user_id = u.id
        WHERE h.plan_id = ?
        ORDER BY h.timestamp DESC;
    `;
    const [history] = await db.query(sql, [planId]);
    return history;
};


module.exports = {
    submitEvaluation,
    getEvaluationHistory,
};