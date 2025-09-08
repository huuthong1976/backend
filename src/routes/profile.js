const router = require('express').Router();
const { protect } = require('./middleware_auth');
const db = require('../config/db');

/**
 * GET /api/users/my-profile
 * Trả thông tin hồ sơ từ bảng employees (không dùng bảng users).
 * Ưu tiên tìm theo employees.id từ token; nếu không có thì dùng employees.user_id.
 */
router.get('/my-profile', protect, async (req, res) => {
  try {
    const employeeId = req.user?.employeeId || req.user?.id || null; // token chứa id = employeeId
    const userId     = req.user?.userId || null;                      // nếu token cũ chứa userId

    if (!employeeId && !userId) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    // Chỉ đọc employees; join tên phòng ban/công ty để hiển thị (đổi cột nếu schema khác)
    let sql = `
      SELECT
        e.id                AS employeeId,
        e.employee_code     AS employeeCode,
        e.full_name         AS fullName,
        e.email             AS email,
        e.phone             AS phone,
        e.position          AS position,
        e.department_id     AS departmentId,
        d.name              AS departmentName,
        e.company_id        AS companyId,
        c.name              AS companyName
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN companies   c ON c.id = e.company_id
      WHERE $$WHERE$$
      LIMIT 1
    `;

    let where, param;
    if (employeeId) {
      where = 'e.id = ?';
      param = [employeeId];
    } else {
      where = 'e.user_id = ?';          // chỉ dùng để tìm employee tương ứng; không lấy dữ liệu từ bảng users
      param = [userId];
    }
    sql = sql.replace('$$WHERE$$', where);

    const [rows] = await db.query(sql, param);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    return res.json(rows[0]);
  } catch (e) {
    console.error('MY_PROFILE_ERR:', e.message, e.stack);
    // Trả cấu trúc ổn định để FE không vỡ màn hình
    return res.status(200).json({
      employeeId: null,
      employeeCode: null,
      fullName: null,
      email: null,
      phone: null,
      position: null,
      departmentId: null,
      departmentName: null,
      companyId: null,
      companyName: null,
    });
  }
});

module.exports = router;
