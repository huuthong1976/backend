// server/services/kpiLibraryService.js
const db = require('../config/db');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { KpiLibrary, BscPerspective, sequelize } = require('../models');
/**
 * Lấy toàn bộ KPI trong thư viện và cấu trúc chúng thành dạng cây.
 */
const buildTree = (flat) => {
  const map = new Map(flat.map(n => [n.id, { ...n, children: [] }]));
  const tree = [];
  for (const node of map.values()) {
    const pid = node.parent_id;
    if (pid !== null && pid !== undefined && map.has(pid)) {
      map.get(pid).children.push(node);
    } else {
      tree.push(node);
    }
  }
  return tree;
};

// --- helper: thừa kế khía cạnh từ ancestor gần nhất ---
const inheritPerspective = (flat) => {
  const byId = new Map(flat.map(n => [n.id, n]));
  const getAncestor = (n) => {
    let p = n;
    while (p?.parent_id) {
      p = byId.get(p.parent_id);
      if (!p) break;
      if (p.perspective_name || p.perspective_id != null) return p;
    }
    return null;
  };

  flat.forEach(n => {
    const hasOwn = !!n.perspective_name || n.perspective_id != null;
    if (!hasOwn) {
      const anc = getAncestor(n);
      if (anc) {
        n.perspective_id = n.perspective_id ?? anc.perspective_id ?? null;
        n.perspective_name = anc.perspective_name ?? null;
      }
    }
    if (!n.perspective_name) n.perspective_name = 'Chưa phân loại';
  });
  return flat;
};

// --- SQL: lấy PHẲNG + JOIN tên khía cạnh ---
const queryFlat = async (companyId) => {
  if (!companyId) return [];
  const sql = `
    SELECT 
      k.id, k.kpi_name, k.parent_id, k.company_id, k.perspective_id,
      p.name AS perspective_name
    FROM kpi_library k
    LEFT JOIN bsc_perspectives p ON p.id = k.perspective_id
    WHERE k.company_id = ?
    ORDER BY k.id ASC
  `;
  const [rows] = await db.query(sql, [companyId]);
  // chuẩn hoá null
  rows.forEach(r => { if (!r.perspective_name) r.perspective_name = null; });
  return rows;
};

// ===== API dùng ở controller =====

// PHẲNG (đã thừa kế)
const getKpiLibrary = async ({ company_id }) => {
  const flat = await queryFlat(company_id);
  return inheritPerspective(flat);
};

