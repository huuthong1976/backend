const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken);

// Hồ sơ của tôi
router.get('/profile', employeeController.getMyProfile);
router.put('/profile', employeeController.updateMyProfile);

// Dữ liệu cho form (companies/departments/positions/managers)
router.get('/data-for-form', employeeController.getDataForForm);

// Danh sách / chi tiết
router.get('/', employeeController.listEmployees);
router.get('/:id', employeeController.getEmployee);

// Ghi dữ liệu theo quyền thực tế
router.post('/', authorizeRoles(['Admin','TruongDonVi']), employeeController.createEmployee);
router.put('/:id', authorizeRoles(['Admin','TruongDonVi']), employeeController.updateEmployee);
router.delete('/:id', authorizeRoles(['Admin']), employeeController.deleteEmployee);

module.exports = router;
