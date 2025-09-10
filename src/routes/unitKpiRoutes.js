// server/routes/unitKpiRoutes.js
const express = require('express');
const router = express.Router();
const unitKpiController = require('../controllers/unitKpiController'); // Import controller
const { protect } = require('../middleware/auth');

router.use(protect);

// Đảm bảo hàm `getAnnualRegistrations` tồn tại trong unitKpiController
router.get('/registrations', unitKpiController.getAnnualRegistrations);

// Đảm bảo hàm `getMonthlyResults` tồn tại trong unitKpiController
router.get('/monthly-results', unitKpiController.getMonthlyResults);

// Đảm bảo hàm `saveMonthlyResults` tồn tại trong unitKpiController
router.post('/monthly-results', unitKpiController.saveMonthlyResults);

module.exports = router;