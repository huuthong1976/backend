const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const employeeController = require('../controllers/employeeController'); // Gọi đến employee controller
const { getPool } = require('../db');
const { verifyToken } = require('../middleware/auth'); // Dùng middleware xác thực


// Endpoint để lấy thông tin người dùng hiện tại
router.get('/me', async (req, res) => {
    try {
        // Đây là một ví dụ đơn giản. Trong thực tế, bạn sẽ lấy thông tin người dùng
        // từ session, JWT token, hoặc một cơ chế xác thực khác.
        // Giả sử bạn có một user ID từ token hoặc session
        const userId = 1; // Thay thế bằng logic lấy user ID thực tế
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT id, role, company_id FROM employees WHERE id = ? LIMIT 1`,
            [userId]
        );

        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('GET /me error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// LẤY HỒ SƠ + DANH MỤC (company/department/position)
router.get('/my-profile', verifyToken, employeeController.getMyProfile);

// CHỈ LẤY DANH MỤC (phục vụ form)
router.get('/form-data', verifyToken, employeeController.getDataForForm);

// LẤY HỒ SƠ (employee object theo id trong token)
router.get('/profile', verifyToken, (req, res, next) => {
  if (req.user && req.user.employee_id) {
    req.params.id = req.user.employee_id;
    return employeeController.getEmployeeById(req, res, next);
  }
  return res.status(401).json({ error: 'Token không chứa thông tin nhân viên.' });
});

// CẬP NHẬT HỒ SƠ CỦA CHÍNH NGƯỜI DÙNG
router.put('/profile', verifyToken, employeeController.updateMyProfile);

module.exports = router;
