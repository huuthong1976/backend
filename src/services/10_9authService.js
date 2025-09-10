// server/services/authService.js
const { pool, getPool } = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool; 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Tìm người dùng bằng username hoặc email từ bảng EMPLOYEES.
 * @param {string} username - Tên đăng nhập hoặc email.
 * @returns {object|null} - Dữ liệu người dùng.
 */
async function findUserByUsername(username) {
    // SỬA LẠI: Truy vấn vào bảng 'employees' thay vì 'users'
    // Giả sử cột tên đăng nhập trong bảng employees là 'username' hoặc 'employee_code'
    // và cột mật khẩu là 'password_hash'
    const [rows] = await db.query('SELECT id, username, password_hash, role, employee_code FROM employees WHERE username = ? LIMIT 1',
    [username]
    );
    return rows && rows[0];
};

/**
 * So sánh mật khẩu nhập vào với mật khẩu đã băm trong database.
 * @param {string} password - Mật khẩu người dùng nhập.
 * @param {string} hashedPassword - Mật khẩu đã băm.
 * @returns {boolean} - true nếu mật khẩu khớp.
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Tạo ra một cặp Access Token và Refresh Token.
 * @param {object} employee - Đối tượng nhân viên chứa id, role, company_id.
 * @returns {object} - Chứa accessToken.
 */
const generateTokens = (employee) => {
    const payload = { id: employee.id, role: employee.role, company_id: employee.company_id };

    console.log('>>> BƯỚC 1: Payload chuẩn bị được ký:', payload); // Log chi tiết
    const accessToken = jwt.sign(
        { id: employee.id, role: employee.role, company_id: employee.company_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { accessToken };
};

module.exports = {
    findUserByUsername,
    comparePassword,
    generateTokens,
};