// CÂY (đã thừa kế)
const getTreeByCompany = async (companyId) => {
  const flat = await queryFlat(companyId);
  const filled = inheritPerspective(flat);
  return buildTree(filled);
};

 
const createKpi = async (kpiData) => {
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
    } = kpiData;
  
    const parentId = parent_id ? parseInt(parent_id, 10) : null;
  
    const sql = `INSERT INTO kpi_library 
      (kpi_name, perspective_id, parent_id, company_id, unit, description, type, direction, objective_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
    const [result] = await db.query(sql, [
      kpi_name, perspective_id, parentId, company_id, unit, description, type, direction, objective_id
    ]);
  
    const [[newKpi]] = await db.query('SELECT * FROM kpi_library WHERE id = ?', [result.insertId]);
    return newKpi;
  };
  
  /**
   * Cập nhật KPI
   */
  const updateKpi = async (id, kpiData) => {
    const {
      kpi_name,
      perspective_id = null,
      parent_id = null,
      unit = null,
      description = null,
      type = null,
      direction = null,
      objective_id = null
    } = kpiData;
  
    const parentId = parent_id ? parseInt(parent_id, 10) : null;
  
    const sql = `UPDATE kpi_library SET 
        kpi_name = ?, perspective_id = ?, parent_id = ?, unit = ?, description = ?, type = ?, direction = ?, objective_id = ?
      WHERE id = ?`;
  
    const [result] = await db.query(sql, [
      kpi_name, perspective_id, parentId, unit, description, type, direction, objective_id,id
    ]);
  
    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy KPI để cập nhật');
    }
  
    const [[updated]] = await db.query('SELECT * FROM kpi_library WHERE id = ?', [id]);
    return updated;
  };

  /**
   * Xóa KPI (cập nhật các child trước)
   */
  const deleteKpi = async (id) => {
    await db.query('UPDATE kpi_library SET parent_id = NULL WHERE parent_id = ?', [id]);
    const [result] = await db.query('DELETE FROM kpi_library WHERE id = ?', [id]);
    return result.affectedRows > 0;
  };

const exportKpis = async (companyId) => {
    // Sử dụng đúng tên Model đã import
    const kpis = await KpiLibrary.findAll({
        where: { company_id: companyId },
        attributes: ['id', 'kpi_name', 'unit', 'description', 'type', 'direction'],
        include: [
            {
                model: BscPerspective,
                as: 'perspective',
                attributes: ['name']
            },
            {
                model: KpiLibrary,
                as: 'parent',
                attributes: ['kpi_name']
            }
        ],
        order: [['id', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ThuVienKPI');

    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Tên KPI', key: 'kpi_name', width: 50 },
        { header: 'KPI Cha', key: 'parent_name', width: 50 },
        { header: 'Khía cạnh', key: 'perspective_name', width: 25 },
        { header: 'Đơn vị tính', key: 'unit', width: 15 },
        { header: 'Loại', key: 'type', width: 15 },
        { header: 'Hướng', key: 'direction', width: 20 },
        { header: 'Mô tả', key: 'description', width: 60 },
    ];

    kpis.forEach(kpi => {
        worksheet.addRow({
            id: kpi.id,
            kpi_name: kpi.kpi_name,
            parent_name: kpi.parent?.kpi_name || '',
            perspective_name: kpi.perspective?.name || '',
            unit: kpi.unit,
            type: kpi.type,
            direction: kpi.direction,
            description: kpi.description,
        });
    });

    worksheet.getRow(1).font = { bold: true };

    return workbook;
};


const importKpis = async (file, companyId) => {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
        throw new Error('File không có dữ liệu.');
    }

    const transaction = await sequelize.transaction();
    try {
        // Cache để tra cứu ID
        const perspectiveMap = new Map();
        const kpiMap = new Map();

        // Lấy tất cả Khía cạnh và KPI hiện có để tra cứu
        const perspectives = await BscPerspective.findAll({ transaction });
        perspectives.forEach(p => perspectiveMap.set(p.name, p.id));
        const existingKpis = await KpiLibrary.findAll({ where: { company_id: companyId }, transaction });
        existingKpis.forEach(k => kpiMap.set(k.kpi_name, k.id));

        const kpisToCreate = [];

        // Vòng 1: Chuẩn bị dữ liệu, tạo KPI chưa có cha
        for (const row of data) {
            const perspectiveId = perspectiveMap.get(row.khía_cạnh);
            if (!perspectiveId) {
                console.warn(`Không tìm thấy khía cạnh: ${row.khía_cạnh}. Bỏ qua dòng.`);
                continue;
            }
            // Chỉ thêm nếu KPI chưa tồn tại
            if (!kpiMap.has(row.tên_kpi)) {
                kpisToCreate.push({
                    kpi_name: row.tên_kpi,
                    unit: row.đơn_vị_tính,
                    direction: row.hướng,
                    perspective_id: perspectiveId,
                    company_id: companyId,
                    // Lưu lại tên cha để xử lý ở vòng 2
                    _parent_kpi_name: row.tên_kpi_cha,
                });
            }
        }
        
        // Tạo các KPI mới
        const newKpis = await KpiLibrary.bulkCreate(kpisToCreate, { transaction, returning: true });
        newKpis.forEach(kpi => kpiMap.set(kpi.kpi_name, kpi.id));

        // Vòng 2: Cập nhật parent_id
        const updatePromises = [];
        const kpisToUpdate = [...existingKpis, ...newKpis];
        
        for (const kpi of kpisToUpdate) {
            const originalRow = data.find(row => row.tên_kpi === kpi.kpi_name);
            if (originalRow && originalRow.tên_kpi_cha) {
                const parentId = kpiMap.get(originalRow.tên_kpi_cha);
                if (parentId) {
                   updatePromises.push(KpiLibrary.update(
                       { parent_id: parentId },
                       { where: { id: kpi.id }, transaction }
                   ));
                }
            }
        }

        await Promise.all(updatePromises);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        console.error("Lỗi khi import KPI:", error);
        throw new Error('Đã xảy ra lỗi trong quá trình xử lý file.');
    }
};

const findAllKpis = async (companyId) => {
    const kpis = await KpiLibrary.findAll({
        where: { company_id: companyId },
        include: [
            {
                model: BscPerspective,
                as: 'perspective', // Tên alias phải khớp với định nghĩa trong model
                attributes: ['name'] // Chỉ lấy cột 'name' từ bảng khía cạnh
            }
        ],
        order: [['id', 'ASC']]
    });

    // Chuyển đổi để có cấu trúc dữ liệu sạch hơn
    return kpis.map(kpi => {
        const kpiJson = kpi.toJSON();
        return {
            ...kpiJson,
            perspective_name: kpiJson.perspective?.name || 'Chưa phân loại'
        };
    });
};
module.exports = { findAllKpis,  getTreeByCompany, getKpiLibrary, createKpi, updateKpi, deleteKpi, exportKpis, importKpis, };