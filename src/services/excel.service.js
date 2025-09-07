const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');

// ====== Kết nối DB (điều chỉnh cho dự án của bạn) ======
let pool = null;
const getPool = () => {
    if (!pool) {
        pool = mysql.createPool({
            // SỬA LỖI 1: Đọc đúng tên biến môi trường từ file .env
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '', // Sửa từ DB_PASS
            database: process.env.DB_DATABASE || 'bsc_kpi', // Sửa từ DB_NAME
            waitForConnections: true,
            connectionLimit: 10,
            namedPlaceholders: true,
        });
    }
    return pool;
};

const toNumber = (v) => Number(v || 0);

const exportPayroll = async (params) => {
    // ... (Hàm này đã đúng, giữ nguyên)
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
    // ... (Hàm này đã đúng, giữ nguyên)
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
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null }); // Dùng defval: null để dễ kiểm tra

    for (const r of rows) {
        const code = r.employee_code ? String(r.employee_code).trim() : null;
        if (!code) continue;

        const [empRows] = await pool.query('SELECT id FROM employees WHERE employee_code=? AND company_id=? LIMIT 1', [code, Number(company_id)]);
        if (!empRows.length) continue;

        const empId = empRows[0].id;
        const allowances = toNumber(r.allowances);
        const other = toNumber(r.other_additions);
        const oP1 = r.override_p1 != null ? toNumber(r.override_p1) : null;
        const oP2 = r.override_p2 != null ? toNumber(r.override_p2) : null;
        const oP3 = r.override_p3 != null ? toNumber(r.override_p3) : null;
        
        // SỬA LỖI 2: Thêm dòng lệnh `await pool.query` để thực thi câu lệnh SQL
        await pool.query(
            `
            INSERT INTO payrolls
              (employee_id, company_id, month, year, allowances, other_additions, p1_salary, p2_salary, p3_salary, updated_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'updated')
            ON DUPLICATE KEY UPDATE
              allowances = VALUES(allowances),
              other_additions = VALUES(other_additions),
              p1_salary = COALESCE(?, p1_salary),
              p2_salary = COALESCE(?, p2_salary),
              p3_salary = COALESCE(?, p3_salary),
              status = 'updated',
              updated_at = NOW()
            `,
            [empId, Number(company_id), Number(month), Number(year), allowances, other, oP1, oP2, oP3, oP1, oP2, oP3]
        );
    }
};

const exportSinglePayslipExcel = (data) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Payslip ${data.employee_code}`);

    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = `PHIẾU LƯƠNG THÁNG ${data.month}/${data.year}`;
    sheet.getCell('A1').font = { size: 16, bold: true };

    sheet.addRow(['Họ và tên', data.full_name]);
    sheet.addRow(['Mã NV', data.employee_code]);
    sheet.addRow(['Chức vụ', data.position_name || data.role]);
    sheet.addRow([]);

    const addRowWithStyle = (label, value, isBold = false) => {
        const row = sheet.addRow([label, value]);
        if (isBold) row.font = { bold: true };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(2).numFmt = '#,##0';
    };

    addRowWithStyle('KHOẢN THU NHẬP', '', true);
    addRowWithStyle('Lương KPI', data.luong_kpi);
    addRowWithStyle('Thưởng', data.bonus);
    addRowWithStyle('Phụ cấp', data.allowances);
    addRowWithStyle('Cộng khác', data.other_additions);
    addRowWithStyle('Tổng Thu Nhập', data.tongThuNhap, true);
    sheet.addRow([]);

    addRowWithStyle('KHOẢN KHẤU TRỪ', '', true);
    // SỬA LỖI 3: Thêm bhtnld_deduction vào tổng bảo hiểm
    const totalInsurance = toNumber(data.bhxh_deduction) + toNumber(data.bhyt_deduction) + toNumber(data.bhtn_deduction) + toNumber(data.bhtnld_deduction);
    addRowWithStyle('Bảo hiểm (BHXH, BHYT, BHTN...)', totalInsurance);
    addRowWithStyle('Thuế TNCN', data.personal_income_tax);
    addRowWithStyle('Trừ khác', data.other_deductions);
    addRowWithStyle('Tổng Khấu Trừ', data.tongTru, true);
    sheet.addRow([]);

    addRowWithStyle('LƯƠNG THỰC NHẬN (NET)', data.net_salary, true);
    sheet.getRow(sheet.lastRow.number).font = { size: 14, bold: true };

    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 20;

    return workbook;
};

// Cập nhật lại phần exports
module.exports = {
    exportPayroll,
    createTemplate,
    importAdjustments,
    exportSinglePayslipExcel,
};