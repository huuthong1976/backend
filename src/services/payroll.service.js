
const { getPool } = require('../config/db');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const axios = require('axios');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');

// ====== Kết nối DB (điều chỉnh cho dự án của bạn) ======


const toNumber = (v) => Number(v || 0);

// ====== Hằng số tính lương 3P theo vai trò ======
const ROLE_3P_CONFIG = {
    TongGiamDoc: { p1: 0.50, p2: 0.20, p3: 0.30 },
    TruongDonVi: { p1: 0.50, p2: 0.20, p3: 0.30 },
    PhoDV:       { p1: 0.50, p2: 0.20, p3: 0.30 },
    Truongphong: { p1: 0.45, p2: 0.25, p3: 0.30 },
    Phophong:    { p1: 0.45, p2: 0.35, p3: 0.20 },
    NhanVienCM:  { p1: 0.45, p2: 0.40, p3: 0.15 },
    NhanvienKD:  { p1: 0.30, p2: 0.20, p3: 0.50 },
    NhanvienPT:  { p1: 0.40, p2: 0.20, p3: 0.40 },
};

function calculateInsurance(baseSalaryForInsurance) {
    const salary = toNumber(baseSalaryForInsurance);
    const bhxh = salary * 0.25;
    const bhyt = salary * 0.045;
    const bhtn = salary * 0.02;
    const bhtnld = salary * 0.005;
    const unionFee = salary * 0.01;
    return { bhxh, bhyt, bhtn, bhtnld, unionFee, total: bhxh + bhyt + bhtn + bhtnld + unionFee };
}

function calculatePIT(taxableIncome) {
    const tntt = toNumber(taxableIncome);
    if (tntt <= 0) return 0;
    if (tntt <= 5e6) return tntt * 0.05;
    if (tntt <= 10e6) return 250e3 + (tntt - 5e6) * 0.10;
    if (tntt <= 18e6) return 750e3 + (tntt - 10e6) * 0.15;
    if (tntt <= 32e6) return 1950e3 + (tntt - 18e6) * 0.20;
    if (tntt <= 52e6) return 4750e3 + (tntt - 32e6) * 0.25;
    if (tntt <= 80e6) return 9750e3 + (tntt - 52e6) * 0.30;
    return 18150e3 + (tntt - 80e6) * 0.35;
}

function recalculateNetSalary(payrollRow) {
    const toNumber = (v) => Number(v || 0);

    // --- THU NHẬP ---
    const luongKPI = toNumber(payrollRow.luong_kpi);
    const luongBH = toNumber(payrollRow.luongBH);
    const actualWorkdays = toNumber(payrollRow.actual_workdays);
    
    // Các khoản cộng thêm từ người dùng
    const holidayDays = toNumber(payrollRow.holiday_workdays); // Sửa tên biến cho khớp với input
    const overtime200Days = toNumber(payrollRow.workdays_200_percent); // Sửa tên biến
    const overtime300Days = toNumber(payrollRow.workdays_300_percent); // Sửa tên biến
    const otherAdditions = toNumber(payrollRow.other_additions);
    const bonus = toNumber(payrollRow.bonus); // Giữ lại bonus và allowances nếu có
    const allowances = toNumber(payrollRow.allowances);

    // --- KHẤU TRỪ ---
    const bhxh = toNumber(payrollRow.bhxh_deduction);
    const bhyt = toNumber(payrollRow.bhyt_deduction);
    const bhtn = toNumber(payrollRow.bhtn_deduction);
    const bhtnld = toNumber(payrollRow.bhtnld_deduction);
    const unionFee = toNumber(payrollRow.union_fee);
    const personalIncomeTax = toNumber(payrollRow.personal_income_tax);
    const otherDeductions = toNumber(payrollRow.other_deductions); // Khoản trừ khác

    // --- TÍNH TOÁN ---
    const standardWorkdays = 26;
    const salaryBasedOnWorkdays = (luongKPI / standardWorkdays) * actualWorkdays;
    const dailyRateKPI = luongKPI / standardWorkdays;
    const dailyRateBH = luongBH / standardWorkdays;
    
    const holidayPay = dailyRateBH * holidayDays;
    const overtime200Pay = dailyRateKPI * overtime200Days * 2;
    const overtime300Pay = dailyRateKPI * overtime300Days * 3;
    
    // TÍNH TỔNG THU NHẬP MỚI
    const totalAdditions = salaryBasedOnWorkdays + holidayPay + overtime200Pay + overtime300Pay + bonus + allowances + otherAdditions;
    
    // TÍNH TỔNG TRỪ MỚI
    const totalDeductions = bhxh + bhyt + bhtn + bhtnld + unionFee + personalIncomeTax + otherDeductions;
    
    const netSalary = totalAdditions - totalDeductions;
    
    return netSalary;
}

