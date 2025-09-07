// server/services/bscConfigService.js
const db = require('../models');

// ✅ Sửa lại hàm để lọc theo company_id và year
const getBscWeights = async (companyId, year) => {
    return await db.BscWeight.findAll({
        where: { company_id: companyId, year: year },
        include: [{ model: db.BscPerspective, as: 'perspective' }]
    });
};

// ✅ Sửa lại hàm để cập nhật theo company_id và year
const updateBscWeights = async (companyId, year, weights) => {
    let totalWeight = 0;
    for (const item of weights) {
        totalWeight += Number(item.weight_percentage);
    }

    if (totalWeight !== 100) {
        throw new Error('Tổng tỷ trọng phải bằng 100%.');
    }

    // ✅ Thêm điều kiện upsert với company_id và year
    for (const item of weights) {
        await db.BscWeight.upsert({
            company_id: companyId,
            year: year,
            perspective_id: item.perspective_id,
            weight_percentage: item.weight_percentage
        });
    }
};
// ✅ Hàm mới để lấy tất cả các khía cạnh
const getBscPerspectives = async () => {
    return await db.BscPerspective.findAll();
};
module.exports = {
    getBscWeights,
    updateBscWeights,
    getBscPerspectives,
};