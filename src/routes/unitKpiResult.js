// server/routes/unitKpiResult.js
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/unitKpiResultController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken, authorizeRoles(['admin', 'manager']));

router.get('/:companyId/:year/:month', resultController.getResults);
router.post('/', resultController.saveResults);

module.exports = router;