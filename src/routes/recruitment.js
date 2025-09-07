const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

// --- Cấu hình Multer cho việc tải CV ---
const cvStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/cvs')),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cv-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadCv = multer({ storage: cvStorage });

// --- JOB POSTING APIs ---
router.post('/jobs', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { title, department_id, description, requirements, quantity } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO job_postings (title, department_id, description, requirements, quantity, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [title, department_id, description, requirements, quantity, req.user.id]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/jobs', protect, async (req, res) => {
    try {
        const [jobs] = await db.query('SELECT j.*, d.department_name FROM job_postings j LEFT JOIN departments d ON j.department_id = d.id ORDER BY j.id DESC');
        res.json(jobs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CANDIDATE APIs ---
router.post('/jobs/:jobId/candidates', protect, uploadCv.single('cv'), async (req, res) => {
    const { jobId } = req.params;
    const { full_name, email, phone, notes } = req.body;
    if (!req.file) return res.status(400).json({ msg: 'Vui lòng tải lên CV.' });
    const cv_path = req.file.path;
    try {
        const [result] = await db.query(
            'INSERT INTO candidates (job_posting_id, full_name, email, phone, cv_path, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [jobId, full_name, email, phone, cv_path, notes]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/jobs/:jobId/candidates', protect, async (req, res) => {
    try {
        const [candidates] = await db.query('SELECT * FROM candidates WHERE job_posting_id = ?', [req.params.jobId]);
        res.json(candidates);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/candidates/:candidateId/status', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    try {
        await db.query('UPDATE candidates SET status = ? WHERE id = ?', [req.body.status, req.params.candidateId]);
        res.json({ msg: 'Cập nhật trạng thái ứng viên thành công.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- HIRE ACTION API (INTEGRATION) ---
router.post('/candidates/:candidateId/hire', [protect, authorize('Admin', 'TruongDonVi')], async (req, res) => {
    const { candidateId } = req.params;
    const { employee_code, username, password, department_id, position_id, start_date } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lấy thông tin ứng viên
        const [candidateRes] = await connection.query('SELECT * FROM candidates WHERE id = ?', [candidateId]);
        if (candidateRes.length === 0) throw new Error('Không tìm thấy ứng viên');
        const candidate = candidateRes[0];

        // 2. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. Tạo nhân viên mới
        const [empResult] = await connection.query(
            `INSERT INTO employees (employee_code, full_name, email, phone, department_id, position_id, start_date, username, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NhanVien', 'Đang làm việc')`,
            [employee_code, candidate.full_name, candidate.email, candidate.phone, department_id, position_id, start_date, username, password_hash]
        );

        // 4. Cập nhật trạng thái ứng viên
        await connection.query("UPDATE candidates SET status = 'Nhận việc' WHERE id = ?", [candidateId]);

        await connection.commit();
        res.status(201).json({ msg: 'Tuyển dụng thành công! Hồ sơ nhân viên đã được tạo.', newEmployeeId: empResult.insertId });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;

