const router = require('express').Router();
const db = require('../config/db');           // mysql2/promise pool
const { protect } = require('./middleware_auth');

router.get('/my-profile', protect, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

    const [rows] = await db.query(`
      SELECT 
        u.id, u.username, u.email, u.role,
        e.id AS employeeId,
        e.full_name AS fullName,
        e.position,
        e.department_id AS departmentId,
        e.company_id AS companyId
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);

    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/users/my-profile error:', e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

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