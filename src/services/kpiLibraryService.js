// src/services/kpiLibraryService.js
const { pool, getPool } = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;

const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { KpiLibrary, BscPerspective, sequelize } = require('../models');

// ---------- helpers ----------
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
  const ancestorWithPerspective = (n) => {
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
      const anc = ancestorWithPerspective(n);
      if (anc) {
        n.perspective_id = n.perspective_id ?? anc.perspective_id ?? null;
        n.perspective_name = anc.perspective_name ?? null;
      }
    }
    if (!n.perspective_name) n.perspective_name = 'Chưa phân loại';
  });
  return flat;
};

const queryFlat = async (rawCompanyId) => {
  const companyId = Number(rawCompanyId);
  if (!companyId || Number.isNaN(companyId)) return [];
  const sql = `
    SELECT
      k.id, k.kpi_name, k.parent_id, k.company_id, k.perspective_id,
      p.name AS perspective_name
    FROM kpi_library k
    LEFT JOIN bsc_perspectives p ON p.id = k.perspective_id
    WHERE k.company_id = ? AND k.deleted_at IS NULL
    ORDER BY k.id ASC
  `;
  try {
    const [rows] = await db.query(sql, [companyId]);
    rows.forEach(r => { if (!r.perspective_name) r.perspective_name = null; });
    return rows;
  } catch (e) {
    e.message = `[queryFlat] company_id=${companyId}: ${e.message}`;
    throw e;
  }
};

// ---------- APIs được controller gọi ----------
const getKpiLibrary = async ({ company_id }) => {
  const flat = await queryFlat(company_id);
  return inheritPerspective(flat);
};

const getTreeByCompany = async (companyId) => {
  const flat = await queryFlat(companyId);
  return buildTree(inheritPerspective(flat));
};

const createKpi = async (data) => {
  const {
    kpi_name,
    perspective_id = null,
    parent_id = null,
    company_id = null,
    unit = null,
    description = null,
    type = null,
    direction = null,
    objective_id = null
  } = data;

  if (!kpi_name || !company_id) {
    throw new Error('kpi_name và company_id là bắt buộc');
  }

  const parentId = parent_id ? Number(parent_id) : null;

  const sql = `
    INSERT INTO kpi_library
    (kpi_name, perspective_id, parent_id, company_id, unit, description, type, direction, objective_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [
    kpi_name, perspective_id ?? null, parentId, Number(company_id),
    unit, description, type, direction, objective_id
  ]);

  const [[row]] = await db.query('SELECT * FROM kpi_library WHERE id = ?', [result.insertId]);
  return row;
};

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

  const parentId = parent_id ? Number(parent_id) : null;

  const sql = `
    UPDATE kpi_library SET
      kpi_name = ?, perspective_id = ?, parent_id = ?, unit = ?, description = ?, type = ?, direction = ?, objective_id = ?
    WHERE id = ?
  `;
  const [ret] = await db.query(sql, [
    kpi_name, perspective_id ?? null, parentId, unit, description, type, direction, objective_id, id
  ]);
  if (ret.affectedRows === 0) throw new Error('Không tìm thấy KPI để cập nhật');

  const [[row]] = await db.query('SELECT * FROM kpi_library WHERE id = ?', [id]);
  return row;
};

const deleteKpi = async (rawId) => {
  const id = Number(rawId);
  if (!id) throw new Error('Invalid id');

  await db.query('UPDATE kpi_library SET parent_id = NULL WHERE parent_id = ?', [id]);
  const [ret] = await db.query('DELETE FROM kpi_library WHERE id = ?', [id]);
  return ret.affectedRows > 0;
};

// ---------- Export / Import ----------
const exportKpis = async (companyId) => {
  const kpis = await KpiLibrary.findAll({
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

  kpis.forEach(k => {
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
    const perspectiveMap = new Map();
    const kpiMap = new Map();

    const perspectives = await BscPerspective.findAll({ transaction: tx });
    perspectives.forEach(p => perspectiveMap.set(p.name, p.id));

    const existing = await KpiLibrary.findAll({ where: { company_id: Number(companyId) }, transaction: tx });
    existing.forEach(k => kpiMap.set(k.kpi_name, k.id));

    const toCreate = [];
    for (const r of rows) {
      const pid = perspectiveMap.get(r.khía_cạnh);
      if (!pid) continue;
      if (!kpiMap.has(r.tên_kpi)) {
        toCreate.push({
          kpi_name: r.tên_kpi,
          unit: r.đơn_vị_tính,
          direction: r.hướng,
          perspective_id: pid,
          company_id: Number(companyId),
          _parent_kpi_name: r.tên_kpi_cha,
        });
      }
    }

    const news = await KpiLibrary.bulkCreate(toCreate, { transaction: tx, returning: true });
    news.forEach(k => k.kpi_name && kpiMap.set(k.kpi_name, k.id));

    const updates = [];
    const all = [...existing, ...news];
    for (const k of all) {
      const src = rows.find(r => r.tên_kpi === k.kpi_name);
      if (src?.tên_kpi_cha) {
        const pid = kpiMap.get(src.tên_kpi_cha);
        if (pid) updates.push(KpiLibrary.update({ parent_id: pid }, { where: { id: k.id }, transaction: tx }));
      }
    }

    await Promise.all(updates);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    console.error('[kpiLibrary:import]', e);
    throw new Error('Đã xảy ra lỗi trong quá trình xử lý file.');
  }
};

const findAllKpis = async (companyId) => {
  const kpis = await KpiLibrary.findAll({
    where: { company_id: Number(companyId) },
    include: [{ model: BscPerspective, as: 'perspective', attributes: ['name'] }],
    order: [['id', 'ASC']]
  });
  return kpis.map(k => {
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

  