async function getKpiScores(conn, employeeId, companyId, month, year) {
    let kpiCaNhan = 1.0;
    let kpiDonVi = 1.0;

    try {
        const individualKpiSql = `
            SELECT SUM(final_score) / 100 AS kpi_result
            FROM kpi_plans
            WHERE employee_id = ? AND month = ? AND year = ? AND status = 'Hoàn thành'`;
        const [individualRows] = await conn.query(individualKpiSql, [employeeId, month, year]);
        if (individualRows.length > 0 && individualRows[0].kpi_result !== null) {
            kpiCaNhan = toNumber(individualRows[0].kpi_result);
        }

        const unitKpiSql = `
            SELECT total_score 
            FROM company_kpi_monthly_summary
            WHERE company_id = ? AND month = ? AND year = ?
        `;
        const [unitRows] = await conn.query(unitKpiSql, [companyId, month, year]);
        if (unitRows.length > 0 && unitRows[0].total_score !== null) {
            kpiDonVi = toNumber(unitRows[0].total_score) / 100.0;
        }

    } catch (e) {
        console.error(`Lỗi khi lấy KPI cho nhân viên ${employeeId}:`, e.message);
    }
    
    return { kpiCaNhan, kpiDonVi };
}

// =======================================================================
//   Service layer functions
// =======================================================================

const getCompanies = async () => {
    const pool = getPool();
    if (!pool) throw new Error('Không thể kết nối đến cơ sở dữ liệu.');
    const [companies] = await pool.query('SELECT id, company_name FROM companies ORDER BY company_name');
    return companies;
};

const getDepartments = async (companyId) => {
    const pool = getPool();
    const [departments] = await pool.query(
        'SELECT id, department_name FROM departments WHERE company_id = ? ORDER BY department_name',
        [companyId]
    );
    return departments;
};

const getPayrollSummary = async (company_id, department_id, month, year) => {
    const pool = getPool();
    let sql = `
        SELECT
            e.id AS employee_id, 
            e.employee_code, 
            e.full_name, 
            e.role,
            pos.position_name,
            e.total_salary AS luong_quyet_dinh,
            e.base_salary_for_insurance AS luongBH,
            e.union_fee,
            p.*
        FROM employees e
        LEFT JOIN payrolls p ON p.employee_id = e.id AND p.month = ? AND p.year = ?
        LEFT JOIN positions pos ON e.position_id = pos.id
        WHERE e.company_id = ? AND e.role != 'Admin' AND e.status = 'Đang làm việc'
    `;

    const params = [Number(month), Number(year), Number(company_id)];

    if (department_id && department_id !== 'all') {
        sql += ' AND e.department_id = ?';
        params.push(department_id);
    }
    
    sql += ' ORDER BY e.employee_code';
    const [rows] = await pool.query(sql, params);

    const processedRows = rows.map(row => {
        let result = { ...row };
        if (row.id === null) {
            const luongQD = toNumber(row.luong_quyet_dinh);
            const config3P = ROLE_3P_CONFIG[row.role] || { p1: 0.5, p2: 0.25, p3: 0.25 };
            const p1 = luongQD * config3P.p1;
            const p2 = luongQD * config3P.p2;
            const p3 = luongQD * config3P.p3;
            result = {
                ...row,
                p1_salary: p1,
                p2_salary: p2,
                p3_salary: p3,
                kpi_don_vi: null,
                kpi_ca_nhan: null,
                luong_kpi: 0,
                net_salary: 0,
            };
        }
        
        const standardWorkdays = 26;
        const luongBH = toNumber(result.luongBH);
        const dailyRate = toNumber(result.luong_quyet_dinh) / standardWorkdays;
        const holidayPay = toNumber(luongBH / standardWorkdays) * toNumber(result.holiday_days);
        const overtime200Pay = dailyRate * toNumber(result.overtime_200_days) * 2;
        const overtime300Pay = dailyRate * toNumber(result.overtime_300_days) * 3;
        
        const tongThuNhap =
            toNumber(result.luong_kpi) +
            toNumber(result.bonus) +
            toNumber(result.allowances) +
            toNumber(result.other_additions) +
            holidayPay +
            overtime200Pay +
            overtime300Pay;
        
        const tongTru =
            toNumber(result.bhxh_deduction) +
            toNumber(result.bhyt_deduction) +
            toNumber(result.bhtn_deduction) +
            toNumber(result.bhtnld_deduction) +
            toNumber(result.union_fee) +
            toNumber(result.solidarity_fee) +
            toNumber(result.welfare_fund_deduction) +
            toNumber(result.personal_income_tax) +
            toNumber(result.other_deductions);
        
        return { ...result, tongThuNhap, tongTru };
    });

    return processedRows;
};

