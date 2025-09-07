// server/services/unitKpiService.js
const db = require('../config/db');

/**
 * Lấy danh sách các KPI đã được một đơn vị đăng ký trong một năm.
 */
const getRegistrations = async (companyId, year) => {
    const sql = `
        SELECT 
            ukr.kpi_library_id as \`key\`, -- Dùng kpi_library_id làm key cho giao diện
            kl.kpi_name as title, -- Dùng name làm title cho giao diện
            ukr.target
        FROM unit_kpi_registrations ukr
        JOIN kpi_library kl ON ukr.kpi_library_id = kl.id
        WHERE ukr.company_id = ? AND ukr.year = ?;
    `;
    const [registrations] = await db.query(sql, [companyId, year]);
    return registrations;
};

/**
 * Lưu lại toàn bộ danh sách KPI đăng ký cho một đơn vị trong một năm.
 * Sử dụng phương pháp "xóa cũ, chèn mới" trong một transaction để đơn giản và an toàn.
 */
const saveRegistrations = async (companyId, year, kpiItems) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Xóa tất cả các đăng ký cũ của công ty trong năm đó
        await connection.query('DELETE FROM unit_kpi_registrations WHERE company_id = ? AND year = ?', [companyId, year]);

        // 2. Chèn các đăng ký mới nếu có
        if (kpiItems && kpiItems.length > 0) {
            const values = kpiItems.map(item => [item.key, companyId, year, item.target]);
            const sql = 'INSERT INTO unit_kpi_registrations (kpi_library_id, company_id, year, target) VALUES ?';
            await connection.query(sql, [values]);
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error("Save Unit KPI Registrations Error:", error);
        throw new Error('Lưu đăng ký KPI thất bại.');
    } finally {
        connection.release();
    }
};

module.exports = { getRegistrations, saveRegistrations };