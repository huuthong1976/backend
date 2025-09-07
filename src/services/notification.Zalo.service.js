// services/notification.service.js

const nodemailer = require('nodemailer');
const axios = require('axios');
const { generatePayslipPdf } = require('./pdf.service');

// --- EMAIL SERVICE ---

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    },
});

// 1. Khai báo hàm như một hằng số (const)
const sendEmailNotification = async (payslipData) => {
    return new Promise((resolve, reject) => {
        const doc = generatePayslipPdf(payslipData);
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            try {
                await transporter.sendMail({
                    from: `"BSC-KPI System" <${process.env.MAIL_USER}>`,
                    to: payslipData.email,
                    subject: `[Thông báo] Phiếu lương tháng ${payslipData.month}/${payslipData.year}`,
                    html: `<p>Xin chào ${payslipData.full_name},</p><p>Hệ thống gửi bạn phiếu lương chi tiết tháng ${payslipData.month}/${payslipData.year} trong file đính kèm.</p><p>Trân trọng,</p>`,
                    attachments: [{
                        filename: `Payslip_${payslipData.employee_code}_${payslipData.month}-${payslipData.year}.pdf`,
                        content: pdfData,
                        contentType: 'application/pdf',
                    }, ],
                });
                resolve({ message: 'Đã gửi email thành công.' });
            } catch (error) {
                console.error("Lỗi gửi mail:", error);
                reject(new Error('Gửi email thất bại.'));
            }
        });
        doc.end();
    });
};

// --- ZALO SERVICE ---

// 2. Khai báo hàm như một hằng số (const)
const sendZaloNotification = async (payslipData) => {
    const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
    const templateId = process.env.ZALO_TEMPLATE_ID;

    if (!accessToken || !templateId) {
        throw new Error('Chưa cấu hình Zalo Access Token hoặc Template ID.');
    }
    
    // Giả sử Zalo ID của người dùng được lưu trong trường `zalo_id` của bảng employees
    if (!payslipData.zalo_id) {
         throw new Error('Không tìm thấy Zalo ID của nhân viên.');
    }

    const apiUrl = 'https://business.zalo.me/api/oa/message/template';
    const body = {
        recipient: { user_id: payslipData.zalo_id },
        message: {
            attachment: {
                type: 'template',
                payload: {
                    id: templateId,
                    data: {
                        month: `${payslipData.month}/${payslipData.year}`,
                        net_salary: (Number(payslipData.net_salary) || 0).toLocaleString('vi-VN') + ' VNĐ',
                    },
                },
            },
        },
    };

    try {
        await axios.post(apiUrl, body, {
            headers: { 'access_token': accessToken },
        });
        return { message: 'Đã gửi thông báo Zalo thành công.' };
    } catch (error) {
        console.error("Lỗi gửi Zalo:", error.response ? error.response.data : error.message);
        throw new Error('Gửi Zalo thất bại.');
    }
};


// 3. Export một object chứa các hàm đã khai báo
module.exports = {
    sendEmailNotification,
    sendZaloNotification,
};