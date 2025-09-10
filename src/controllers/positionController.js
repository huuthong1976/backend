const { pool, getPool } = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;

/**
 * @desc    Get all positions using a direct SQL query
 * @route   GET /api/positions
 * @access  Private
 */
const listPositions = async (req, res) => {
    console.log("--- STARTING TEST: Fetching positions with raw SQL ---");
    try {
        // This line will now work because 'db' is defined
        const [positions] = await db.query('SELECT id, position_name FROM positions ORDER BY position_name ASC;');
        
        console.log("--- TEST SUCCESSFUL: Data from SQL:", positions);
        res.json(positions);

    } catch (error) {
        console.error('--- TEST FAILED: Error fetching positions with raw SQL:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
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