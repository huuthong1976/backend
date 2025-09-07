// server/controllers/companyKpiController.js
const companyKpiService = require('../services/companyKpiService');

/**
 * Lấy danh sách KPI công ty dựa trên quyền và bộ lọc.
 */
const listCompanyKpis = async (req, res) => {
    try {
        const { company_id, year } = req.query;

        if (!company_id || !year) {
            return res.status(400).json({ error: 'Thiếu tham số company_id hoặc year' });
        }

        const tree = await companyKpiService.getAll(req.user, { company_id, year });

        // ✅ Trả về dữ liệu dạng cây luôn
        res.status(200).json(tree);
    } catch (error) {
        console.error('Error in listCompanyKpis controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách KPI công ty.' });
    }
};


/**
 * Lấy thông tin chi tiết của một KPI công ty.
 */
const getCompanyKpiById = async (req, res) => {
    try {
        const { id } = req.params;
        const kpi = await companyKpiService.getById(id);
        
        if (!kpi) {
            return res.status(404).json({ error: 'Không tìm thấy chỉ số KPI.' });
        }
        
        // Thêm logic kiểm tra quyền nếu cần (ví dụ: user chỉ được xem KPI của công ty mình)
        
        res.status(200).json(kpi);
    } catch (error) {
        console.error('Error in getCompanyKpiById controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy chi tiết KPI công ty.' });
    }
};


/**
 * Tạo mới một chỉ số KPI cho công ty.
 */
const createCompanyKpi = async (req, res) => {
    try {
        const kpiData = req.body;

        // ✅ THAY ĐỔI: Validation cho các trường mới
        if (!kpiData.kpi_id || !kpiData.target_value || !kpiData.year || !kpiData.company_id) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ các trường thông tin bắt buộc.' });
        }

        const newKpi = await companyKpiService.create(kpiData);
        res.status(201).json(newKpi);
    } catch (error) {
        console.error('Error in createCompanyKpi controller:', error);
        res.status(500).json({ error: 'Lỗi server khi tạo mới KPI.' });
    }
};

/**
 * Tạo mới hàng loạt các chỉ số KPI cho công ty.
 */
const bulkRegisterCompanyKpis = async (req, res) => {
    try {
        const kpiList = req.body.kpis; // Giao diện gửi lên một mảng các KPI

        if (!kpiList || !Array.isArray(kpiList) || kpiList.length === 0) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Vui lòng cung cấp một mảng các KPI.' });
        }
        
        // Gọi service để xử lý việc tạo hàng loạt
        const createdKpis = await companyKpiService.bulkCreate(kpiList);
        
        res.status(201).json({ 
            success: true, 
            message: `Đã đăng ký thành công ${createdKpis.length} chỉ số KPI.`,
            data: createdKpis 
        });

    } catch (error) {
        console.error('Error in bulkRegisterCompanyKpis controller:', error);
        res.status(500).json({ error: 'Lỗi server khi đăng ký hàng loạt KPI.' });
    }
};
/**
 * Cập nhật một chỉ số KPI công ty.
 */
const updateCompanyKpi = async (req, res) => {
    try {
        const { id } = req.params;
        const kpiData = req.body;

        const updated = await companyKpiService.update(id, kpiData);
        
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy KPI để cập nhật.' });
        }

        res.status(200).json({ success: true, message: 'Cập nhật KPI thành công.' });
    } catch (error) {
        console.error('Error in updateCompanyKpi controller:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật KPI công ty.' });
    }
};

/**
 * Cập nhật hàng loạt các chỉ số KPI.
 */
const bulkUpdateCompanyKpis = async (req, res) => {
    try {
        const kpiList = req.body.kpis; // Giao diện gửi lên một mảng các KPI

        if (!kpiList || !Array.isArray(kpiList) || kpiList.length === 0) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Vui lòng cung cấp một mảng các KPI.' });
        }

        const updatedCount = await companyKpiService.bulkUpdate(kpiList);
        res.status(200).json({ success: true, message: `Đã cập nhật thành công ${updatedCount} chỉ số KPI.` });

    } catch (error) {
        console.error('Error in bulkUpdateCompanyKpis controller:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật hàng loạt KPI.' });
    }
};


/**
 * Xóa một hoặc nhiều chỉ số KPI.
 */


const deleteCompanyKpi = async (req, res) => {
    try {
        const { id } = req.params;
        await companyKpiService.remove(id);
        res.status(200).json({ success: true, message: 'Đã xóa KPI thành công.' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Lỗi server khi xóa KPI.' });
    }
};
const allocateMonthlyTargets = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const monthlyTargets = req.body.monthlyTargets;  // Frontend sẽ gửi lên một mảng 12 tháng

        if (!monthlyTargets || !Array.isArray(monthlyTargets) || monthlyTargets.length !== 12) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Vui lòng cung cấp đủ 12 tháng.' });
        }

        await companyKpiService.allocateMonthlyTargets(registrationId, monthlyTargets);
        res.status(200).json({ success: true, message: 'Phân bổ chỉ tiêu tháng thành công.' });

    } catch (error) {
        console.error('Error in allocateMonthlyTargets controller:', error);
        // Trả về lỗi nghiệp vụ từ service nếu có
        res.status(500).json({ error: error.message || 'Lỗi server khi phân bổ chỉ tiêu.' });
    }
};
const getKpiLibrary = async (req, res) => {
    try {
        // Truyền bộ lọc req.query vào service
        const library = await companyKpiService.getLibrary(req.query);
        res.status(200).json(library);
    } catch (error) {
        console.error('Error in getKpiLibrary controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách thư viện KPI.' });
    }
};
module.exports = {
    listCompanyKpis,
    getCompanyKpiById,
    getKpiLibrary, 
    createCompanyKpi,
    bulkRegisterCompanyKpis,
    updateCompanyKpi,
    bulkUpdateCompanyKpis,
    allocateMonthlyTargets,
    deleteCompanyKpi,
    
};