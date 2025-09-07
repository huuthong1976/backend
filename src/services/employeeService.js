// server/services/employeeService.js
const db = require('../config/db');

/**
 * Lấy danh sách nhân viên có phân trang, tìm kiếm, lọc và phân quyền.
 * @param {object} user - Thông tin người dùng đăng nhập (chứa role, company_id).
 * @param {object} filters - Các bộ lọc từ giao diện (page, limit, searchTerm, status, companyId, departmentId).
 * @returns {object} - Đối tượng chứa danh sách nhân viên và thông tin phân trang.
 */
const getAll = async (user, filters = {}) => {
    const {
        page = 1,
        limit = 10,
        searchTerm = '',
        status = null,
        companyId = null,
        departmentId = null
    } = filters;
    const offset = (page - 1) * limit;

    let baseSql = `
        FROM employees e
        LEFT JOIN positions pos ON e.position_id = pos.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.role != 'Admin'
    `;
    const params = [];

    // --- Logic Phân quyền ---
    if (user.role === 'manager') {
        baseSql += ' AND e.company_id = ?';
        params.push(user.company_id);
    } else if ((user.role === 'admin' || user.role === 'director') && companyId) {
        baseSql += ' AND e.company_id = ?';
        params.push(companyId);
    }

    // --- Logic Lọc & Tìm kiếm ---
    if (companyId) { // Nếu có companyId được gửi lên
        baseSql += ' AND e.company_id = ?'; // Thêm điều kiện lọc vào câu SQL
        params.push(companyId); // Thêm giá trị của companyId vào mảng tham số
    }

    if (status) {
        baseSql += ' AND e.status = ?';
        params.push(status);
    }
    if (departmentId) {
        baseSql += ' AND e.department_id = ?';
        params.push(departmentId);
    }
    if (searchTerm) {
        baseSql += ' AND (e.full_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    // --- Lấy tổng số bản ghi để phân trang ---
    const countSql = `SELECT COUNT(e.id) as total ${baseSql}`;
    const [totalRows] = await db.query(countSql, params);
    const totalItems = totalRows[0].total;
    
    // --- Lấy dữ liệu đã phân trang ---
    const dataSql = `
        SELECT 
            e.*, 
            pos.position_name, 
            d.department_name
        ${baseSql}
        ORDER BY e.full_name ASC
        LIMIT ? OFFSET ?;
    `;
    const [employees] = await db.query(dataSql, [...params, parseInt(limit), parseInt(offset)]);

    return {
        data: employees,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        },
    };
};

/**
 * Lấy thông tin chi tiết của một nhân viên bằng ID.
 */
const getById = async (id) => {
    // 1. Lấy thông tin hồ sơ chính
    const profileSql = `
        SELECT e.*, c.company_name, d.department_name, pos.position_name
        FROM employees e
        LEFT JOIN companies c ON e.company_id = c.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions pos ON e.position_id = pos.id
        WHERE e.id = ?;
    `;
    const [profileRows] = await db.query(profileSql, [id]);
    const profile = profileRows[0];

    if (!profile) {
        return null; // Trả về null nếu không tìm thấy nhân viên
    }

    // 2. Lấy danh sách hợp đồng (giả sử có bảng 'contracts')
    const contractsSql = 'SELECT * FROM employee_contracts WHERE employee_id = ? ORDER BY start_date DESC';
    const [contracts] = await db.query(contractsSql, [id]);

    // 3. Lấy danh sách quyết định (giả sử có bảng 'decisions')
    
    const decisionsSql = 'SELECT * FROM employee_decisions WHERE employee_id = ? AND deleted_at IS NULL ORDER BY effective_date DESC';
    const [decisions] = await db.query(decisionsSql, [id]);
    // 4. Gộp tất cả vào một object và trả về
    return {
        profile,
        contracts,
        decisions
    };
};
/**
 * Tạo mới một nhân viên sau khi kiểm tra các giá trị duy nhất.
 */
const create = async (employeeData) => {
    // Kiểm tra xem employee_code hoặc email đã tồn tại chưa
    const [existing] = await db.query(
        'SELECT id FROM employees WHERE employee_code = ? OR email = ?',
        [employeeData.employee_code, employeeData.email]
    );
    if (existing.length > 0) {
        throw new Error('Mã nhân viên hoặc email đã tồn tại.');
    }

    const { full_name, employee_code, email, /* ... các trường khác */ } = employeeData;
    const sql = 'INSERT INTO employees SET ?'; // Dùng SET ? cho an toàn và tiện lợi
    const [result] = await db.query(sql, [employeeData]);
    
    return getById(result.insertId);
};

/**
 * Cập nhật thông tin một nhân viên.
 */
const update = async (id, employeeData) => {
    const [result] = await db.query('UPDATE employees SET ? WHERE id = ?', [employeeData, id]);
    return result.affectedRows > 0;
};

/**
 * Cập nhật trạng thái cho một hoặc nhiều nhân viên.
 */
const updateStatus = async (ids, newStatus) => {
    const sql = 'UPDATE employees SET status = ? WHERE id IN (?)';
    const [result] = await db.query(sql, [newStatus, ids]);
    return result.affectedRows > 0;
};

/**
 * Xóa mềm một nhân viên (cập nhật trạng thái thành 'Đã nghỉ việc').
 */
const remove = async (id) => {
    return updateStatus([id], 'Đã nghỉ việc');
};

/**
 * Lấy danh sách nhân viên rút gọn để hiển thị trong các ô select/dropdown.
 */
const getEmployeeListForSelect = async (user, companyId) => {
    let sql = 'SELECT id, full_name, employee_code FROM employees WHERE status = "Đang làm việc"';
    const params = [];

    let companyToFilter = companyId;
    if (user.role === 'manager') {
        companyToFilter = user.company_id;
    }

    if (companyToFilter) {
        sql += ' AND company_id = ?';
        params.push(companyToFilter);
    }
    
    sql += ' ORDER BY full_name ASC';
    const [employees] = await db.query(sql, params);
    return employees;
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    updateStatus,
    remove,
    getEmployeeListForSelect,
};