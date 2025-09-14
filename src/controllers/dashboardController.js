// server/controllers/dashboardController.js
const db = require('../models');

const hasAttr = (model, attr) =>
  !!(model && model.rawAttributes && model.rawAttributes[attr]);

// Parse an toàn: chỉ trả về số nguyên hợp lệ, còn lại -> null
const toInt = (v, fallback = null) => {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === '' || t === 'all' || t === '*' || t === 'null' || t === 'undefined') return fallback;
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    return fallback;
  }
  return fallback;
};

const buildWhere = (model, { companyId, year, month }) => {
  const where = {};
  if (typeof companyId === 'number') {
    if (hasAttr(model, 'company_id')) where.company_id = companyId;
    else if (hasAttr(model, 'companyId')) where.companyId = companyId;
  }
  if (typeof year === 'number') {
    if (hasAttr(model, 'year')) where.year = year;
    else if (hasAttr(model, 'plan_year')) where.plan_year = year;
    else if (hasAttr(model, 'target_year')) where.target_year = year;
  }
  if (typeof month === 'number') {
    if (hasAttr(model, 'month')) where.month = month;
    else if (hasAttr(model, 'plan_month')) where.plan_month = month;
    else if (hasAttr(model, 'target_month')) where.target_month = month;
  }
  return where;
};

const safeCount = async (modelName, filters) => {
  const model = db[modelName];
  if (!model) return 0;
  const where = buildWhere(model, filters);
  const opts = {};
  if (Object.keys(where).length) opts.where = where;
  return await model.count(opts);
};

exports.getDashboardSummary = async (req, res) => {
  try {
    // Lấy companyId hợp lệ: ưu tiên query, fallback JWT; mặc định không filter
    const userCompanyId = toInt(req?.user?.company_id, null);
    const companyId = toInt(req.query.companyId, userCompanyId);

    const now = new Date();
    const year  = toInt(req.query.year,  now.getFullYear());
    const month = toInt(req.query.month, now.getMonth() + 1);

    const filters = { companyId, year, month };

    const data = {
      employees:       await safeCount('Employee',         filters),
      departments:     await safeCount('Department',       filters),
      kpiPlans:        await safeCount('KpiPlan',          filters),
      unitKpiRegs:     await safeCount('CompanyKpi',       filters),
      unitKpiResults:  await safeCount('CompanyKpiResult', filters),
    };

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({ ok: true, filters, data });
  } catch (err) {
    console.error('dashboard/summary error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to load dashboard summary' });
  }
};
