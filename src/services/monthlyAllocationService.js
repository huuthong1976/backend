// server/services/monthlyAllocationService.js
const { CompanyKpiMonthly } = require('../models');

const saveMonthlyTargets = async (payload) => {
    const { kpi_registration_id, year, monthlyTargets } = payload;
    const recordsToUpsert = monthlyTargets.map(target => ({
        kpi_registration_id: kpi_registration_id,
        year: year,
        month: target.month,
        target_value: target.target_value,
    }));

    // Sử dụng upsert để thêm mới hoặc cập nhật
    await CompanyKpiMonthly.bulkCreate(recordsToUpsert, {
        updateOnDuplicate: ['target_value']
    });
};

module.exports = {
    saveMonthlyTargets,
};