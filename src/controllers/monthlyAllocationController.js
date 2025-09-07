// server/controllers/monthlyAllocationController.js
const monthlyAllocationService = require('../services/monthlyAllocationService');

const allocateMonthlyTargets = async (req, res) => {
    try {
        await monthlyAllocationService.saveMonthlyTargets(req.body);
        res.status(200).json({ success: true, message: 'Lưu phân bổ tháng thành công.' });
    } catch (error) {
        console.error("Lỗi khi lưu phân bổ tháng:", error);
        res.status(500).json({ error: 'Lỗi server khi lưu phân bổ tháng.' });
    }
};

module.exports = {
    allocateMonthlyTargets,
};