const calculateAndSavePayroll = async (data) => {
    const { month, year, company_id, employee_data } = data;

    // Nếu không có dữ liệu nhân viên được gửi lên, báo lỗi
    if (!employee_data || !Array.isArray(employee_data)) {
        throw new Error('Không tìm thấy dữ liệu nhân viên để tính lương.');
    }

    const dbPool = getPool();
    let conn;
    try {
        conn = await dbPool.getConnection();
        await conn.beginTransaction();

        // Lặp qua từng nhân viên được gửi lên từ frontend
        for (const empData of employee_data) {
            // Lấy các giá trị người dùng đã nhập
            const actual_workdays = toNumber(empData.actual_workdays);
            const bonus = toNumber(empData.bonus);
            const allowances = toNumber(empData.allowances);
            const other_additions = toNumber(empData.other_additions);
            const other_deductions = toNumber(empData.other_deductions);
            
            // Lấy thông tin gốc của nhân viên từ DB để tính toán
            const [empInfoRows] = await conn.query(
                'SELECT role, total_salary, union_fee, base_salary_for_insurance, num_dependents FROM employees WHERE id = ?', 
                [empData.employee_id]
            );
            if (empInfoRows.length === 0) continue; // Bỏ qua nếu không tìm thấy nhân viên
            const empInfo = empInfoRows[0];

            // === TÍNH TOÁN LẠI TỪ ĐẦU DỰA TRÊN DỮ LIỆU ĐÃ NHẬP ===

            // 1. Tính lương KPI dựa trên ngày công thực tế
            const luongQD = toNumber(empInfo.total_salary);
            const config3P = ROLE_3P_CONFIG[empInfo.role] || { p1: 0.5, p2: 0.25, p3: 0.25 };
            const p1 = luongQD * config3P.p1;
            const p2 = luongQD * config3P.p2;
            const p3 = luongQD * config3P.p3;
            const { kpiCaNhan, kpiDonVi } = await getKpiScores(conn, empData.employee_id, company_id, month, year);
            
            const standardWorkdays = 26;
            const potential_kpi_salary = p1 + (p2 * kpiDonVi) + (p3 * kpiCaNhan);
            const luong_kpi_thuc_te = (potential_kpi_salary / standardWorkdays) * actual_workdays;

            // 2. Tính Tổng Thu Nhập mới
            const tongThuNhap = luong_kpi_thuc_te + bonus + allowances + other_additions;

            // 3. Tính các khoản khấu trừ
            const insurance = calculateInsurance(empInfo.base_salary_for_insurance);
            const unionFee = toNumber(empInfo.union_fee);
            const personalRelief = 11000000;
            const dependentRelief = toNumber(empInfo.num_dependents) * 4400000;
            const taxableIncome = Math.max(0, tongThuNhap - (personalRelief + dependentRelief + insurance.total));
            const personalIncomeTax = calculatePIT(taxableIncome);

            const tongTru = insurance.total + personalIncomeTax + unionFee + other_deductions;

            // 4. Tính Lương Thực Nhận cuối cùng
            const netSalary = tongThuNhap - tongTru;

            // Chuẩn bị dữ liệu để lưu vào DB
            const payrollRecord = {
                employee_id: empData.employee_id, month, year, company_id,
                luong_quyet_dinh: luongQD, p1_salary: p1, p2_salary: p2, p3_salary: p3,
                kpi_don_vi: kpiDonVi, kpi_ca_nhan: kpiCaNhan,
                luong_kpi: luong_kpi_thuc_te,
                actual_workdays, bonus, allowances, other_additions, other_deductions, // LƯU CÁC GIÁ TRỊ ĐÃ NHẬP
                gross_salary: tongThuNhap,
                bhxh_deduction: insurance.bhxh, bhyt_deduction: insurance.bhyt, bhtn_deduction: insurance.bhtn,
                bhtnld_deduction: insurance.bhtnld, union_fee: unionFee, personal_income_tax: personalIncomeTax,
                net_salary: netSalary,
                status: 'calculated',
            };
            
            // Câu lệnh INSERT...ON DUPLICATE KEY UPDATE sẽ tự động tạo mới hoặc cập nhật nếu đã có bản ghi
            await conn.query(
                `INSERT INTO payrolls (
                    employee_id, month, year, company_id, luong_quyet_dinh, p1_salary, p2_salary, p3_salary,
                    kpi_don_vi, kpi_ca_nhan, luong_kpi, actual_workdays, bonus, allowances, other_additions,
                    other_deductions, gross_salary, bhxh_deduction, bhyt_deduction, bhtn_deduction, bhtnld_deduction,
                    union_fee, personal_income_tax, net_salary, status
                ) VALUES (
                    :employee_id, :month, :year, :company_id, :luong_quyet_dinh, :p1_salary, :p2_salary, :p3_salary,
                    :kpi_don_vi, :kpi_ca_nhan, :luong_kpi, :actual_workdays, :bonus, :allowances, :other_additions,
                    :other_deductions, :gross_salary, :bhxh_deduction, :bhyt_deduction, :bhtn_deduction, :bhtnld_deduction,
                    :union_fee, :personal_income_tax, :net_salary, :status
                ) ON DUPLICATE KEY UPDATE 
                    luong_quyet_dinh=VALUES(luong_quyet_dinh), p1_salary=VALUES(p1_salary), p2_salary=VALUES(p2_salary), 
                    p3_salary=VALUES(p3_salary), kpi_don_vi=VALUES(kpi_don_vi), kpi_ca_nhan=VALUES(kpi_ca_nhan), 
                    luong_kpi=VALUES(luong_kpi), actual_workdays=VALUES(actual_workdays), bonus=VALUES(bonus), 
                    allowances=VALUES(allowances), other_additions=VALUES(other_additions), other_deductions=VALUES(other_deductions), 
                    gross_salary=VALUES(gross_salary), bhxh_deduction=VALUES(bhxh_deduction), bhyt_deduction=VALUES(bhyt_deduction), 
                    bhtn_deduction=VALUES(bhtn_deduction), bhtnld_deduction=VALUES(bhtnld_deduction), union_fee=VALUES(union_fee), 
                    personal_income_tax=VALUES(personal_income_tax), net_salary=VALUES(net_salary), status=VALUES(status), 
                    updated_at=NOW()`,
                payrollRecord
            );
        }
        await conn.commit();
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Lỗi khi tính lương:', err);
        throw new Error('Tính lương thất bại. Vui lòng kiểm tra log server.');
    } finally {
        if (conn) conn.release();
    }
};

