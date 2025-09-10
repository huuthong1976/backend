// server/routes/departments.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Tất cả các route đều yêu cầu đăng nhập
router.use(protect);

// Lấy danh sách phòng ban
router.get('/', departmentController.listDepartments);

// Tạo mới phòng ban (chỉ Admin và Manager)
router.post('/', authorizeRoles(['Admin', 'TruongDonVi']), departmentController.createDepartment);

// Cập nhật phòng ban (chỉ Admin và Manager)
router.put('/:id', authorizeRoles(['Admin', 'TruongDonVi']), departmentController.updateDepartment);

// Xóa phòng ban (chỉ Admin)
router.delete('/:id', authorizeRoles(['Admin']), departmentController.deleteDepartment);

module.exports = router;