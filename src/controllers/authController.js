// server/controllers/authController.js

const db = require('../models'); // Import Sequelize models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
/**
 * Xử lý đăng nhập của người dùng
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
        }

        const user = await authService.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
        }

        const isPasswordMatch = await authService.comparePassword(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
        }

        const tokens = authService.generateTokens(user);

        res.status(200).json({ 
            message: 'Đăng nhập thành công!',
            user: { id: user.id, fullName: user.full_name, role: user.role },
            ...tokens 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ.' });
    }
};
const getMe = async (req, res) => {
    // Thông tin user đã được middleware verifyToken giải mã và gắn vào req.user
    // Chúng ta chỉ cần trả về thông tin đó.
    // Thường thì sẽ không muốn trả về các thông tin nhạy cảm.
    const { id, role, company_id } = req.user;
    res.status(200).json({ id, role, company_id });
};
const getCurrentUser = async (req, res) => {
    // The verifyToken middleware already attached the user to the request.
    // We just need to fetch their full profile and send it back.
    try {
        // req.user.employee_id comes from the decoded token
        const userProfile = await db.Employee.findByPk(req.user.employee_id);
        if (!userProfile) {
            return res.status(404).json({ error: "User profile not found." });
        }
        res.status(200).json(userProfile);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};
// Đừng quên export hàm để router có thể sử dụng
module.exports = {
    login,
    getMe,
    getCurrentUser,
};