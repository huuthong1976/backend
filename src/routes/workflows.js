/**
 * FILE: kpi-backend/routes/workflows.js
 * MỤC ĐÍCH:
 * - Đây là phiên bản hoàn chỉnh và chính xác nhất cho module Luồng Phê duyệt.
 * - Xử lý logic cho việc tạo đề xuất và luồng phê duyệt đa cấp.
 * - Tích hợp gửi thông báo tự động trong quy trình.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
//const { createNotification } = require('../helpers/notificationHelper');

// @route   POST /api/workflows/proposals
// @desc    Tạo một đề xuất kinh phí mới và khởi tạo luồng duyệt
// @access  Private (All authenticated users)
router.post('/proposals', protect, async (req, res) => {
    const { title, amount, reason, project_id } = req.body;
    const proposer_id = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lấy thông tin người đề xuất và quản lý trực tiếp của họ
        const [user] = await connection.query('SELECT manager_id, company_id FROM employees WHERE id = ?', [proposer_id]);
        if (user.length === 0) {
            throw new Error('Không tìm thấy thông tin người dùng.');
        }
        const manager_id = user[0].manager_id;
        const company_id = user[0].company_id;

        // 2. Định nghĩa luồng phê duyệt (workflow)
        // Ví dụ: QLTT -> Kế toán -> TGĐ. Luồng này có thể được tùy chỉnh phức tạp hơn.
        const [accountant] = await connection.query("SELECT id FROM employees WHERE role = 'KeToan' LIMIT 1");
        const [ceo] = await connection.query("SELECT id FROM employees WHERE role = 'TongGiamDoc' LIMIT 1");
        
        const workflow = [manager_id, accountant?.[0]?.id, ceo?.[0]?.id].filter(Boolean); // Lọc ra các giá trị null/undefined
        const workflow_json = JSON.stringify(workflow);
        const current_approver_id = workflow[0] || null; // Người duyệt đầu tiên

        // 3. Tạo đề xuất
        const [result] = await connection.query(
            `INSERT INTO expense_proposals 
            (proposer_id, company_id, project_id, title, amount, reason, status, workflow_json, current_approver_id) 
            VALUES (?, ?, ?, ?, ?, ?, 'Chờ duyệt', ?, ?)`,
            [proposer_id, company_id, project_id || null, title, amount, reason, workflow_json, current_approver_id]
        );

        // 4. Gửi thông báo cho người duyệt đầu tiên
        if (current_approver_id) {
            await createNotification(current_approver_id, `Bạn có một đề xuất mới "${title}" cần phê duyệt.`, '/inbox');
        }

        await connection.commit();
        res.status(201).json({ id: result.insertId, msg: 'Tạo đề xuất thành công!' });

    } catch (err) {
        await connection.rollback();
        console.error("Lỗi tại /api/workflows/proposals:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// @route   GET /api/workflows/inbox
// @desc    Lấy danh sách các đề xuất đang chờ người dùng hiện tại duyệt
// @access  Private
router.get('/inbox', protect, async (req, res) => {
    const approver_id = req.user.id;
    try {
        const query = `
            SELECT p.*, e.full_name as proposer_name 
            FROM expense_proposals p
            JOIN employees e ON p.proposer_id = e.id
            WHERE p.current_approver_id = ? AND p.status = 'Chờ duyệt'
            ORDER BY p.id DESC
        `;
        const [proposals] = await db.query(query, [approver_id]);
        res.json(proposals);
    } catch (err) {
        console.error("Lỗi tại /api/workflows/inbox:", err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/workflows/proposals/:id/action
// @desc    Thực hiện hành động duyệt hoặc từ chối một đề xuất
// @access  Private
router.post('/proposals/:id/action', protect, async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'approve' or 'reject'
    const approver_id = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lấy đề xuất và kiểm tra quyền
        const [proposalRes] = await connection.query('SELECT * FROM expense_proposals WHERE id = ?', [id]);
        if (proposalRes.length === 0 || proposalRes[0].current_approver_id !== approver_id) {
            return res.status(403).json({ msg: 'Bạn không có quyền thực hiện hành động này hoặc đề xuất đã được xử lý.' });
        }
        const proposal = proposalRes[0];

        // 2. Xử lý hành động
        if (action === 'reject') {
            await connection.query(
                "UPDATE expense_proposals SET status = 'Từ chối', current_approver_id = NULL, approver_id = ?, approved_at = NOW() WHERE id = ?",
                [approver_id, id]
            );
            // Gửi thông báo cho người đề xuất
            await createNotification(proposal.proposer_id, `Đề xuất "${proposal.title}" của bạn đã bị từ chối.`, '/my-proposals'); // Giả sử có trang này
        } else if (action === 'approve') {
            const workflow = JSON.parse(proposal.workflow_json);
            const currentIndex = workflow.indexOf(approver_id);
            const nextApproverId = (currentIndex < workflow.length - 1) ? workflow[currentIndex + 1] : null;

            if (nextApproverId) {
                // Chuyển cho người duyệt tiếp theo
                await connection.query(
                    "UPDATE expense_proposals SET current_approver_id = ? WHERE id = ?",
                    [nextApproverId, id]
                );
                // Gửi thông báo cho người duyệt tiếp theo
                await createNotification(nextApproverId, `Bạn có một đề xuất mới "${proposal.title}" cần phê duyệt.`, '/inbox');
            } else {
                // Phê duyệt cuối cùng
                await connection.query(
                    "UPDATE expense_proposals SET status = 'Đã duyệt', current_approver_id = NULL, approver_id = ?, approved_at = NOW() WHERE id = ?",
                    [approver_id, id]
                );
                // Gửi thông báo cho người đề xuất
                await createNotification(proposal.proposer_id, `Đề xuất "${proposal.title}" của bạn đã được duyệt thành công.`, '/my-proposals');
            }
        } else {
            return res.status(400).json({ msg: 'Hành động không hợp lệ.' });
        }
        
        await connection.commit();
        res.json({ msg: 'Xử lý đề xuất thành công.' });

    } catch (err) {
        await connection.rollback();
        console.error("Lỗi tại /api/workflows/proposals/:id/action:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
