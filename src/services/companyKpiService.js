// server/services/companyKpiService.js
const { CompanyKpiRegistration, KpiLibrary, CompanyKpiMonthly, sequelize } = require('../models');
const { Op } = require('sequelize');
const db = require('../config/db');
/**
 * Xây dựng cây KPI từ danh sách phẳng (company_kpi_registration)
 */
const buildRegistrationTree = (elements) => {
    const tree = [];
    const map = {};
    elements.forEach(el => {
        const nodeData = el.toJSON ? el.toJSON() : el;
        map[nodeData.id] = { ...nodeData, children: [] };
    });

    Object.values(map).forEach(node => {
        if (node.parent_registration_id && map[node.parent_registration_id]) {
            map[node.parent_registration_id].children.push(node);
        } else {
            tree.push(node);
        }
    });
    return tree;
};



function buildTree(items) {
    const map = {};
    const roots = [];
  
    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });
  
    items.forEach((item) => {
      if (item.parent_registration_id) {
        map[item.parent_registration_id]?.children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
  
    return roots;
  }
  
  const getAll = async (user, filters) => {
    const where = {};
    if (filters.company_id) where.company_id = filters.company_id;
    if (filters.year) where.year = filters.year;
  
    const registrations = await CompanyKpiRegistration.findAll({
      where,
      include: [
        {
          model: KpiLibrary,
          as: 'kpiDetail',
          attributes: ['kpi_name'],
        },
        {
          model: CompanyKpiMonthly,
          as: 'monthlyAllocations',
          attributes: ['month', 'target_value'],
        }
      ],
      order: [['id', 'ASC']],
      
    });
  
    // Map lại dữ liệu gọn hơn
    const formatted = registrations.map(r => r.toJSON());
  
    // ✅ buildTree theo parent_registration_id
    return buildTree(formatted);
  };

/**
 * Lấy thư viện KPI (để hiển thị dropdown)
 */
const getLibrary = async (filters = {}) => {
    const { company_id } = filters;
    if (!company_id) return [];

    const list = await KpiLibrary.findAll({
        where: { company_id },
        attributes: ['id', 'kpi_name', 'parent_id'],
        raw: true
    });
    return list;
};


/**
 * Tạo KPI đơn lẻ
 */
const create = async (kpiData) => {
    let {
        company_id,
        kpi_id,
        year,
        target_value,
        weight,
        parent_registration_id
    } = kpiData;

    const parentId = parent_registration_id ? parent_registration_id : null;

    if (parentId && !company_id) {
        const parentKpi = await CompanyKpiRegistration.findByPk(parentId, { attributes: ['company_id'] });
        if (parentKpi) company_id = parentKpi.company_id;
    }

    return CompanyKpiRegistration.create({
        company_id,
        kpi_id,
        year,
        target_value,
        weight,
        parent_registration_id: parentId
    });
};

/**
 * Đăng ký KPI hàng loạt từ thư viện
 */
const bulkCreate = async (kpiList) => {
    // Lấy toàn bộ thư viện KPI để biết quan hệ cha con
    const library = await KpiLibrary.findAll({ raw: true });
    const libraryMap = {};
    library.forEach((kpi) => {
      libraryMap[kpi.id] = kpi;
    });
  
    const created = [];
  
    // Dùng map để lưu mapping kpi_id -> registration_id đã tạo
    const regMap = {};
  
    for (const kpiData of kpiList) {
      let parentRegId = null;
  
      const parentLibId = libraryMap[kpiData.kpi_id]?.parent_id || null;
      if (parentLibId && regMap[parentLibId]) {
        parentRegId = regMap[parentLibId];
      }
  
      const newKpi = await CompanyKpiRegistration.create({
        company_id: kpiData.company_id,
        kpi_id: kpiData.kpi_id,
        year: kpiData.year,
        target_value: kpiData.target_value,
        weight: kpiData.weight,
        parent_registration_id: parentRegId, // ✅ Gán cha đúng
        created_by: kpiData.created_by || null,
      });
  
      created.push(newKpi);
      regMap[kpiData.kpi_id] = newKpi.id; // Lưu lại để con dùng
    }
  
    return created;
  };
  
/**
 * Cập nhật 1 KPI
 */
const update = async (id, kpiData) => {
    const { kpi_id, target_value, weight, parent_registration_id } = kpiData;
    const parentId = parent_registration_id ? parent_registration_id : null;

    const [updatedRows] = await CompanyKpiRegistration.update(
        { kpi_id, target_value, weight, parent_registration_id: parentId },
        { where: { id } }
    );
    return updatedRows > 0;
};

/**
 * Xóa 1 KPI
 */
const remove = async (id) => {
    await CompanyKpiRegistration.update({ parent_registration_id: null }, { where: { parent_registration_id: id } });
    const deletedRows = await CompanyKpiRegistration.destroy({ where: { id } });
    return deletedRows > 0;
};
const allocateMonthlyTargets = async (registrationId, monthlyTargets) => {
  // Giả sử bạn có một bảng tên là `company_kpi_monthly` để lưu chỉ tiêu theo tháng
  // Cấu trúc bảng ví dụ: id, registration_id, month, year, target
  
  const connection = await db.getConnection(); // Dùng transaction để đảm bảo toàn vẹn dữ liệu
  try {
      await connection.beginTransaction();

      // Xóa các phân bổ cũ (nếu có) để ghi đè bằng dữ liệu mới
      await connection.query(
          'DELETE FROM company_kpi_monthly WHERE registration_id = ?', 
          [registrationId]
      );

      // Chèn dữ liệu mới cho 12 tháng
      for (const monthData of monthlyTargets) {
          // monthData có dạng { month: 1, year: 2025, target: 164.3 }
          await connection.query(
              'INSERT INTO company_kpi_monthly (registration_id, month, year, target_value) VALUES (?, ?, ?, ?)',
              [registrationId, monthData.month, monthData.year, monthData.target]
          );
      }

      await connection.commit(); // Hoàn tất transaction
      return { success: true, message: 'Phân bổ chỉ tiêu tháng thành công.' };

  } catch (error) {
      await connection.rollback(); // Hoàn tác nếu có lỗi
      console.error("Lỗi khi phân bổ KPI tháng (service):", error);
      throw new Error('Không thể lưu dữ liệu phân bổ.');
  } finally {
      connection.release(); // Trả kết nối về pool
  }
};
module.exports = {
    getAll,
    getLibrary,
    create,
    bulkCreate,
    update,
    remove,
    buildRegistrationTree,
    allocateMonthlyTargets,
};
