// controllers/companyController.js
const { Sequelize } = require('sequelize');
const { Company } = require('../models');

async function listCompanies(req, res) {
  try {
    const role = req.user?.role;
    const myCompanyId = req.user?.company_id;

    const where = { deleted_at: null };
    if (role === 'TruongDonVi' && myCompanyId) where.id = myCompanyId;
    else if (!['Admin', 'TongGiamDoc', 'TruongDonVi'].includes(role)) {
      return res.status(200).json([]);
    }

    const rows = await Company.findAll({
      where,
      attributes: ['id', 'company_code', 'company_name', 'address', 'status'],
      order: [['company_name', 'ASC']],
    });

    return res.status(200).json(rows);
  } catch (e) {
    console.error('Error fetching companies:', e);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}

async function getCompany(req, res) {
  try {
    const row = await Company.findOne({
      where: { id: req.params.id, deleted_at: null },
      attributes: ['id', 'company_code', 'company_name', 'address', 'tax_code', 'phone', 'email', 'status'],
    });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy công ty.' });
    return res.status(200).json(row);
  } catch (e) {
    console.error('Error in getCompany:', e);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}

/** POST /api/companies */
async function createCompany(req, res, next) {
  try {
    const { name, address } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Tên công ty là bắt buộc.' });
    }
    const created = await Company.create({ name: String(name).trim(), address: address || null });
    // Trả 201 + thực thể mới
    return res.status(201).json(created);
  } catch (e) {
    console.error('Error in createCompany:', e);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}

/** PUT /api/companies/:id */
async function updateCompany(req, res, next) {
  try {
    const { name, address } = req.body;
    const [affected] = await Company.update(
      { ...(name !== undefined ? { name } : {}), ...(address !== undefined ? { address } : {}) },
      { where: { id: req.params.id, deleted_at: null } }
    );
    if (!affected) return res.status(404).json({ error: 'Không tìm thấy công ty để cập nhật.' });

    const updated = await Company.findOne({
      where: { id: req.params.id },
      attributes: ['id', ['name', 'company_name'], 'address'],
    });
    return res.status(200).json(updated);
  } catch (e) {
    console.error('Error in updateCompany:', e);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}

/** DELETE /api/companies/:id */
async function deleteCompany(req, res, next) {
  try {
    // Nếu bạn muốn soft-delete thì đổi thành: set deleted_at = new Date()
    const affected = await Company.destroy({ where: { id: req.params.id } });
    if (!affected) return res.status(404).json({ error: 'Không tìm thấy công ty để xóa.' });
    // Trả 200 để tránh cache 204/304 trên FE
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Error in deleteCompany:', e);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
};
