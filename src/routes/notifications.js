/* =================================================================== */
/* FILE: kpi-backend/routes/notifications.js (Tạo file mới)            */
/* =================================================================== */
/**
 * MỤC ĐÍCH:
 * - Cung cấp các API để lấy và quản lý thông báo cho người dùng.
 * - Đây là file còn thiếu gây ra lỗi 404 Not Found.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Lấy thông báo chưa đọc của người dùng
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Lấy 10 thông báo gần nhất
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [req.user.id]
        );
        
        // Đếm tổng số thông báo chưa đọc
        const [unreadCountResult] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = FALSE',
            [req.user.id]
        );

        res.json({
            notifications,
            unreadCount: unreadCountResult[0].count
        });
    } catch (err) {
        console.error("Lỗi tại /api/notifications:", err.message);
        res.status(500).json({ error: 'Lỗi Server' });
    }
});

// @route   POST /api/notifications/mark-as-read
// @desc    Đánh dấu thông báo là đã đọc
// @access  Private
router.post('/mark-as-read', protect, async (req, res) => {
    const { id } = req.body; // id có thể là một số (cho một thông báo) hoặc chuỗi 'all'
    try {
        if (id === 'all') {
            // Đánh dấu tất cả là đã đọc
            await db.query('UPDATE notifications SET read_status = TRUE WHERE user_id = ?', [req.user.id]);
        } else {
            // Chỉ đánh dấu một thông báo cụ thể
            await db.query('UPDATE notifications SET read_status = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
        }
        res.json({ msg: 'Đã đánh dấu là đã đọc.' });
    } catch (err) {
        console.error("Lỗi tại /api/notifications/mark-as-read:", err.message);
        res.status(500).json({ error: 'Lỗi Server' });
    }
});

module.exports = router;