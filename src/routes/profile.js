const express = require('express');
const router = express.Router();

// Route để hiển thị trang hồ sơ của người dùng hiện tại
router.get('/', (req, res) => {
    // Logic để lấy thông tin người dùng đã đăng nhập
    // Ví dụ: const user = req.user;
    res.send('Đây là trang hồ sơ của bạn.');
});

// Route để hiển thị trang hồ sơ của một người dùng cụ thể bằng ID
router.get('/:id', (req, res) => {
    const userId = req.params.id;
    // Logic để lấy thông tin người dùng từ cơ sở dữ liệu bằng userId
    res.send(`Đây là trang hồ sơ của người dùng có ID: ${userId}`);
});

module.exports = router;