
const { pool, getPool }  = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool;
// services/kpiAspectService.js
const { BscWeight, BscPerspective, Company, sequelize } = require('../models');

async function getBscWeights({ company_id, year }) {
  // Trả về các bản ghi weight hiện có (mỗi perspective một dòng nếu đã cấu hình)
  return BscWeight.findAll({
    where: { company_id, year },
    include: [
      { model: BscPerspective, as: 'perspective', attributes: ['id', 'perspective_code', 'name'] },
      { model: Company, as: 'company', attributes: ['id', 'name'] }
    ],
    order: [[{ model: BscPerspective, as: 'perspective' }, 'perspective_code', 'ASC']]
  });
}

// Tuỳ chọn: nếu muốn luôn trả đủ 4 khía cạnh với weight=0 khi chưa có bản ghi
async function getBscWeightsWithDefaults({ company_id, year }) {
  const perspectives = await BscPerspective.findAll({
    attributes: ['id', 'perspective_code', 'name'],
    order: [['perspective_code', 'ASC']]
  });

  const weights = await BscWeight.findAll({ where: { company_id, year } });
  const map = new Map(weights.map(w => [Number(w.perspective_id), w]));

  return perspectives.map(p => {
    const w = map.get(Number(p.id));
    return {
      perspective_id: p.id,
      year,
      company_id,
      weight_percentage: w ? Number(w.weight_percentage) : 0,
      perspective: { id: p.id, perspective_code: p.perspective_code, name: p.name }
    };
  });
}



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
    return BscPerspective.findAll({
        attributes: ['id', 'perspective_code', 'name'],
        order: [['id', 'ASC']]
    });
};

module.exports = {
    getBscWeights,
    updateBscWeights,
    getBscWeightsWithDefaults,
    getBscPerspectives,
};