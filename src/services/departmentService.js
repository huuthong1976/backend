// server/services/departmentService.js
const { pool, getPool }  = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;

/**
 * Lấy danh sách phòng ban, có lọc theo công ty.
 * @param {object} user - Thông tin người dùng đăng nhập.
 * @param {object} filters - Bộ lọc (ví dụ: companyId).
 */
const getAll = async (user, filters = {}) => {
    let sql = 'SELECT * FROM departments WHERE 1=1';
    const params = [];

    // Áp dụng logic phân quyền và lọc
    let companyIdToFilter = filters.companyId;
    if (user.role === 'manager' || user.role === 'user') {
        companyIdToFilter = user.company_id; // Manager/User chỉ thấy phòng ban trong công ty của mình
    }

    if (companyIdToFilter) {
        sql += ' AND company_id = ?';
        params.push(companyIdToFilter);
    }

    sql += ' ORDER BY department_name ASC';
    const [departments] = await db.query(sql, params);
    return departments;
};

/**
 * Lấy chi tiết một phòng ban bằng ID.
 */
const getById = async (id) => {
    const [departments] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
    return departments[0];
};

/**
 * Tạo mới một phòng ban.
 */
const create = async (departmentData) => {
    const { department_name, company_id } = departmentData;
    const sql = 'INSERT INTO departments (department_name, company_id) VALUES (?, ?)';
    const [result] = await db.query(sql, [department_name, company_id]);
    return getById(result.insertId);
};

/**
 * Cập nhật một phòng ban.
 */
const update = async (id, departmentData) => {
    const { department_name, company_id } = departmentData;
    const sql = 'UPDATE departments SET department_name = ?, company_id = ? WHERE id = ?';
    const [result] = await db.query(sql, [department_name, company_id, id]);
    return result.affectedRows > 0;
};

/**
 * Xóa một phòng ban.
 */
const remove = async (id) => {
    const [result] = await db.query('DELETE FROM departments WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
};