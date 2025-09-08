// server/routes/companies.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Tất cả endpoints đều yêu cầu đăng nhập
router.use(verifyToken);

// Lấy danh sách công ty (tất cả user đã đăng nhập đều được xem)
router.get('/', companyController.listCompanies);

// Tùy quyền quản trị mới cho phép các thao tác ghi:
router.get('/:id', authorizeRoles(['Admin','TruongDonVi','TongGiamDoc','KeToan']), companyController.getCompany);
router.post('/', authorizeRoles(['Admin']), companyController.createCompany);
router.put('/:id', authorizeRoles(['Admin']), companyController.updateCompany);
router.delete('/:id', authorizeRoles(['Admin']), companyController.deleteCompany);

module.exports = router;
