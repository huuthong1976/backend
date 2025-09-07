/**
 * FILE: kpi-backend/routes/hrm.js
 * MỤC ĐÍCH:
 * - Phiên bản đã được sửa lỗi cú pháp và tối ưu hóa.
 * - Xử lý logic cho Hồ sơ nhân viên, Hợp đồng và Quyết định.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs

// --- Cấu hình Multer cho việc tải file hợp đồng/quyết định ---
// Mỗi loại file có thư mục riêng
const contractStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/contracts');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Tên file: employeeId-contractType-timestamp.ext
        const employeeId = req.params.employeeId;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, `${employeeId}-${uniqueSuffix}${fileExt}`);
    }
});
const decisionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/decisions');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Tên file: employeeId-decisionType-timestamp.ext
        const employeeId = req.params.employeeId;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, `${employeeId}-${uniqueSuffix}${fileExt}`);
    }
});

const uploadContract = multer({ storage: contractStorage });
const uploadDecision = multer({ storage: decisionStorage });


// @route   GET /api/hrm/employees/:id/profile
// @desc    Lấy hồ sơ đầy đủ của một nhân viên (bao gồm hợp đồng, quyết định)
router.get('/employees/:id/profile', protect, async (req, res) => {
    const { id } = req.params;
    try {
        // Lấy thông tin nhân viên với JOIN để có tên phòng ban, chức vụ, công ty
        const [employee] = await db.query(`
            SELECT 
                e.*, d.department_name, p.position_name, c.company_name, m.full_name as manager_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN companies c ON e.company_id = c.id
            LEFT JOIN employees m ON e.manager_id = m.id
            WHERE e.id = ?
        `, [id]);
        if (employee.length === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy nhân viên' });
        }

        const [contracts] = await db.query('SELECT * FROM employee_contracts WHERE employee_id = ? ORDER BY start_date DESC', [id]);
        const [decisions] = await db.query('SELECT * FROM employee_decisions WHERE employee_id = ? ORDER BY effective_date DESC', [id]);

        res.json({
            profile: employee[0],
            contracts,
            decisions
        });
    } catch (err) {
        console.error("Lỗi Server tại /api/hrm/employees/:id/profile:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// @route   POST /api/hrm/employees/:employeeId/contracts
// @desc    Tạo hợp đồng mới cho nhân viên
router.post(
    '/employees/:employeeId/contracts',
    [protect, authorize('Admin', 'KeToan'), uploadContract.single('contract_file')], // 'contract_file' là tên của field trong form
    async (req, res) => {
        const { employeeId } = req.params;
        const { contract_code, contract_type, start_date, end_date, salary_info_json } = req.body;
        const file_path = req.file ? `/uploads/contracts/${req.file.filename}` : null; // Đường dẫn URL

        try {
            const [result] = await db.query(
                `INSERT INTO employee_contracts (employee_id, contract_code, contract_type, start_date, end_date, salary_info_json, file_path, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Hiệu lực')`,
                [employeeId, contract_code, contract_type, start_date, end_date || null, salary_info_json, file_path]
            );
            res.status(201).json({ id: result.insertId, msg: 'Tạo hợp đồng thành công' });
        } catch (err) {
            if (req.file) fs.unlinkSync(req.file.path); // Xóa file đã upload nếu có lỗi DB
            console.error("Lỗi Server tại /api/hrm/employees/:employeeId/contracts:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);


// @route   POST /api/hrm/employees/:employeeId/decisions
// @desc    Tạo quyết định mới cho nhân viên
router.post(
    '/employees/:employeeId/decisions',
    [protect, authorize('Admin', 'KeToan'), uploadDecision.single('decision_file')], // 'decision_file' là tên của field trong form
    async (req, res) => {
        const { employeeId } = req.params;
        const { decision_code, decision_type, effective_date, content } = req.body;
        const file_path = req.file ? `/uploads/decisions/${req.file.filename}` : null; // Đường dẫn URL

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Thêm quyết định vào bảng
            await connection.query(
                `INSERT INTO employee_decisions (employee_id, decision_code, decision_type, effective_date, content, file_path) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [employeeId, decision_code, decision_type, effective_date, content, file_path]
            );

            // 2. Tích hợp: Nếu là quyết định "Thôi việc", cập nhật trạng thái nhân viên
            if (decision_type === 'Thôi việc') {
                await connection.query(
                    `UPDATE employees SET status = 'Đã nghỉ việc' WHERE id = ?`,
                    [employeeId]
                );
            }

            await connection.commit();
            res.status(201).json({ msg: 'Tạo quyết định thành công' });

        } catch (err) {
            await connection.rollback();
            if (req.file) fs.unlinkSync(req.file.path); // Xóa file đã upload nếu có lỗi DB
            console.error("Lỗi Server tại /api/hrm/employees/:employeeId/decisions:", err.message);
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    }
);

module.exports = router;