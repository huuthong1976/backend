/* =================================================================== */
/* FILE: kpi-backend/routes/perspectives.js (Tạo file mới)             */
/* =================================================================== */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/perspectives/weights
// @desc    Lấy tỷ trọng các khía cạnh của một công ty trong một năm
router.get('/weights', [protect, authorize('Admin')], async (req, res) => {
    const { company_id, year } = req.query;
    try {
        // Lấy tỷ trọng đã được cấu hình, nếu chưa có thì trả về null
        const query = `
            SELECT p.id, p.perspective_code, p.name, w.weight 
            FROM bsc_perspectives p
            LEFT JOIN company_perspective_weights w ON p.id = w.perspective_id AND w.company_id = ? AND w.year = ?
            ORDER BY p.id;
        `;
        const [perspectives] = await db.query(query, [company_id, year]);
        res.json(perspectives);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   POST /api/perspectives/weights
// @desc    Lưu/Cập nhật tỷ trọng các khía cạnh cho một công ty
router.post('/weights', [protect, authorize('Admin')], async (req, res) => {
    const { company_id, year, weights } = req.body; // weights là một array [{perspective_id, weight}, ...]
    
    // Validate tổng tỷ trọng phải là 100
    const totalWeight = weights.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
    if (Math.round(totalWeight) !== 100) {
        return res.status(400).json({ msg: `Tổng tỷ trọng phải bằng 100%, hiện tại là ${totalWeight}%.` });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const item of weights) {
            // Sử dụng INSERT ... ON DUPLICATE KEY UPDATE để vừa tạo mới vừa cập nhật
            await connection.query(
                `INSERT INTO company_perspective_weights (company_id, year, perspective_id, weight)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE weight = VALUES(weight)`,
                [company_id, year, item.perspective_id, item.weight]
            );
        }
        await connection.commit();
        res.json({ msg: 'Cập nhật tỷ trọng thành công!' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;