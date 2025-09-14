const express = require('express');
const router = express.Router();
const timekeepingController = require('../controllers/timekeepingController');
const { protect, authorizeRoles } = require('../middleware/auth'); // Middleware xác thực và phân quyền

// Áp dụng middleware xác thực cho tất cả các route bên dưới
router.use(protect);

// Route cho nghiệp vụ chấm công cá nhân
router.get('/me', protect, (req,res)=>res.status(200).json({ id: req.user && req.user.id, ok: true }));
router.get('/my-timesheet',protect, timekeepingController.getMyTimesheet);
router.post('/checkin', timekeepingController.checkIn);
router.put('/checkout/:id', timekeepingController.checkOut);

// Route cho nghiệp vụ quản lý (chỉ Admin và TGĐ)
router.get(
    '/all-timesheets', 
    authorizeRoles('Admin', 'TongGiamDoc'), // Chỉ các vai trò này được truy cập
    timekeepingController.getAllTimesheets
);
router.get(
      '/unit-timesheets',
      authorizeRoles('Admin', 'TongGiamDoc', 'TruongDonVi'),
      timekeepingController.getUnitTimesheets
    );
module.exports = router;