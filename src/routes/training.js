const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// --- COURSE MANAGEMENT APIs ---

// @route   POST /api/training/courses
// @desc    Tạo một khóa học mới
// @access  Admin, TruongDonVi
router.post('/courses', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { course_code, course_name, description, type, duration_hours, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO courses (course_code, course_name, description, type, duration_hours, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [course_code, course_name, description, type, duration_hours, status, req.user.id]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   GET /api/training/courses
// @desc    Lấy danh sách tất cả khóa học
// @access  Private
router.get('/courses', protect, async (req, res) => {
    try {
        const [courses] = await db.query('SELECT c.*, e.full_name as creator_name FROM courses c JOIN employees e ON c.created_by = e.id ORDER BY c.id DESC');
        res.json(courses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- ENROLLMENT APIs ---

// @route   POST /api/training/enrollments
// @desc    Nhân viên đăng ký một khóa học
// @access  Private
router.post('/enrollments', protect, async (req, res) => {
    const { course_id } = req.body;
    const employee_id = req.user.id;
    try {
        const [result] = await db.query(
            'INSERT INTO employee_enrollments (employee_id, course_id) VALUES (?, ?)',
            [employee_id, course_id]
        );
        res.status(201).json({ id: result.insertId, msg: 'Đăng ký khóa học thành công!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Bạn đã đăng ký khóa học này rồi.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/training/my-enrollments
// @desc    Lấy lịch sử học tập của cá nhân
// @access  Private
router.get('/my-enrollments', protect, async (req, res) => {
    try {
        const query = `
            SELECT en.*, c.course_name, c.type, c.duration_hours 
            FROM employee_enrollments en
            JOIN courses c ON en.course_id = c.id
            WHERE en.employee_id = ?
            ORDER BY en.enrollment_date DESC
        `;
        const [enrollments] = await db.query(query, [req.user.id]);
        res.json(enrollments);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   PUT /api/training/enrollments/:id
// @desc    Quản lý cập nhật kết quả học tập của nhân viên
// @access  Admin, TruongDonVi
router.put('/enrollments/:id', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { id } = req.params;
    const { status, result, manager_notes } = req.body;
    try {
        // TODO: Thêm logic kiểm tra người cập nhật có phải là quản lý của nhân viên không
        await db.query(
            'UPDATE employee_enrollments SET status = ?, result = ?, manager_notes = ? WHERE id = ?',
            [status, result, manager_notes, id]
        );
        res.json({ msg: 'Cập nhật kết quả đào tạo thành công.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;