// src/controllers/kpiLibraryController.js
const svc = require('../services/kpiLibraryService');

function pickCompanyId(req) {
  const raw = req.query.company_id ?? req.query.companyId ?? req.user?.company_id ?? req.user?.companyId;
  const companyId = Number(raw);
  if (!companyId || Number.isNaN(companyId)) return null;
  return companyId;
}

exports.getKpiLibrary = async (req, res) => {
  try {
    const companyId = pickCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });

    const data = await svc.getKpiLibrary({ company_id: companyId });
    return res.json(data);
  } catch (err) {
    console.error('[kpiLibrary:getFlat]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getKpiLibraryTree = async (req, res) => {
  try {
    const companyId = pickCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });

    const data = await svc.getTreeByCompany(companyId);
    return res.json(data);
  } catch (err) {
    console.error('[kpiLibrary:getTree]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createKpi = async (req, res) => {
  try {
    const companyId = pickCompanyId(req) ?? Number(req.body.company_id ?? req.body.companyId);
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });

    const payload = {
      ...req.body,
      company_id: companyId,
    };
    if (!payload.kpi_name || String(payload.kpi_name).trim() === '') {
      return res.status(400).json({ error: 'kpi_name is required' });
    }

    const created = await svc.createKpi(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error('[kpiLibrary:createKpi]', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateKpi = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const updated = await svc.updateKpi(id, req.body);
    return res.json(updated);
  } catch (err) {
    console.error('[kpiLibrary:updateKpi]', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteKpi = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const ok = await svc.deleteKpi(id);
    if (!ok) return res.status(404).json({ error: 'KPI not found' });
    return res.json({ message: 'Xóa KPI thành công!' });
  } catch (err) {
    console.error('[kpiLibrary:deleteKpi]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.exportKpis = async (req, res) => {
  try {
    const companyId = pickCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });

    const workbook = await svc.exportKpis(companyId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ThuVien_KPI_${companyId}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[kpiLibrary:export]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.importKpis = async (req, res) => {
  try {
    const companyId = pickCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });
    if (!req.file) return res.status(400).json({ error: 'Không tìm thấy file.' });

    await svc.importKpis(req.file, companyId);
    return res.json({ message: 'Nhập dữ liệu thành công.' });
  } catch (err) {
    console.error('[kpiLibrary:import]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