const saveAdjustments = async (data) => {
    const { month, year, adjustments } = data;
    const dbPool = getPool();
    let conn;
    try {
        conn = await dbPool.getConnection();
        await conn.beginTransaction();
        for (const employeeRow of adjustments) {
            const newNetSalary = recalculateNetSalary(employeeRow);
            const updateSql = `
                UPDATE payrolls SET
                    actual_workdays = :actual_workdays,
                    holiday_days = :holiday_days,
                    overtime_200_days = :overtime_200_days,
                    overtime_300_days = :overtime_300_days,
                    bonus = :bonus,
                    allowances = :allowances,
                    other_additions = :other_additions,
                    union_fee = :union_fee,
                    solidarity_fee = :solidarity_fee,
                    other_deductions = :other_deductions,
                    net_salary = :net_salary,
                    status = 'updated',
                    updated_at = NOW()
                WHERE employee_id = :employee_id AND month = :month AND year = :year`;
            await conn.query(updateSql, { ...employeeRow, net_salary: newNetSalary, month, year });
        }
        await conn.commit();
    } catch (err) {
        if (conn) await conn.rollback();
        throw new Error('Lưu thay đổi thất bại. Vui lòng kiểm tra log server.');
    } finally {
        if (conn) conn.release();
    }
};

const getPayslipData = async (employeeId, companyId, month, year) => {
    const pool = getPool();
    const [rows] = await pool.query(
        `
        SELECT 
            e.employee_code, e.full_name, e.role, e.phone, e.email,
            c.company_name,
            p.*
        FROM payrolls p
        JOIN employees e ON p.employee_id = e.id
        JOIN companies c ON p.company_id = c.id
        WHERE p.employee_id = ? AND p.company_id = ? AND p.month = ? AND p.year = ?
        LIMIT 1
        `,
        [Number(employeeId), Number(companyId), Number(month), Number(year)]
    );
    if (!rows.length) {
        throw new Error('Không tìm thấy phiếu lương.');
    }
    return rows[0];
};

