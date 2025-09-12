// src/services/kpiLibraryService.js
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { sequelize, Sequelize, KpiLibrary, BscPerspective } = require('../models');
const { Op } = Sequelize;

/* =============== Helpers =============== */
const buildTree = (flat) => {
  const map = new Map(flat.map(n => [n.id, { ...n, children: [] }]));
  const tree = [];
  for (const n of map.values()) {
    const pid = n.parent_id;
    if (pid != null && map.has(pid)) map.get(pid).children.push(n);
    else tree.push(n);
  }
  return tree;
};

const inheritPerspective = (flat) => {
  const byId = new Map(flat.map(n => [n.id, n]));
  const findAncestorWithPerspective = (n) => {
    let p = n;
    while (p?.parent_id) {
      p = byId.get(p.parent_id);
      if (!p) break;
      if (p.perspective_name || p.perspective_id != null) return p;
    }
    return null;
  };

  flat.forEach(n => {
    if (!(n.perspective_name || n.perspective_id != null)) {
      const anc = findAncestorWithPerspective(n);
      if (anc) {
        n.perspective_id = n.perspective_id ?? anc.perspective_id ?? null;
        n.perspective_name = anc.perspective_name ?? null;
      }
    }
    if (!n.perspective_name) n.perspective_name = 'Chưa phân loại';
  });
  return flat;
};

/* =============== Query qua Sequelize =============== */
const queryFlat = async (rawCompanyId) => {
  const companyId = Number(rawCompanyId);
  if (!companyId || Number.isNaN(companyId)) return [];

  const rows = await KpiLibrary.findAll({
    where: { company_id: companyId, deleted_at: null },
    attributes: [
      'id', 'kpi_name', 'parent_id', 'company_id', 'perspective_id'
    ],
    include: [
      { model: BscPerspective, as: 'perspective', attributes: ['name'] }
    ],
    order: [['id', 'ASC']],
    raw: true,
    nest: true
  });

  // Chuẩn hoá field perspective_name cho client
  return rows.map(r => ({
    id: r.id,
    kpi_name: r.kpi_name,
    parent_id: r.parent_id,
    company_id: r.company_id,
    perspective_id: r.perspective_id,
    perspective_name: r.perspective?.name ?? null
  }));
};

/* =============== APIs cho controller =============== */

// Danh sách phẳng (có perspective_name)
const getKpiLibrary = async ({ company_id }) => {
  const flat = await queryFlat(company_id);
  return inheritPerspective(flat);
};

// Cây theo company
const getTreeByCompany = async (companyId) => {
  const flat = await queryFlat(companyId);
  return buildTree(inheritPerspective(flat));
};

// Tạo KPI
const createKpi = async (data) => {
  const {
    kpi_name,
    perspective_id = null,
    parent_id = null,
    company_id,
    unit = null,
    description = null,
    type = null,
    direction = null,
    objective_id = null
  } = data;

  const companyId = Number(company_id);
  if (!kpi_name || !companyId) throw new Error('kpi_name và company_id là bắt buộc');

  const created = await KpiLibrary.create({
    kpi_name,
    perspective_id,
    parent_id: parent_id ? Number(parent_id) : null,
    company_id: companyId,
    unit,
    description,
    type,
    direction,
    objective_id
  });

  return await KpiLibrary.findByPk(created.id); // trả record đầy đủ
};

// Cập nhật KPI
const updateKpi = async (rawId, data) => {
  const id = Number(rawId);
  if (!id) throw new Error('Invalid id');

  const {
    kpi_name,
    perspective_id = null,
    parent_id = null,
    unit = null,
    description = null,
    type = null,
    direction = null,
    objective_id = null
  } = data;

  const [aff] = await KpiLibrary.update({
    kpi_name, perspective_id,
    parent_id: parent_id ? Number(parent_id) : null,
    unit, description, type, direction, objective_id
  }, { where: { id } });

  if (!aff) throw new Error('Không tìm thấy KPI để cập nhật');
  return await KpiLibrary.findByPk(id);
};

