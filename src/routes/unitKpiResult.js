// server/routes/unitKpiResult.js
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/unitKpiResultController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect, authorizeRoles(['Admin', 'TruongDonVi']));

router.get('/:companyId/:year/:month', resultController.getResults);
router.post('/', resultController.saveResults);

module.exports = router;