const payrollService = require('../services/payroll.service');
const excelService = require('../services/excel.service');
const pdfService = require('../services/pdf.service');
const notificationService = require('../services/notification.Zalo.service');

// API Lấy dữ liệu
exports.getCompanies = async (req, res) => {
    try {
        const companies = await payrollService.getCompanies();
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: 'Không tải được danh sách công ty.' });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const departments = await payrollService.getDepartments(req.query.company_id);
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: 'Không tải được danh sách phòng ban.' });
    }
};

exports.getPayrollSummary = async (req, res) => {
    try {
        const { company_id, department_id, month, year } = req.query;
        const payrollData = await payrollService.getPayrollSummary(company_id, department_id, month, year);
        res.json(payrollData);
    } catch (err) {
        res.status(500).json({ error: 'Không tải được bảng lương.' });
    }
};

exports.getPayslipDetail = async (req, res) => {
    try {
        const { employee_id, company_id, month, year } = req.query;
        const detail = await payrollService.getPayslipData(employee_id, company_id, month, year);
        if (!detail) return res.status(404).json({ error: 'Không tìm thấy phiếu lương.' });
        res.json(detail);
    } catch (err) {
        res.status(500).json({ error: 'Không tải được phiếu lương.' });
    }
};

// API Hành động
exports.calculatePayroll = async (req, res) => {
    try {
        await payrollService.calculateAndSavePayroll(req.body);
        res.json({ message: 'Đã tính lương thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveAdjustments = async (req, res) => {
    try {
        await payrollService.saveAdjustments(req.body);
        res.json({ message: 'Đã lưu thay đổi thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.importAdjustments = async (req, res) => {
    try {
        await excelService.importAdjustments(req.file, req.query);
        res.json({ ok: true, message: 'Nhập dữ liệu thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// API Xuất file & Thông báo
exports.exportPayroll = async (req, res) => {
    try {
        const workbook = await excelService.exportPayroll(req.query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Luong_${req.query.month}_${req.query.year}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Xuất Excel thất bại.' });
    }
};

exports.downloadTemplate = async (req, res) => {
    try {
        const workbook = excelService.createTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Bang_luong_mau.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Không tải được template.' });
    }
};

exports.exportPayslipPdf = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(req.body.employee_id, req.body.company_id, req.body.month, req.body.year);
        const doc = pdfService.generatePayslipPdf(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PhieuLuong_${data.employee_code}_${data.month}-${data.year}.pdf"`);
        doc.pipe(res);
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendZaloNotification = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(req.body.employee_id, req.body.company_id, req.body.month, req.body.year);
        await notificationService.sendZaloNotification(data);
        res.json({ ok: true, message: 'Đã gửi thông báo Zalo thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendEmailNotification = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(req.body.employee_id, req.body.company_id, req.body.month, req.body.year);
        await notificationService.sendEmailNotification(data);
        res.json({ ok: true, message: 'Đã gửi email thành công.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Hàm mới để xuất Excel chi tiết
exports.exportPayslipExcel = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(
            req.body.employee_id, req.body.company_id, req.body.month, req.body.year
        );
        const workbook = excelService.exportSinglePayslipExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Payslip_${data.employee_code}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message || 'Xuất Excel thất bại.' });
    }
};

exports.exportPayslipPdf = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(req.body.employee_id, req.body.company_id, req.body.month, req.body.year);
        const doc = pdfService.generatePayslipPdf(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Payslip_${data.employee_code}.pdf"`);
        doc.pipe(res);
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendZaloNotification = async (req, res) => {
    try {
        // Cần lấy thêm zalo_id từ DB. Bạn cần cập nhật getPayslipData để lấy thêm trường này
        const data = await payrollService.getPayslipData(req.body.employee_id, null, req.body.month, req.body.year);
        const result = await notificationService.sendZaloNotification(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendEmailNotification = async (req, res) => {
    try {
        const data = await payrollService.getPayslipData(req.body.employee_id, null, req.body.month, req.body.year);
        const result = await notificationService.sendEmailNotification(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};