// File: kpi-backend/resetAdminPassword.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetPassword = async () => {
    let connection;
    try {
        console.log('Đang kết nối tới cơ sở dữ liệu...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
        console.log('Kết nối thành công!');

        const newPassword = 'admin@123';
        const usernameToReset = 'admin';

        console.log(`Đang mã hóa mật khẩu mới: "${newPassword}"...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log('Mã hóa thành công! Hash:', hashedPassword);

        console.log(`Đang cập nhật mật khẩu cho người dùng: "${usernameToReset}"...`);
        const [result] = await connection.execute(
            'UPDATE employees SET password_hash = ? WHERE username = ?',
            [hashedPassword, usernameToReset]
        );

        if (result.affectedRows > 0) {
            console.log('\x1b[32m%s\x1b[0m', 'THÀNH CÔNG! Mật khẩu cho tài khoản "admin" đã được đặt lại thành "admin@123".');
            console.log('Vui lòng khởi động lại server chính và thử đăng nhập lại.');
        } else {
            console.log('\x1b[31m%s\x1b[0m', `LỖI: Không tìm thấy người dùng có username là "${usernameToReset}" trong cơ sở dữ liệu.`);
        }

    } catch (error) {
        console.error('Đã xảy ra lỗi trong quá trình đặt lại mật khẩu:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Đã đóng kết nối CSDL.');
        }
    }
};

resetPassword();
