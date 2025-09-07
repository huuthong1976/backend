// server/services/userService.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

// ... các hàm khác

const createUser = async (userData) => {
    const {
        full_name,
        employee_code,
        email,
        password,
        company_id,
        position_id,
        start_date,
    } = userData;

    // 1. Mã hóa mật khẩu
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 2. Chèn vào cơ sở dữ liệu
    const sql = `
        INSERT INTO employees 
        (full_name, employee_code, email, password_hash, company_id, position_id, start_date, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Đang làm việc')
    `;

    const [result] = await db.query(sql, [
        full_name,
        employee_code,
        email,
        password_hash, // Lưu mật khẩu đã mã hóa
        company_id,
        position_id,
        start_date,
    ]);
    
    // Trả về thông tin user vừa tạo (không bao gồm mật khẩu)
    const [newUser] = await db.query('SELECT id, email, full_name FROM employees WHERE id = ?', [result.insertId]);
    return newUser[0];
};

module.exports = {
    // ... các hàm khác
    createUser,
};