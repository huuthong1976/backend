const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
// Import cả hai hàm từ middleware
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const employeeCtrl = require('../controllers/employeeController');

// Tất cả các route trong file này đều yêu cầu phải đăng nhập
router.use(verifyToken);
router.get('/profile', verifyToken, employeeCtrl.getMyProfile);
router.put('/profile', verifyToken, employeeCtrl.updateMyProfile);

router.get('/data-for-form', employeeController.getDataForForm);
// API lấy danh sách nhân viên: Ai cũng có thể xem (sau khi đăng nhập)
router.get('/', employeeController.listEmployees);
//router.get('/:id', employeeController.getEmployeeById);
// API xem chi tiết nhân viên: Ai cũng có thể xem

router.get('/:id', employeeController.getEmployee);

// API tạo mới nhân viên: Chỉ Admin và Manager được phép
router.post('/', authorizeRoles(['admin', 'manager']), employeeController.createEmployee);

// API cập nhật nhân viên: Chỉ Admin và Manager được phép
router.put('/:id', authorizeRoles(['admin', 'manager']), employeeController.updateEmployee);
// API để nhân viên tự cập nhật profile



// API xóa nhân viên: Chỉ Admin được phép
router.delete('/:id', authorizeRoles(['admin']), employeeController.deleteEmployee);

module.exports = router;