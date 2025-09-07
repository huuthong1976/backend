const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/bi/salary-vs-performance
// @desc    Phân tích Chi phí lương vs. Hiệu suất KPI theo từng đơn vị
// @access  Admin, TongGiamDoc
router.get('/salary-vs-performance', [protect, authorize('Admin', 'TongGiamDoc')], async (req, res) => {
    const { year, month } = req.query;
    try {
        const query = `
            SELECT 
                c.company_name AS name,
                SUM(s.final_salary) AS total_salary,
                AVG(ekm.final_score) AS average_kpi_score
            FROM employee_salary s
            JOIN employees e ON s.employee_id = e.id
            JOIN departments d ON e.department_id = d.id
            JOIN companies c ON d.company_id = c.id
            LEFT JOIN employee_kpi_monthly ekm ON e.id = ekm.employee_id AND s.year = ekm.year AND s.month = ekm.month AND ekm.status = 'Hoàn thành'
            WHERE s.year = ? AND s.month = ?
            GROUP BY c.id, c.company_name
            ORDER BY total_salary DESC;
        `;
        const [rows] = await db.query(query, [year, month]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi phân tích lương và hiệu suất.' });
    }
});

// @route   GET /api/bi/project-costs
// @desc    Phân tích chi phí thực tế (từ đề xuất đã duyệt) theo từng dự án
// @access  Admin, TongGiamDoc
router.get('/project-costs', [protect, authorize('Admin', 'TongGiamDoc')], async (req, res) => {
    try {
        // Yêu cầu đã thêm cột project_id vào bảng expense_proposals
        const query = `
            SELECT 
                p.project_name AS name,
                SUM(ex.amount) AS total_expense
            FROM expense_proposals ex
            JOIN projects p ON ex.project_id = p.id
            WHERE ex.status = 'Đã duyệt'
            GROUP BY p.id, p.project_name
            ORDER BY total_expense DESC;
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi phân tích chi phí dự án.' });
    }
});

// @route   GET /api/bi/work-hours-vs-performance
// @desc    Phân tích mối quan hệ giữa giờ làm và hiệu suất theo từng phòng ban
// @access  Admin, TongGiamDoc
router.get('/work-hours-vs-performance', [protect, authorize('Admin', 'TongGiamDoc')], async (req, res) => {
    const { year, month } = req.query;
    try {
        const query = `
            WITH DepartmentHours AS (
                SELECT d.id as department_id, d.department_name, AVG(t.work_hours) as avg_work_hours
                FROM timesheets t
                JOIN employees e ON t.employee_id = e.id
                JOIN departments d ON e.department_id = d.id
                WHERE YEAR(t.work_date) = ? AND MONTH(t.work_date) = ?
                GROUP BY d.id, d.department_name
            ),
            DepartmentKPI AS (
                SELECT d.id as department_id, AVG(ekm.final_score) as avg_kpi_score
                FROM employee_kpi_monthly ekm
                JOIN employees e ON ekm.employee_id = e.id
                JOIN departments d ON e.department_id = d.id
                WHERE ekm.year = ? AND ekm.month = ? AND ekm.status = 'Hoàn thành'
                GROUP BY d.id
            )
            SELECT 
                dh.department_name as name,
                dh.avg_work_hours,
                dk.avg_kpi_score
            FROM DepartmentHours dh
            LEFT JOIN DepartmentKPI dk ON dh.department_id = dk.department_id;
        `;
        const [rows] = await db.query(query, [year, month, year, month]);
        res.json(rows.filter(r => r.avg_work_hours && r.avg_kpi_score));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi phân tích giờ làm và hiệu suất.' });
    }
});

module.exports = router;
