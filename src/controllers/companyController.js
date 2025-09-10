// File đã sửa: server/controllers/companyController.js

// ✅ Bước 1: Chỉ import đối tượng 'db' từ thư mục /models
const db = require('../models');

/**
 * @desc    Lấy danh sách công ty dựa trên vai trò người dùng
 * @route   GET /api/companies
 */
const listCompanies = async (req, res) => {
    try {
        const user = req.user; // Lấy thông tin user từ middleware
        let companies;

        // ✅ Bước 2: Logic phân quyền của bạn bây giờ sẽ hoạt động
        if (user.role === 'Admin' || user.role === 'TongGiamDoc') {
            // Admin/TGĐ thấy tất cả công ty
            companies = await db.Company.findAll({ order: [['name', 'ASC']] });
        } else if (user.role === 'TruongDonVi' && user.company_id) {
            // Trưởng Đơn vị chỉ thấy công ty của họ
            companies = await db.Company.findAll({ where: { id: user.company_id } });
        } else {
            // Các vai trò khác không thấy công ty nào
            companies = [];
        }

        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

/**
 * @desc    Lấy thông tin chi tiết một công ty
 * @route   GET /api/companies/:id
 */
const getCompany = async (req, res) => {
    try {
        const company = await db.Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ error: 'Không tìm thấy công ty.' });
        }
        res.json(company);
    } catch (error) {
        console.error('Error in getCompany:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

/**
 * @desc    Tạo công ty mới
 * @route   POST /api/companies
 */
const createCompany = async (req, res) => {
    try {
        const { name, address /*, ...các trường khác */ } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Tên công ty là bắt buộc.' });
        }
        const newCompany = await db.Company.create({ name, address });
        res.status(201).json(newCompany);
    } catch (error){
        console.error('Error in createCompany:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

const updateCompany = async (req, res) => {
    try {
        const updated = await companyService.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy công ty để cập nhật.' });
        }
        res.status(200).json({ success: true, message: 'Cập nhật công ty thành công.' });
    } catch (error) {
        console.error('Error in updateCompany controller:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật công ty.' });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const deleted = await companyService.remove(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Không tìm thấy công ty để xóa.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Error in deleteCompany controller:', error);
        res.status(500).json({ error: 'Lỗi server khi xóa công ty.' });
    }
};

module.exports = {
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
};