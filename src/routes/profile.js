// server/routes/profile.js
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/db');

router.get('/my-profile', verifyToken, async (req, res) => {
  try {
    const employeeId = Number(req.user?.employee_id || req.user?.id);
    if (!employeeId) return res.status(401).json({ message: 'Unauthenticated' });

    const sql = `
      SELECT
        e.id              AS employeeId,
        e.employee_code   AS employeeCode,
        e.full_name       AS fullName,
        e.email,
        e.phone,
        e.gender,
        e.dob,
        e.avatar_url      AS avatarUrl,
        e.company_id      AS companyId,
        c.company_name    AS companyName,
        e.department_id   AS departmentId,
        d.department_name AS departmentName,
        e.position_id     AS positionId,
        e.start_date      AS startDate,
        e.status          AS employmentStatus
      FROM employees e
      LEFT JOIN companies   c ON c.id = e.company_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [employeeId]);
    if (!rows.length) return res.status(404).json({ message: 'Employee not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('MY_PROFILE_ERR:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