// Xoá KPI (detach con trước)
const deleteKpi = async (rawId) => {
  const id = Number(rawId);
  if (!id) throw new Error('Invalid id');

  await KpiLibrary.update({ parent_id: null }, { where: { parent_id: id } });
  const aff = await KpiLibrary.destroy({ where: { id } });
  return aff > 0;
};

/* =============== Export / Import (Sequelize) =============== */
const exportKpis = async (companyId) => {
  const list = await KpiLibrary.findAll({
    where: { company_id: Number(companyId) },
    attributes: ['id', 'kpi_name', 'unit', 'description', 'type', 'direction'],
    include: [
      { model: BscPerspective, as: 'perspective', attributes: ['name'] },
      { model: KpiLibrary, as: 'parent', attributes: ['kpi_name'] }
    ],
    order: [['id', 'ASC']]
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ThuVienKPI');

  ws.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Tên KPI', key: 'kpi_name', width: 50 },
    { header: 'KPI Cha', key: 'parent_name', width: 50 },
    { header: 'Khía cạnh', key: 'perspective_name', width: 25 },
    { header: 'Đơn vị tính', key: 'unit', width: 15 },
    { header: 'Loại', key: 'type', width: 15 },
    { header: 'Hướng', key: 'direction', width: 20 },
    { header: 'Mô tả', key: 'description', width: 60 },
  ];

  list.forEach(k => {
    ws.addRow({
      id: k.id,
      kpi_name: k.kpi_name,
      parent_name: k.parent?.kpi_name || '',
      perspective_name: k.perspective?.name || '',
      unit: k.unit,
      type: k.type,
      direction: k.direction,
      description: k.description,
    });
  });

  ws.getRow(1).font = { bold: true };
  return wb;
};

const importKpis = async (file, companyId) => {
  const wb = xlsx.read(file.buffer, { type: 'buffer' });
  const sheet = wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet]);
  if (!rows.length) throw new Error('File không có dữ liệu.');

  const tx = await sequelize.transaction();
  try {
    // Map perspective
    const pMap = new Map();
    (await BscPerspective.findAll({ transaction: tx })).forEach(p => pMap.set(p.name, p.id));

    // Map KPI theo tên
    const kMap = new Map();
    (await KpiLibrary.findAll({ where: { company_id: Number(companyId) }, transaction: tx }))
      .forEach(k => kMap.set(k.kpi_name, k.id));

    // Tạo mới
    const toCreate = [];
    for (const r of rows) {
      const perspId = pMap.get(r.khía_cạnh) ?? null;
      if (!kMap.has(r.tên_kpi)) {
        toCreate.push({
          kpi_name: r.tên_kpi,
          unit: r.đơn_vị_tính ?? null,
          direction: r.hướng ?? null,
          perspective_id: perspId,
          company_id: Number(companyId),
          _parent_kpi_name: r.tên_kpi_cha ?? null,
        });
      }
    }

    const created = await KpiLibrary.bulkCreate(toCreate, { transaction: tx });
    created.forEach(k => k.kpi_name && kMap.set(k.kpi_name, k.id));

    // Gán parent
    const all = await KpiLibrary.findAll({ where: { company_id: Number(companyId) }, transaction: tx });
    const updates = [];
    for (const k of all) {
      const src = rows.find(r => r.tên_kpi === k.kpi_name);
      if (src?.tên_kpi_cha) {
        const pid = kMap.get(src.tên_kpi_cha);
        if (pid) updates.push(KpiLibrary.update({ parent_id: pid }, { where: { id: k.id }, transaction: tx }));
      }
    }
    await Promise.all(updates);

    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw new Error('Đã xảy ra lỗi trong quá trình xử lý file.');
  }
};

const findAllKpis = async (companyId) => {
  const list = await KpiLibrary.findAll({
    where: { company_id: Number(companyId) },
    include: [{ model: BscPerspective, as: 'perspective', attributes: ['name'] }],
    order: [['id', 'ASC']]
  });
  return list.map(k => {
    const j = k.toJSON();
    return { ...j, perspective_name: j.perspective?.name || 'Chưa phân loại' };
  });
};

module.exports = {
  // read
  getKpiLibrary, getTreeByCompany, findAllKpis,
  // write
  createKpi, updateKpi, deleteKpi,
  // io
  exportKpis, importKpis,
};

  
