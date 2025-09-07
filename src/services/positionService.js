const db = require('../config/db');

// Lấy tất cả chức vụ
const getAll = async () => {
    const [positions] = await db.query('SELECT * FROM positions ORDER BY id DESC');
    return positions;
};

// Tạo chức vụ mới
const create = async (positionData) => {
    const { position_name } = positionData;
    const [result] = await db.query('INSERT INTO positions (position_name) VALUES (?)', [position_name]);
    const [newPosition] = await db.query('SELECT * FROM positions WHERE id = ?', [result.insertId]);
    return newPosition[0];
};

// Cập nhật chức vụ
const update = async (id, positionData) => {
    const { position_name } = positionData;
    const [result] = await db.query('UPDATE positions SET position_name = ? WHERE id = ?', [position_name, id]);
    return result.affectedRows;
};

// Xóa chức vụ
const remove = async (id) => {
    const [result] = await db.query('DELETE FROM positions WHERE id = ?', [id]);
    return result.affectedRows;
};

module.exports = {
    getAll,
    create,
    update,
    remove
};