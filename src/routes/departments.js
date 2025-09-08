// server/routes/departments.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken);

// LIST (ai đăng nhập cũng xem được)
router.get('/', departmentController.listDepartments);

// CREATE/UPDATE: cho Admin & Trưởng đơn vị
router.post('/', authorizeRoles(['Admin','TruongDonVi']), departmentController.createDepartment);
router.put('/:id', authorizeRoles(['Admin','TruongDonVi']), departmentController.updateDepartment);

// DELETE: chỉ Admin
router.delete('/:id', authorizeRoles(['Admin']), departmentController.deleteDepartment);

module.exports = router;
