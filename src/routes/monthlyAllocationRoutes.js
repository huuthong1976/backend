// server/routes/monthlyAllocationRoutes.js
const express = require('express');
const router = express.Router();
const monthlyAllocationController = require('../controllers/monthlyAllocationController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.post('/', authorizeRoles(['Admin', 'TruongDonVi']), monthlyAllocationController.allocateMonthlyTargets);

module.exports = router;