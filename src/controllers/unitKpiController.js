// server/controllers/unitKpiController.js
const db = require('../models');

// Lấy danh sách KPI đã đăng ký trong năm
exports.getAnnualRegistrations = async (req, res) => {
    try {
        const { company_id, year } = req.query;
        const registrations = await db.CompanyKpiRegistration.findAll({
            where: { company_id, year },
            // ✅ BỔ SUNG: Lấy kèm thông tin chi tiết từ bảng kpi_library
            include: [{
                model: db.KpiLibrary,
                as: 'kpiDetail',
                attributes: ['kpi_name'] // Chỉ lấy cột kpi_name
            }],
            order: [['id', 'ASC']]
        });
        
        // Định dạng lại dữ liệu để frontend dễ sử dụng
        const formattedData = registrations.map(reg => ({
            id: reg.id,
            year: reg.year,
            target_value: reg.target_value,
            weight: reg.weight,
            // Lấy kpi_name từ đối tượng được include
            kpi_name: reg.kpiDetail ? reg.kpiDetail.kpi_name : 'N/A'
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KPI đăng ký:", error);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};

// Lấy danh sách KPI năm kèm theo kết quả của tháng được chọn
exports.getMonthlyResults = async (req, res) => {
    try {
        const { company_id, year, month } = req.query;

        // ✅ Kỹ thuật quan trọng:
        // Lấy tất cả các KPI đã đăng ký trong năm VÀ
        // Dùng LEFT JOIN để lấy kèm kết quả của tháng tương ứng (nếu có)
        const results = await db.CompanyKpiRegistration.findAll({
            where: { company_id, year },
            include: [{
                model: db.CompanyKpiMonthly,
                as: 'monthlyResults', // Bí danh đã định nghĩa trong model
                where: { month },
                required: false // Dùng LEFT JOIN, nếu tháng đó chưa có kết quả thì vẫn trả về KPI
            }],
            order: [['id', 'ASC']]
        });

        // Xử lý để cấu trúc data phẳng hơn, dễ cho frontend sử dụng
        const formattedResults = results.map(reg => {
            const plainReg = reg.get({ plain: true });
            const monthlyResult = plainReg.monthlyResults?.[0] || null; // Lấy kết quả tháng (nếu có)
            return {
                registration_id: plainReg.id,
                kpi_name: plainReg.kpi_name,
                target: plainReg.target,
                unit: plainReg.unit,
                result_id: monthlyResult?.id || null,
                result: monthlyResult?.result || null,
                note: monthlyResult?.note || ''
            };
        });

        res.status(200).json(formattedResults);
    } catch (error) {
        console.error("Lỗi khi lấy kết quả KPI tháng:", error);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};

// Lưu kết quả KPI của một tháng (tạo mới nếu chưa có, cập nhật nếu đã có)
exports.saveMonthlyResults = async (req, res) => {
    // req.body mong đợi một mảng: [{ registration_id, month, year, result, note }, ...]
    const resultsToSave = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        const promises = resultsToSave.map(item => {
            // ✅ Dùng `upsert`: UPDATE nếu đã tồn tại, INSERT nếu chưa
            return db.CompanyKpiMonthly.upsert({
                registration_id: item.registration_id,
                month: item.month,
                year: item.year,
                result: item.result,
                note: item.note
            }, {
                // Điều kiện để upsert hoạt động đúng
                conflictFields: ['registration_id', 'month', 'year'], 
                transaction
            });
        });
        
        await Promise.all(promises);
        await transaction.commit();
        res.status(200).json({ message: "Lưu kết quả thành công!" });
    } catch (error) {
        await transaction.rollback();
        console.error("Lỗi khi lưu kết quả KPI tháng:", error);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};