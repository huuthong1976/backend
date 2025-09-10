// server/services/companyService.js
const { pool, getPool }  = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
/**
 * Lấy danh sách tất cả các công ty (có thể có phân trang).
 */
const getAll = async () => {
    const sql = ('SELECT id, company_code, company_name, address,tax_code,phone,email, status FROM companies ORDER BY company_name ASC');
    const [companies] = await db.query(sql);
    return companies;
};

/**
 * Lấy thông tin chi tiết của một công ty bằng ID.
 */
const getById = async (id) => {
    const [companies] = await db.query('SELECT * FROM companies WHERE id = ?', [id]);
    return companies[0];
};

/**
 * Tạo mới một công ty.
 */
const create = async (companyData) => {
    // Sửa lỗi ở đây: Bổ sung phone và email vào destructuring
    const { company_code, company_name, address, tax_code, status, phone, email } = companyData;
    const sql = `
        INSERT INTO companies (company_code, company_name, address, tax_code, status, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [company_code, company_name, address, tax_code, status, phone, email]);
    return getById(result.insertId);
};

/**
 * Cập nhật thông tin một công ty.
 */
const update = async (id, companyData) => {
    const [result] = await db.query('UPDATE companies SET ? WHERE id = ?', [companyData, id]);
    return result.affectedRows > 0;
};

/**
 * Xóa một công ty.
 */
const remove = async (id) => {
    const [result] = await db.query('DELETE FROM companies WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
};