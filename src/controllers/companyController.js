// server/controllers/companyController.js
const db = require('../config/db');
const companyService = require('../services/companyService');

const listCompanies = async (req, res) => {
    // Lấy thông tin người dùng đã được middleware verifyToken gắn vào
    const user = req.user;

    try {
        const baseSelect =
        'SELECT id, company_code, company_name AS name, address, tax_code, phone, email, status FROM companies';
        let query = baseSelect;
        let params = [];

        // Áp dụng logic phân quyền để xây dựng câu truy vấn
        if (user.role === 'Admin' || user.role === 'TongGiamDoc') {
            // Admin hoặc Director có thể xem tất cả công ty
            // Không cần thêm điều kiện WHERE
       
        } else {
            // Các vai trò khác (như Employee) cũng chỉ thấy công ty của họ
            query += ' WHERE id = ?';
            params.push(user.company_id);
        }

        // Thực thi câu truy vấn
        const [companies] = await db.query(query, params);
        res.json(companies);

    } catch (err) {
        console.error('Lỗi khi lấy danh sách công ty:', err.message);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

const getCompany = async (req, res) => {
    try {
        const company = await companyService.getById(req.params.id);
        if (!company) {
            return res.status(404).json({ error: 'Không tìm thấy công ty.' });
        }
        res.status(200).json(company);
    } catch (error) {
        console.error('Error in getCompany controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy thông tin công ty.' });
    }
};

const createCompany = async (req, res) => {
    try {
        // Thêm validation dữ liệu đầu vào
        if (!req.body.company_name || !req.body.company_code) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ mã và tên công ty.' });
        }
        const newCompany = await companyService.create(req.body);
        res.status(201).json(newCompany);
    } catch (error){
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Mã công ty đã tồn tại.' });
        }
        console.error('Error in createCompany controller:', error);
        res.status(500).json({ error: 'Lỗi server khi tạo mới công ty.' });
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