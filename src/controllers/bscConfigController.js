// server/controllers/bscConfigController.js
const bscConfigService = require('../services/bscConfigService');

exports.getBscWeights = async (req, res) => {
    try {
        // ✅ Lấy company_id và year từ query params
        const { company_id, year } = req.query; 
        const weights = await bscConfigService.getBscWeights(company_id, year);
        res.json(weights);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy tỷ trọng BSC' });
    }
};

exports.updateBscWeights = async (req, res) => {
    try {
        // ✅ Lấy company_id, year, và weights từ body
        const { company_id, year, weights } = req.body;
        await bscConfigService.updateBscWeights(company_id, year, weights);
        res.json({ message: 'Cập nhật tỷ trọng BSC thành công!' });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Cập nhật thất bại.' });
    }
};
// ✅ Hàm mới để lấy tất cả các khía cạnh
exports.getBscPerspectives = async (req, res) => {
    try {
        const perspectives = await bscConfigService.getBscPerspectives();
        res.json(perspectives);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách khía cạnh' });
    }
};