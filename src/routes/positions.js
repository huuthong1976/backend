// server/routes/positions.js
const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');
const {authorizeRoles } = require('../middleware/auth');

// GET /api/positions - Lấy tất cả chức vụ
router.get('/', positionController.listPositions);

// POST /api/positions - Tạo chức vụ mới
router.post('/', [authorizeRoles('Admin')], positionController.createPosition);

// PUT /api/positions/:id - Cập nhật chức vụ
router.put('/:id', [authorizeRoles('Admin')], positionController.updatePosition);

// DELETE /api/positions/:id - Xóa chức vụ
router.delete('/:id', [authorizeRoles('Admin')], positionController.deletePosition);

module.exports = router;