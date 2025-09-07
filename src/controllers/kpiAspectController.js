// server/controllers/kpiAspectController.js
const kpiAspectService = require('../services/kpiAspectService');

// server/controllers/kpiAspectsController.js
const db = require('../config/db'); // đảm bảo module này có db.query(sql, params)

async function listPerspectives(_req, res, next) {
    try {
      const [rows] = await db.query(
        `SELECT id, perspective_code, name
           FROM bsc_perspectives
           ORDER BY id ASC`
      );
      res.json(rows);
    } catch (e) { next(e); }
  }
  
  async function getPerspectiveWeights(req, res, next) {
    try {
      const companyId = Number(req.query.company_id);
      const year = Number(req.query.year);
      if (!companyId || !year) {
        return res.status(400).json({ error: 'Thiếu company_id hoặc year' });
      }
      const [rows] = await db.query(
        `SELECT perspective_id, weight_percentage
           FROM bsc_weights
          WHERE company_id = ? AND year = ?
          ORDER BY perspective_id`,
        [companyId, year]
      );
      res.json(rows);
    } catch (e) { next(e); }
  }
  
  async function savePerspectiveWeights(req, res, next) {
    const conn = db.getConnection ? await db.getConnection() : db;
    try {
      const { company_id, year, weights } = req.body || {};
      const companyId = Number(company_id);
      const yr = Number(year);
      if (!companyId || !yr || !Array.isArray(weights)) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }
  
      if (conn.beginTransaction) await conn.beginTransaction();
  
      await conn.query(
        `DELETE FROM bsc_weights WHERE company_id = ? AND year = ?`,
        [companyId, yr]
      );
  
      if (weights.length) {
        const vals = weights.map(w => [
          companyId,
          yr,
          Number(w.perspective_id),
          Number(w.weight_percentage || 0),
        ]);
        await conn.query(
          `INSERT INTO bsc_weights
             (company_id, year, perspective_id, weight_percentage)
           VALUES ?`,
          [vals]
        );
      }
  
      if (conn.commit) await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      if (conn.rollback) await conn.rollback();
      next(e);
    } finally {
      if (conn.release) conn.release();
    }
  }
  
  module.exports = {
    listPerspectives,
    getPerspectiveWeights,
    savePerspectiveWeights,
  };