const axios = require('axios');

async function sendZaloNotification(payslipData, zaloUserId) {
    const ZALO_API_URL = 'https://business.openapi.zalo.me/message/template';
    const ACCESS_TOKEN = 'YOUR_ZALO_OA_ACCESS_TOKEN'; // Thay bằng token của bạn
    const TEMPLATE_ID = 'YOUR_ZNS_TEMPLATE_ID'; // Thay bằng template ID của bạn

    const messageData = {
        phone: zaloUserId, // Hoặc phone number nếu Zalo user ID không có
        template_id: TEMPLATE_ID,
        template_data: {
            // Dữ liệu tương ứng với template bạn đã đăng ký
            "thang": `${payslipData.payPeriod.month}/${payslipData.payPeriod.year}`,
            "ten_nhan_vien": payslipData.employeeInfo.employeeName,
            "thuc_linh": payslipData.final.net_salary.toLocaleString('vi-VN')
        },
    };

    try {
        const response = await axios.post(ZALO_API_URL, messageData, {
            headers: { 'access_token': ACCESS_TOKEN }
        });
        
        console.log('Zalo notification sent:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending Zalo notification:', error.response.data);
        return { success: false, error: error.response.data };
    }
}

module.exports = { sendZaloNotification };