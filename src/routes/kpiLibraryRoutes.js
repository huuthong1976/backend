// src/routes/kpiLibraryRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/kpiLibraryController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// yêu cầu đăng nhập cho tất cả API KPI-Library
router.use(protect);

// healthcheck
router.get('/health', (_req, res) => res.json({ ok: true }));

// dữ liệu cây & phẳng
router.get('/tree', ctrl.getKpiLibraryTree);
router.get('/flat', ctrl.getKpiLibrary);

// export/import (đặt trước /:id để an toàn về matching)
router.get('/export', ctrl.exportKpis);
router.post('/import', upload.single('file'), ctrl.importKpis);

// CRUD KPI
router.post('/', ctrl.createKpi);
router.put('/:id', ctrl.updateKpi);
router.delete('/:id', ctrl.deleteKpi);

module.exports = router;
