// server/services/kpiAspectService.js
const db = require('../config/db');

/**
 * Lấy danh sách tất cả các khía cạnh BSC.
 * @returns {Array} - Mảng các đối tượng khía cạnh.
 */
const getAll = async () => {
    try {
        const [kpiAspects] = await db.query('SELECT * FROM bsc_perspectives ORDER BY id ASC');
        return kpiAspects;
    } catch (error) {
        console.error("Lỗi khi lấy danh sách khía cạnh KPI:", error);
        throw error;
    }
};

module.exports = {
    getAll,
};