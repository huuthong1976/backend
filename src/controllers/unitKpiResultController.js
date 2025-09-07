// server/controllers/unitKpiResultController.js
const resultService = require('../services/unitKpiResultService');

const getResults = async (req, res) => {
    try {
        const { companyId, year, month } = req.params;
        const results = await resultService.getMonthlyResults(companyId, year, month);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy kết quả KPI.' });
    }
};

const saveResults = async (req, res) => {
    try {
        await resultService.saveMonthlyResults(req.body);
        res.status(200).json({ success: true, message: 'Lưu kết quả thành công.' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lưu kết quả KPI.' });
    }
};

module.exports = { getResults, saveResults };