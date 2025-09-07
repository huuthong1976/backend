// server/controllers/positionController.js
const positionService = require('../services/positionService');

// Lấy danh sách chức vụ
const listPositions = async (req, res) => {
    try {
        const positions = await positionService.getAll();
        res.json(positions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tạo chức vụ mới
const createPosition = async (req, res) => {
    const { position_name } = req.body;
    if (!position_name) {
        return res.status(400).json({ msg: 'Tên chức vụ là bắt buộc.' });
    }
    try {
        const newPosition = await positionService.create(req.body);
        res.status(201).json(newPosition);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Tên chức vụ đã tồn tại.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// Cập nhật chức vụ
const updatePosition = async (req, res) => {
    try {
        const affectedRows = await positionService.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy chức vụ.' });
        }
        res.json({ msg: 'Cập nhật thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Xóa chức vụ
const deletePosition = async (req, res) => {
    try {
        const affectedRows = await positionService.remove(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy chức vụ.' });
        }
        res.json({ msg: 'Xóa thành công.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ msg: 'Không thể xóa chức vụ này vì đã được sử dụng.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// Add this export block at the end of the file
module.exports = {
    listPositions,
    createPosition,
    updatePosition,
    deletePosition,
};