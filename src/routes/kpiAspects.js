// server/routes/kpiAspects.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const kpiAspectsController = require('../controllers/kpiAspectController');

router.use(verifyToken);

router.get('/', kpiAspectsController.listPerspectives);
router.get('/weights', kpiAspectsController.getPerspectiveWeights);
router.post('/weights', kpiAspectsController.savePerspectiveWeights);

module.exports = router;
