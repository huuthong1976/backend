const axios = require('axios');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// Hàm hỗ trợ: Tạo file PDF trong bộ nhớ (dạng Buffer)
function generatePayslipPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const VND = (n) => (Number(n || 0)).toLocaleString('vi-VN');
      const total_deductions = Number(data.bhxh_deduction) + Number(data.bhyt_deduction) + Number(data.bhtn_deduction) + Number(data.personal_income_tax);

      doc.font('Helvetica-Bold').fontSize(16).text(data.company_name, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`PHIẾU LƯƠNG THÁNG ${data.month}/${data.year}`, { align: 'center' });
      doc.moveDown(2);

      doc.font('Helvetica').fontSize(10);
      doc.text(`Họ và tên: ${data.full_name}`);
      doc.text(`Mã NV: ${data.employee_code}`);
      doc.text(`Chức vụ: ${data.role}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('TỔNG THU NHẬP (GROSS):', { continued: true });
      doc.font('Helvetica').text(` ${VND(data.gross_salary)} VNĐ`);
      
      doc.font('Helvetica-Bold').text('TỔNG KHẤU TRỪ:', { continued: true });
      doc.font('Helvetica').text(` ${VND(total_deductions)} VNĐ`);
      
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(12).text('LƯƠNG THỰC NHẬN (NET):', { continued: true });
      doc.font('Helvetica-Bold').fontSize(12).text(` ${VND(data.net_salary)} VNĐ`);
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

const sendZaloNotification = async (data) => {
    const ZALO_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;
    const ZALO_TEMPLATE_ID = process.env.ZALO_ZNS_TEMPLATE_ID;

    if (!ZALO_ACCESS_TOKEN || !ZALO_TEMPLATE_ID) {
        throw new Error('Chưa cấu hình Zalo ZNS trên server.');
    }

    const payload = {
        phone: data.phone,
        template_id: ZALO_TEMPLATE_ID,
        template_data: {
            ho_ten: data.full_name,
            ky_luong: `Tháng ${data.month}/${data.year}`,
            luong_thuc_nhan: `${Number(data.net_salary).toLocaleString('vi-VN')} VNĐ`,
        },
    };

    const res = await axios.post('https://business.openapi.zalo.me/message/template', payload, {
        headers: { 'access_token': ZALO_ACCESS_TOKEN }
    });
    
    if (res.data.error !== 0) {
        throw new Error(res.data.message);
    }
};

const sendEmailNotification = async (data) => {
    if (!data.email) {
        throw new Error('Nhân viên này chưa có địa chỉ email.');
    }

    const pdfBuffer = await generatePayslipPdfBuffer(data);
    
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"${data.company_name}" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: `[Thông báo] Phiếu Lương Tháng ${data.month}/${data.year}`,
        html: `
            <p>Chào ${data.full_name},</p>
            <p>Phòng Kế toán gửi bạn phiếu lương chi tiết cho kỳ lương <strong>tháng ${data.month}/${data.year}</strong> trong file PDF đính kèm.</p>
            <p>Vui lòng không trả lời email này.</p>
            <p>Trân trọng,<br/><strong>${data.company_name}</strong></p>
        `,
        attachments: [
            {
                filename: `PhieuLuong_${data.employee_code}_${data.month}-${data.year}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });
};

module.exports = {
    sendZaloNotification,
    sendEmailNotification
};