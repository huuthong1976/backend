const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// --- PROJECT CRUD APIs ---

// @route   POST /api/projects
// @desc    Tạo một dự án mới
// @access  Admin, TruongDonVi
router.post('/', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { project_name, project_code, description, start_date, end_date } = req.body;
    const manager_id = req.user.id; // Người tạo dự án là quản lý dự án

    try {
        const [result] = await db.query(
            'INSERT INTO projects (project_name, project_code, description, start_date, end_date, manager_id) VALUES (?, ?, ?, ?, ?, ?)',
            [project_name, project_code, description, start_date || null, end_date || null, manager_id]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/projects
// @desc    Lấy danh sách tất cả dự án
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const query = `
            SELECT p.*, e.full_name as manager_name 
            FROM projects p 
            LEFT JOIN employees e ON p.manager_id = e.id 
            ORDER BY p.id DESC
        `;
        const [projects] = await db.query(query);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/projects/:id
// @desc    Lấy chi tiết một dự án và các công việc của nó
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const [project] = await db.query('SELECT p.*, e.full_name as manager_name FROM projects p LEFT JOIN employees e ON p.manager_id = e.id WHERE p.id = ?', [req.params.id]);
        if (project.length === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy dự án' });
        }

        const taskQuery = `
            SELECT t.*, e.full_name as assignee_name 
            FROM tasks t 
            LEFT JOIN employees e ON t.assignee_id = e.id 
            WHERE t.project_id = ? 
            ORDER BY t.priority, t.due_date
        `;
        const [tasks] = await db.query(taskQuery, [req.params.id]);

        res.json({ project: project[0], tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- TASK CRUD APIs ---

// @route   POST /api/projects/:projectId/tasks
// @desc    Tạo công việc mới trong một dự án
// @access  Admin, TruongDonVi
router.post('/:projectId/tasks', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { projectId } = req.params;
    const { task_name, description, assignee_id, due_date, priority } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO tasks (project_id, task_name, description, assignee_id, due_date, priority) VALUES (?, ?, ?, ?, ?, ?)',
            [projectId, task_name, description, assignee_id || null, due_date || null, priority]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   PUT /api/tasks/:taskId/status
// @desc    Cập nhật trạng thái của một công việc
// @access  Private (Người được giao việc)
router.put('/:taskId/status', protect, async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body; // status: 'Cần làm', 'Đang làm', 'Hoàn thành'
    const userId = req.user.id;

    try {
        // Chỉ người được giao việc mới có quyền cập nhật
        const [result] = await db.query(
            'UPDATE tasks SET status = ? WHERE id = ? AND assignee_id = ?',
            [status, taskId, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(403).json({ msg: 'Bạn không có quyền cập nhật công việc này hoặc công việc không tồn tại.' });
        }
        res.json({ msg: 'Cập nhật trạng thái công việc thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;