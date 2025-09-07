const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, name FROM units WHERE status='active' ORDER BY name`);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
