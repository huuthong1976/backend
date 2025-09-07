// -----------------------------------------------------------------------------
// /api/planning-templates
// - GET /api/planning-templates                 -> danh sách template (meta)
// - GET /api/planning-templates/:key/resolve    -> trả về participants (employee_id[])
//   query: unit_id? department_id?
// -----------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // mysql2/promise pool

// Lấy danh sách template đang active
router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, \`key\`, label, title, \`type\`, duration_min, default_unit_id, default_room_id
       FROM planning_templates
       WHERE is_active=1
       ORDER BY label`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Resolve danh sách employee theo rule
router.get('/:key/resolve', async (req, res, next) => {
  const { key } = req.params;
  const unitId = req.query.unit_id ? Number(req.query.unit_id) : null;
  const deptId = req.query.department_id ? Number(req.query.department_id) : null;

  try {
    // 1) lấy template + rules
    const [[tpl]] = await pool.query(
      `SELECT id, \`key\`, label, title, \`type\`, duration_min
       FROM planning_templates WHERE \`key\`=? AND is_active=1`, [key]
    );
    if (!tpl) return res.json({ participants: [], meta: [] });

    const [rules] = await pool.query(
      `SELECT rule_type, target_ids FROM planning_template_rules
       WHERE template_id=?`, [tpl.id]
    );

    const participantIds = new Set();

    // helper query
    const queryIds = async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      rows.forEach(r => participantIds.add(r.id));
    };

    // 2) áp quy tắc từng loại
    for (const r of rules) {
      const arr = Array.isArray(r.target_ids) ? r.target_ids
                   : (r.target_ids ? JSON.parse(r.target_ids) : []);

      if (r.rule_type === 'by_employee') {
        arr.forEach(id => participantIds.add(Number(id)));
      }

      if (r.rule_type === 'by_role' && arr.length) {
        // theo chức vụ; nếu có unitId -> lọc trong đơn vị
        if (unitId) {
          await queryIds(
            `SELECT e.id
             FROM employees e
             WHERE e.position_id IN (${arr.map(()=>'?').join(',')})
               AND e.company_id = ?
               AND e.status = 'active'`,
            [...arr, unitId]
          );
        } else {
          await queryIds(
            `SELECT e.id
             FROM employees e
             WHERE e.position_id IN (${arr.map(()=>'?').join(',')})
               AND e.status = 'active'`,
            arr
          );
        }
      }

      if (r.rule_type === 'by_department' && arr.length) {
        await queryIds(
          `SELECT e.id
           FROM employees e
           WHERE e.department_id IN (${arr.map(()=>'?').join(',')})
             ${unitId ? 'AND e.company_id = ?' : ''}
             AND e.status = 'active'`,
          unitId ? [...arr, unitId] : arr
        );
      }

      if (r.rule_type === 'by_unit') {
        // toàn đơn vị: nếu không truyền -> không thêm gì
        if (unitId) {
          await queryIds(
            `SELECT e.id
             FROM employees e
             WHERE e.company_id = ?
               AND e.status = 'active'`,
            [unitId]
          );
        }
      }
    }

    res.json({ participants: Array.from(participantIds) });
  } catch (e) { next(e); }
});

module.exports = router;
