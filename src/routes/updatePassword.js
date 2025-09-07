// backend/updatePassword.js
const bcrypt = require('bcrypt');
const db = require('./config/db'); // Đảm bảo đường dẫn đến file db.js là đúng

const saltRounds = 10;

// Lấy username và password từ dòng lệnh
const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.error('Lỗi: Vui lòng cung cấp username và mật khẩu mới.');
    console.log('Ví dụ: node updatePassword.js admin admin@123');
    process.exit(1);
}

const updatePassword = async () => {
    try {
        // 1. Mã hóa mật khẩu mới
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        console.log(`Đang tạo mã hóa mới cho mật khẩu...`);

        // 2. Cập nhật vào cơ sở dữ liệu
        const [result] = await db.query(
            'UPDATE employees SET password_hash = ? WHERE username = ?',
            [newHash, username]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Cập nhật mật khẩu thành công cho người dùng: ${username}`);
        } else {
            console.error(`❌ Không tìm thấy người dùng có username: ${username}`);
        }
    } catch (err) {
        console.error('Đã có lỗi xảy ra:', err.message);
    } finally {
        // Đóng kết nối CSDL nếu cần
        if (db.end) db.end();
        process.exit(0);
    }
};

updatePassword();