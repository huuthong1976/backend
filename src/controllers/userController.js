// server/controllers/userController.js
const userService = require('../services/userService');

// ... các hàm khác

exports.createUserByAdmin = async (req, res) => {
    try {
        // req.body chứa toàn bộ dữ liệu từ form frontend gửi lên
        const newUser = await userService.createUser(req.body);
        res.status(201).json({ message: 'Tạo người dùng thành công!', user: newUser });
    } catch (error) {
        // Bắt lỗi email/mã nhân viên trùng lặp
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email hoặc Mã nhân viên đã tồn tại.' });
        }
        res.status(500).json({ error: 'Lỗi server khi tạo người dùng.' });
    }
};