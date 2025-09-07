// server/routes/monthlyAllocationRoutes.js
const express = require('express');
const router = express.Router();
const monthlyAllocationController = require('../controllers/monthlyAllocationController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken);
router.post('/', authorizeRoles(['admin', 'manager']), monthlyAllocationController.allocateMonthlyTargets);

module.exports = router;