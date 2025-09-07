// server/controllers/departmentController.js
const departmentService = require('../services/departmentService');

const listDepartments = async (req, res) => {
    try {
        const departments = await departmentService.getAll(req.user, req.query);
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách phòng ban.' });
    }
};

const createDepartment = async (req, res) => {
    try {
        if (!req.body.department_name || !req.body.company_id) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ tên và ID công ty.' });
        }
        const newDepartment = await departmentService.create(req.body);
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi tạo mới phòng ban.' });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const updated = await departmentService.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy phòng ban để cập nhật.' });
        }
        res.status(200).json({ success: true, message: 'Cập nhật phòng ban thành công.' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi cập nhật phòng ban.' });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        const deleted = await departmentService.remove(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Không tìm thấy phòng ban để xóa.' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi xóa phòng ban.' });
    }
};

module.exports = {
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};