// server/routes/departments.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Tất cả các route đều yêu cầu đăng nhập
router.use(verifyToken);

// Lấy danh sách phòng ban
router.get('/', departmentController.listDepartments);

// Tạo mới phòng ban (chỉ Admin và Manager)
router.post('/', authorizeRoles(['admin', 'manager']), departmentController.createDepartment);

// Cập nhật phòng ban (chỉ Admin và Manager)
router.put('/:id', authorizeRoles(['admin', 'manager']), departmentController.updateDepartment);

// Xóa phòng ban (chỉ Admin)
router.delete('/:id', authorizeRoles(['admin']), departmentController.deleteDepartment);

module.exports = router;