const express = require('express');
const router = express.Router();

// Dùng cấu hình chuẩn { pool, getPool } từ ../db
let pool = null;
try {
  const db = require('../db');
  pool = (typeof db.getPool === 'function') ? db.getPool() : db.pool;
} catch (e) {
  pool = null;
}

const employeeController = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');

// Helper query promise
async function queryAsync(sql, params = []) {
  if (!pool) throw new Error('DB pool is not configured');
  return pool.query(sql, params); // mysql2/promise -> trả Promise
}

// GET /api/users/me
router.get('/me', protect, async (req, res) => {
  try {
    const id = req.user?.employee_id ?? req.user?.id;
    if (!id) return res.status(401).json({ error: 'Token không hợp lệ (thiếu employee_id/id).' });

    if (!pool) {
      // Fallback khi chưa cấu hình DB
      return res.json({
        id,
        full_name: req.user?.full_name,
        email: req.user?.email,
        role: req.user?.role,
        company_id: req.user?.company_id,
        source: 'token',
      });
    }

    const [rows] = await queryAsync('SELECT id, role, company_id FROM employees WHERE id = ? LIMIT 1', [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ ...rows[0], source: 'db' });
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// LẤY HỒ SƠ + DANH MỤC (company/department/position)
router.get('/my-profile', protect, employeeController.getMyProfile);

// CHỈ LẤY DANH MỤC (phục vụ form)
router.get('/form-data', protect, employeeController.getDataForForm);

// LẤY HỒ SƠ (employee object theo id trong token)
router.get('/profile', protect, (req, res, next) => {
  if (req.user && (req.user.employee_id || req.user.id)) {
    req.params.id = req.user.employee_id ?? req.user.id;
    return employeeController.getEmployeeById(req, res, next);
  }
  return res.status(401).json({ error: 'Token không chứa thông tin nhân viên.' });
});

// CẬP NHẬT HỒ SƠ CỦA CHÍNH NGƯỜI DÙNG
router.put('/profile', protect, employeeController.updateMyProfile);

module.exports = router;
