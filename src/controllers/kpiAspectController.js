// server/controllers/kpiAspectController.js
const kpiAspectService = require('../services/kpiAspectService');

/** GET /api/kpi-aspects
 *  Trả danh sách khía cạnh BSC (định nghĩa), luôn 200 + JSON
 */
async function getBscPerspectives(req, res, next) {
  try {
    const perspectives = await kpiAspectService.getBscPerspectives();
    return res.status(200).json(perspectives || []);
  } catch (e) {
    console.error('Error in getBscPerspectives:', e);
    return next(e);
  }
}

/** GET /api/kpi-aspects/weights?company_id=&year=
 *  Trả tỷ trọng theo đơn vị + năm (đã ghép default nếu chưa có)
 */
async function getBscWeights(req, res, next) {
  try {
    const companyId =
      parseInt(req.query.company_id, 10) ||
      parseInt(req.user?.company_id, 10) ||
      null;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    if (!companyId) {
      return res.status(400).json({ error: 'company_id là bắt buộc.' });
    }

    const weights = await kpiAspectService.getBscWeightsWithDefaults({
      company_id: companyId,
      year,
    });

    (weights || []).sort((a, b) => (a.perspective_id || 0) - (b.perspective_id || 0));
    return res.status(200).json(weights || []);
  } catch (e) {
    console.error('Error in getBscWeights:', e);
    return next(e);
  }
}

/** POST /api/kpi-aspects/weights
 *  Body: { company_id, year, weights: [{perspective_id, weight}, ...] }
 */
async function savePerspectiveWeights(req, res, next) {
  try {
    const { company_id, year, weights } = req.body || {};
    if (!company_id || !year || !Array.isArray(weights)) {
      return res.status(400).json({ error: 'company_id, year và weights là bắt buộc.' });
    }

    await kpiAspectService.updateBscWeights(company_id, year, weights);
    return res.status(200).json({ message: 'Cập nhật tỷ trọng thành công!' });
  } catch (e) {
    console.error('Error in savePerspectiveWeights:', e);
    // Trả lỗi có thông điệp cụ thể từ service nếu có
    return res.status(400).json({ error: e.message || 'Không thể cập nhật tỷ trọng.' });
  }
}

// Giữ nguyên các placeholder để không phá interface hiện có
async function create(req, res) { return res.status(201).json({ ok: true }); }
async function update(req, res) { return res.status(200).json({ ok: true }); }
async function remove(req, res) { return res.status(200).json({ ok: true }); }

module.exports = {
  getBscPerspectives,
  getBscWeights,
  savePerspectiveWeights,
  create,
  update,
  remove,
};
