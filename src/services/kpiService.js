// server/services/kpiService.js
const db = require('../models');
const { Op } = require('sequelize');
// =================================================================
// SECTION 1: THƯ VIỆN KPI (KPI LIBRARY)
// =================================================================

/** Lấy toàn bộ KPI trong thư viện và cấu trúc thành dạng cây */
const getKpiLibraryTree = async () => {
    const [flatKpis] = await db.query('SELECT * FROM kpi_library ORDER BY parent_id, id');
    const map = {}, roots = [];
    flatKpis.forEach(kpi => {
        map[kpi.id] = { ...kpi, children: [] };
        if (kpi.parent_id !== null && map[kpi.parent_id]) {
            map[kpi.parent_id].children.push(map[kpi.id]);
        } else {
            roots.push(map[kpi.id]);
        }
    });
    return roots;
};

/** Tạo mới một KPI trong thư viện */
const createKpiInLibrary = async (kpiData) => {
    const { name, bsc_aspect, parent_id = null } = kpiData;
    const sql = 'INSERT INTO kpi_library (kpi_name, perspectives_id, parent_id) VALUES (?, ?, ?)';
    const [result] = await db.query(sql, [name, bsc_aspect, parent_id]);
    const [[newKpi]] = await db.query('SELECT * FROM kpi_library WHERE id = ?', [result.insertId]);
    return newKpi;
};

/** Cập nhật một KPI trong thư viện */
const updateKpiInLibrary = async (id, kpiData) => {
    const { name, bsc_aspect, parent_id = null } = kpiData;
    const sql = 'UPDATE kpi_library SET kpi_name = ?, perspectives_id = ?, parent_id = ? WHERE id = ?';
    const [result] = await db.query(sql, [name, bsc_aspect, parent_id, id]);
    return result.affectedRows > 0;
};

/** Xóa một KPI khỏi thư viện */
const deleteKpiFromLibrary = async (id) => {
    await db.query('UPDATE kpi_library SET parent_id = NULL WHERE parent_id = ?', [id]);
    const [result] = await db.query('DELETE FROM kpi_library WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

// =================================================================
// SECTION 2: KPI ĐƠN VỊ (UNIT KPI)
// =================================================================

/** Lấy danh sách các KPI đã được một đơn vị đăng ký trong một năm */
const getUnitKpiRegistrations = async (companyId, year) => {
    const sql = `
        SELECT ukr.kpi_library_id as \`key\`, kl.kpi_name as title, ukr.target
        FROM unit_kpi_registrations ukr JOIN kpi_library kl ON ukr.kpi_library_id = kl.id
        WHERE ukr.company_id = ? AND ukr.year = ?;
    `;
    const [registrations] = await db.query(sql, [companyId, year]);
    return registrations;
};

/** Lưu lại toàn bộ danh sách KPI đăng ký cho một đơn vị trong một năm */
const saveUnitKpiRegistrations = async (companyId, year, kpiItems) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM unit_kpi_registrations WHERE company_id = ? AND year = ?', [companyId, year]);
        if (kpiItems && kpiItems.length > 0) {
            const values = kpiItems.map(item => [item.key, companyId, year, item.target]);
            const sql = 'INSERT INTO unit_kpi_registrations (kpi_library_id, company_id, year, target) VALUES ?';
            await connection.query(sql, [values]);
        }
        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw new Error('Lưu đăng ký KPI thất bại.');
    } finally {
        connection.release();
    }
};

/** Lấy danh sách KPI đã đăng ký và kết quả thực tế trong tháng */
const getUnitKpiMonthlyResults = async (companyId, year, month) => {
    const sql = `
        SELECT ukr.id as registration_id, kl.name as kpi_name, kl.unit, ukr.target, ukr_res.actual_result
        FROM unit_kpi_registrations ukr
        JOIN kpi_library kl ON ukr.kpi_library_id = kl.id
        LEFT JOIN unit_kpi_results ukr_res ON ukr.id = ukr_res.registration_id AND ukr_res.month = ? AND ukr_res.year = ?
        WHERE ukr.company_id = ? AND ukr.year = ? ORDER BY kl.id;
    `;
    const [results] = await db.query(sql, [month, year, companyId, year]);
    return results;
};

/** Lưu nhiều kết quả KPI tháng của đơn vị */
const saveUnitKpiMonthlyResults = async (resultsData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const item of resultsData) {
            const sql = `
                INSERT INTO unit_kpi_results (registration_id, month, year, actual_result) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE actual_result = VALUES(actual_result);
            `;
            await connection.query(sql, [item.registration_id, item.month, item.year, item.actual_result]);
        }
        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw new Error('Lưu kết quả KPI tháng thất bại.');
    } finally {
        connection.release();
    }
};

// =================================================================
// SECTION 3: KPI CÁ NHÂN (INDIVIDUAL KPI)
// =================================================================

