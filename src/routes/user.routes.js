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
const { protect,authorizeRoles } = require('../middleware/auth');

// Helper query promise
async function queryAsync(sql, params = []) {
  if (!pool) throw new Error('DB pool is not configured');
  return pool.query(sql, params); // mysql2/promise -> trả Promise
}

// GET /api/users/me
router.get('/me', protect, employeeController.getMe);

// LẤY HỒ SƠ + DANH MỤC (company/department/position)
router.get('/my-profile', protect, employeeController.getMyProfile);

// CHỈ LẤY DANH MỤC (phục vụ form)
router.get('/form-data', protect, employeeController.getDataForForm);


// CẬP NHẬT HỒ SƠ CỦA CHÍNH NGƯỜI DÙNG
router.put('/profile', protect, employeeController.updateMyProfile);

module.exports = router;
