const express = require('express');
const router = express.Router();

// TODO: thay các handler thật của bạn
router.get('/', async (_req, res) => {
  res.json({ ok: true, route: 'kpi root' });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ ok: true, id });
});

module.exports = router;