const exportPayroll = async (params) => {
    const pool = getPool();
    const { company_id, month, year } = params;
    const [rows] = await pool.query(
        `
        SELECT e.employee_code AS MNV, e.full_name AS HoTen, e.role AS VaiTro,
               p.p1_salary AS P1, p.p2_salary AS P2, p.p3_salary AS P3,
               p.allowances AS PhuCap, p.other_additions AS BoSung,
               p.gross_salary AS Gross,
               p.bhxh_deduction AS BHXH, p.bhyt_deduction AS BHYT, p.bhtn_deduction AS BHTN, p.bhtnld_deduction AS BHTNLD,
               p.union_fee AS CongDoan,
               p.net_salary AS Net
        FROM payrolls p
        JOIN employees e ON e.id = p.employee_id
        WHERE p.company_id=? AND p.month=? AND p.year=?
        ORDER BY e.employee_code
        `,
        [Number(company_id), Number(month), Number(year)]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('BangLuong');

    ws.addRow([
      'MÃ NV', 'HỌ TÊN', 'VAI TRÒ',
      'P1', 'P2', 'P3', 'PHỤ CẤP', 'BỔ SUNG',
      'GROSS', 'BHXH', 'BHYT', 'BHTN', 'BHTNLD','CÔNG ĐOÀN', 'NET',
    ]);
    rows.forEach((r) => ws.addRow(Object.values(r)));
    return wb;
};

const createTemplate = () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template');
    ws.addRow([
        'employee_code', 'allowances', 'other_additions',
        'override_p1', 'override_p2', 'override_p3',
    ]);
    ws.addRow(['TDN01',  500000, 0, '', '', '']);
    ws.addRow(['TDN02',  0,      200000, '', '', '']);
    return wb;
};

const importAdjustments = async (file, params) => {
    const pool = getPool();
    const { company_id, month, year } = params;
    const wb = xlsx.read(file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    for (const r of rows) {
        const code = (r.employee_code || r.MNV || '').toString().trim();
        if (!code) continue;
        const [empRows] = await pool.query('SELECT id FROM employees WHERE employee_code=? AND company_id=? LIMIT 1', [code, Number(company_id)]);
        if (!empRows.length) continue;
        const empId = empRows[0].id;
        const allowances = toNumber(r.allowances);
        const other = toNumber(r.other_additions);
        const oP1 = r.override_p1 !== '' ? toNumber(r.override_p1) : null;
        const oP2 = r.override_p2 !== '' ? toNumber(r.override_p2) : null;
        const oP3 = r.override_p3 !== '' ? toNumber(r.override_p3) : null;
        await pool.query(
            `
            INSERT INTO payrolls
              (employee_id, company_id, month, year, allowances, other_additions, p1_salary, p2_salary, p3_salary, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
              allowances = VALUES(allowances),
              other_additions = VALUES(other_additions),
              p1_salary = COALESCE(VALUES(p1_salary), p1_salary),
              p2_salary = COALESCE(VALUES(p2_salary), p2_salary),
              p3_salary = COALESCE(VALUES(p3_salary), p3_salary),
              updated_at = NOW()
            `,
            [empId, Number(company_id), Number(month), Number(year), allowances, other, oP1, oP2, oP3]
        );
    }
};

module.exports = {
    getCompanies,
    getDepartments,
    getPayrollSummary,
    calculateAndSavePayroll,
    saveAdjustments,
    getPayslipData,
    exportPayroll,
    createTemplate,
    importAdjustments,
};