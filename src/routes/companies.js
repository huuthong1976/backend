// server/routes/companies.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, authorizeRoles } = require('../../src/middleware/auth');

// Áp dụng xác thực cho toàn bộ route
router.use(protect);

// Lấy danh sách công ty (đảm bảo controller có hàm này)
router.get('/', companyController.listCompanies); // hoặc companyController.list / .summary

// Lấy chi tiết 1 công ty (Admin + Trưởng đơn vị)
router.get('/:id', authorizeRoles(['Admin', 'TruongDonVi']), companyController.getCompany);

// Tạo mới (Admin)
router.post('/', authorizeRoles(['Admin']), companyController.createCompany);

// Cập nhật (Admin)
router.put('/:id', authorizeRoles(['Admin']), companyController.updateCompany);

// Xoá (Admin)
router.delete('/:id', authorizeRoles(['Admin']), companyController.deleteCompany);

module.exports = router;