/** Lấy chi tiết một kế hoạch KPI cá nhân và dữ liệu liên quan */
const findKpiPlanByEmployeeAndDate = async (employeeId, month, year) => {
    // 1. Truy vấn trực tiếp vào bảng employee_work_plans của bạn
    const itemsSql = 'SELECT * FROM kpi_plans WHERE employee_id = ? AND month = ? AND year = ? ORDER BY id ASC';
    const [items] = await db.query(itemsSql, [employeeId, month, year]);

    // Nếu không có bản ghi nào, trả về null
    if (items.length === 0) {
        // Có thể cần tạo bản ghi rỗng ở đây nếu quy trình yêu cầu
        return null; 
    }

    // 2. Tạo đối tượng 'plan' từ dữ liệu các 'items'
    // Giả định trạng thái và thông tin chung là giống nhau cho tất cả các dòng
    const plan = {
        id: items[0].id, // Có thể dùng id của dòng đầu tiên làm đại diện
        employee_id: employeeId,
        month: month,
        year: year,
        status: items[0].status, // Lấy trạng thái từ một dòng
        items: items // Toàn bộ các dòng là các mục tiêu
    };

    // 3. Lấy dữ liệu liên quan khác (ví dụ: KPI đơn vị)
    const [[employee]] = await db.query('SELECT company_id FROM employees WHERE id = ?', [employeeId]);
    const unitKpisSql = `
        SELECT ukr.id, kl.name as kpi_name
        FROM unit_kpi_registrations ukr
        JOIN kpi_library kl ON ukr.kpi_library_id = kl.id
        WHERE ukr.company_id = ? AND ukr.year = ?;
    `;
    const [linkableUnitKpis] = await db.query(unitKpisSql, [employee.company_id, year]);

    return { plan, linkableUnitKpis };
};

/** Tạo mới hoặc Cập nhật một kế hoạch KPI cá nhân và các mục con */
const upsertKpiPlan = async (planData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (planData.items && planData.items.length > 0) {
            for (const item of planData.items) {
                // Câu lệnh này sẽ UPDATE nếu có dòng với 'id' tương ứng,
                // hoặc INSERT một dòng mới nếu 'id' là null/undefined.
                const sql = `
                    INSERT INTO kpi_plan_items (id, employee_id, month, year, name, target, unit, weight, result, self_score, manager_score, director_score, status, unit_kpi_registration_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name), target = VALUES(target), unit = VALUES(unit), 
                        weight = VALUES(weight), result = VALUES(result), self_score = VALUES(self_score),
                        manager_score = VALUES(manager_score), director_score = VALUES(director_score), 
                        status = VALUES(status), unit_kpi_registration_id = VALUES(unit_kpi_registration_id);
                `;
                await connection.query(sql, [
                    item.id || null,
                    planData.employee_id,
                    planData.month,
                    planData.year,
                    item.name,
                    item.target,
                    item.unit,
                    item.weight,
                    item.result,
                    item.self_score,
                    item.manager_score,
                    item.director_score,
                    planData.status, // Cập nhật trạng thái chung cho tất cả các dòng
                    item.unit_kpi_registration_id
                ]);
            }
        }

        await connection.commit();
        return findKpiPlanByEmployeeAndDate(planData.employee_id, planData.month, planData.year);
    } catch (error) {
        await connection.rollback();
        console.error("KPI Plan Upsert (employee_work_plans) Error:", error);
        throw new Error('Thao tác với kế hoạch KPI thất bại.');
    } finally {
        connection.release();
    }
};

/** Lấy danh sách tóm tắt các kế hoạch KPI cho dashboard quản lý */
const findKpiPlansSummary = async (user, filters) => {
    // ... (logic như phiên bản trước)
};
// ✅ Hoàn thiện logic trong file kpiService.js
// ✅ Hàm getSubordinatesForManager đã được sửa

// server/services/kpiService.js
const getSubordinatesForManager = async (user, companyId, month, year, status) => {
    let whereClause = {};
  
    if (user.role === 'TruongDonVi') {
      whereClause = { manager_id: user.id };
    } else if (user.role === 'Admin' || user.role === 'TongGiamDoc') {
      if (companyId && companyId !== 'all') {
        whereClause = { company_id: companyId };
      }
    } else {
      return [];
    }
  
    const kpiPlanWhere = { month, year };
    if (status && status !== 'all') {
      kpiPlanWhere.status = status;
    }
  
    return await db.Employee.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'company_id'],
      include: [
        {
          model: db.Position,              // ✅ join bảng positions
          as: 'position',
          attributes: ['position_name'],            // lấy tên chức danh
          required: false
        },
        {
          model: db.KpiPlan,
          as: 'kpi_plans',
          where: kpiPlanWhere,
          required: false,
          attributes: ['id', 'status', 'final_score', 'month', 'year'],
        }
      ]
    });
  };
  

const getDashboardSummary = async (user, filters) => {
    let whereClause = {
        month: filters.month,
        year: filters.year,
    };

    if (user.role === 'TruongDonVi') {
        const subordinates = await db.Employee.findAll({
            where: { manager_id: user.id },
            attributes: ['id'],
        });
        const subordinateIds = subordinates.map(s => s.id);
        whereClause.employee_id = { [Op.in]: [...subordinateIds, user.id] };
    } else if (user.role === 'TongGiamDoc' || user.role === 'Admin') {
        if (filters.company_id) {
            const employeesInCompany = await db.Employee.findAll({
                where: { company_id: filters.company_id },
                attributes: ['id'],
            });
            const employeeIds = employeesInCompany.map(e => e.id);
            whereClause.employee_id = { [Op.in]: employeeIds };
        }
    } else {
        whereClause.employee_id = user.id;
    }

    const summary = await db.KpiPlan.findAll({
        where: whereClause,
        attributes: ['status'],
        group: ['status'],
        // Lấy số lượng bản ghi cho mỗi trạng thái
        // 
        raw: true,
        order: [['status', 'ASC']],
    });

    return summary;
};
module.exports = {
    // Thư viện KPI
    getKpiLibraryTree,
    createKpiInLibrary,
    updateKpiInLibrary,
    deleteKpiFromLibrary,
    // KPI Đơn vị
    getUnitKpiRegistrations,
    saveUnitKpiRegistrations,
    getUnitKpiMonthlyResults,
    saveUnitKpiMonthlyResults,
    // KPI Cá nhân
    findKpiPlanByEmployeeAndDate,
    upsertKpiPlan,
    findKpiPlansSummary,
    getSubordinatesForManager,
    getDashboardSummary,
};