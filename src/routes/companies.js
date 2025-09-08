// server/routes/companies.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { protect } = require('./middleware_auth');
const db = require('../config/db'); 
// Áp dụng middleware xác thực cho tất cả các route trong file này
router.use(verifyToken);

// === ĐỊNH NGHĨA CÁC ROUTE ===
router.get('/', protect, async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT id, company_name FROM companies ORDER BY company_name'
      );
      res.json(rows);
    } catch (e) {
      console.error('GET /companies error:', e);
      res.status(500).json({ message: 'Failed to load companies' });
    }
  });
// Lấy danh sách công ty (logic phân quyền sẽ nằm trong controller)
router.get('/', companyController.listCompanies);
//router.get('/', verifyToken, companyController.list); 
// Lấy chi tiết một công ty (chỉ Admin và Manager)
router.get('/:id', authorizeRoles(['Admin', 'TruongDonVi','TongGiamDoc', 'KeToan']), companyController.getCompany);

// Tạo mới công ty (chỉ Admin)
router.post('/', authorizeRoles(['Admin']), companyController.createCompany);

// Cập nhật công ty (chỉ Admin)
router.put('/:id', authorizeRoles(['Admin']), companyController.updateCompany);

// Xóa công ty (chỉ Admin)
router.delete('/:id', authorizeRoles(['Admin']), companyController.deleteCompany);

module.exports = router;