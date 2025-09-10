// server/routes/companies.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Áp dụng middleware xác thực cho tất cả các route trong file này
router.use(protect);

// === ĐỊNH NGHĨA CÁC ROUTE ===

// Lấy danh sách công ty (logic phân quyền sẽ nằm trong controller)
router.get('/', companyController.listCompanies);
//router.get('/', protect, companyController.list); 
// Lấy chi tiết một công ty (chỉ Admin và Manager)
router.get('/:id', authorizeRoles(['Admin', 'TruongDonVi']), companyController.getCompany);

// Tạo mới công ty (chỉ Admin)
router.post('/', authorizeRoles(['Admin']), companyController.createCompany);

// Cập nhật công ty (chỉ Admin)
router.put('/:id', authorizeRoles(['Admin']), companyController.updateCompany);

// Xóa công ty (chỉ Admin)
router.delete('/:id', authorizeRoles(['Admin']), companyController.deleteCompany);

module.exports = router;