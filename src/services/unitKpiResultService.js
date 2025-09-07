// server/services/unitKpiResultService.js
const db = require('../config/db');

/**
 * Lấy danh sách KPI đã đăng ký và kết quả thực tế trong tháng.
 */
const getMonthlyResults = async (companyId, year, month) => {
    const sql = `
        SELECT 
            ukr.id as registration_id,
            kl.name as kpi_name,
            kl.unit,
            ukr.target,
            ukr_res.actual_result
        FROM unit_kpi_registrations ukr
        JOIN kpi_library kl ON ukr.kpi_library_id = kl.id
        LEFT JOIN unit_kpi_results ukr_res ON ukr.id = ukr_res.registration_id AND ukr_res.month = ? AND ukr_res.year = ?
        WHERE ukr.company_id = ? AND ukr.year = ?
        ORDER BY kl.id;
    `;
    const [results] = await db.query(sql, [month, year, companyId, year]);
    return results;
};

/**
 * Lưu (Thêm mới hoặc Cập nhật) nhiều kết quả KPI tháng.
 */
const saveMonthlyResults = async (resultsData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const item of resultsData) {
            const sql = `
                INSERT INTO unit_kpi_results (registration_id, month, year, actual_result)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE actual_result = VALUES(actual_result);
            `;
            await connection.query(sql, [item.registration_id, item.month, item.year, item.actual_result]);
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw new Error('Lưu kết quả KPI tháng thất bại.');
    } finally {
        connection.release();
    }
};

module.exports = { getMonthlyResults, saveMonthlyResults };