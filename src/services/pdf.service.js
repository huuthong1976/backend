// services/pdf.service.js

const PDFDocument = require('pdfkit');
const path = require('path');

const formatVND = (num) => (Number(num) || 0).toLocaleString('vi-VN') + ' VNĐ';

// Thay đổi 1: Khai báo hàm như một hằng số (const) thay vì gán vào `exports`
const generatePayslipPdf = (data) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });

    // Giả sử bạn có thư mục assets/fonts ở thư mục gốc của server
    const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Regular.ttf');
    const fontBoldPath = path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Bold.ttf');
    
    // Đăng ký font hỗ trợ tiếng Việt
    doc.registerFont('Roboto', fontPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);

    doc.font('Roboto-Bold').fontSize(16).text(`PHIẾU LƯƠNG THÁNG ${data.month}/${data.year}`, { align: 'center' });
    doc.moveDown();

    doc.font('Roboto-Bold').fontSize(12).text(data.company_name, { align: 'center' });
    doc.moveDown(2);

    // Thông tin nhân viên
    doc.font('Roboto-Bold').text('Họ và tên:', { continued: true });
    doc.font('Roboto').text(` ${data.full_name}`);
    doc.font('Roboto-Bold').text('Mã NV:', { continued: true });
    doc.font('Roboto').text(` ${data.employee_code}`);
    doc.font('Roboto-Bold').text('Chức vụ:', { continued: true });
    doc.font('Roboto').text(` ${data.position_name || data.role}`);
    doc.moveDown();

    // Bảng lương
    const tableTop = doc.y;
    const itemX = 40;
    const descriptionX = 60;
    const amountX = 280;

    const drawRow = (y, item, amount) => {
        doc.font('Roboto').fontSize(10).text(item, descriptionX, y);
        doc.font('Roboto').text(amount, amountX, y, { align: 'right' });
    };

    doc.font('Roboto-Bold').text('KHOẢN THU NHẬP', itemX, tableTop);
    drawRow(tableTop + 20, 'Lương KPI', formatVND(data.luong_kpi));
    drawRow(tableTop + 40, 'Các khoản cộng khác', formatVND(data.other_additions));
    doc.font('Roboto-Bold').text('Tổng thu nhập', descriptionX, tableTop + 60);
    doc.font('Roboto-Bold').text(formatVND(data.tongThuNhap || data.gross_salary), amountX, tableTop + 60, { align: 'right' });

    const table2Top = tableTop + 90;
    doc.font('Roboto-Bold').text('KHOẢN KHẤU TRỪ', itemX, table2Top);
    drawRow(table2Top + 20, 'Bảo hiểm, Thuế TNCN, Phí...', formatVND(data.tongTru));

    // Lương thực nhận
    doc.moveDown(8);
    doc.font('Roboto-Bold').fontSize(14).text('THỰC NHẬN: ' + formatVND(data.net_salary), { align: 'center' });

    return doc;
};

// Thay đổi 2: Export một object chứa hằng số vừa khai báo
module.exports = {
    generatePayslipPdf,
};