// server/controllers/companyKpiResultsController.js
const companyKpiResultsService = require('../services/companyKpiResultsService');

const getResults = async (req, res) => {
    try {
        const { companyId, year, month } = req.query;
        if (!companyId || !year || !month) {
            return res.status(400).json({ error: 'Thiếu tham số companyId, year, hoặc month' });
        }
        // Lấy dữ liệu chi tiết KPI con
        const detailedResults = await companyKpiResultsService.get(req.query);
        
        // Lấy dữ liệu tổng hợp từ bảng summary
        const totalScore = await companyKpiResultsService.getMonthlySummary(companyId, year, month);

        res.status(200).json({
            detailedResults: detailedResults,
            totalScore: totalScore
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu kết quả KPI.' });
    }
};

const saveResults = async (req, res) => {
    try {
        await companyKpiResultsService.save(req.body);
        res.status(200).json({ success: true, message: 'Lưu kết quả thành công.' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Lỗi server khi lưu kết quả KPI.' });
    }
};

const getSummary = async (req, res) => {
    try {
        const { companyId, year, month } = req.query;
        if (!companyId || !year || !month) {
            return res.status(400).json({ error: 'Thiếu tham số cần thiết.' });
        }
        const score = await companyKpiResultsService.getMonthlySummary(companyId, year, month);
        res.status(200).json(score);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu tổng hợp KPI.' });
    }
};

module.exports = {
    getResults,
    saveResults,
    getSummary,
};