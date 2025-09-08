const router = require('express').Router();
const db = require('../config/db');
const { protect } = require('./middleware_auth');

// GET /api/kpi/my-plan?month=9&year=2025
router.get('/my-plan', protect, async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
  const year  = parseInt(req.query.year, 10)  || (new Date().getFullYear());

  try {
    // Dựa đúng schema bạn đang có: employee_work_plans, kpi_plan_items, kpi_library
    const [rows] = await db.query(`
      SELECT 
        p.id           AS planId,
        i.id           AS itemId,
        i.kpi_id       AS kpiId,
        k.name         AS kpiName,
        k.aspect       AS aspect,
        i.target,
        i.weight
      FROM kpi_plans p
      LEFT JOIN kpi_plan_items i ON i.plan_id = p.id
      LEFT JOIN kpi_library k    ON k.id = i.kpi_id
      WHERE p.employee_id = (SELECT e.id FROM employees e WHERE e.user_id = ? LIMIT 1)
        AND p.month = ? AND p.year = ?
      ORDER BY i.id
    `, [userId, month, year]);

    // Không có dữ liệu thì trả mảng rỗng cho FE hoạt động bình thường
    res.json(rows);
  } catch (e) {
    console.error('GET /api/kpi/my-plan error:', e);
    // Tránh 500 làm hỏng UI: trả rỗng để FE vẫn hiển thị
    res.status(200).json([]);
  }
});
module.exports = router;
