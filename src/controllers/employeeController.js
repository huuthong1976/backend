// server/controllers/employeeController.js
const employeeService = require('../services/employeeService');
const companyService = require('../services/companyService'); 
const departmentService = require('../services/departmentService'); 
const positionService = require('../services/positionService');

const listEmployees = async (req, res) => {
    try {
        // req.user được lấy từ middleware xác thực
        // req.query chứa các tham số lọc & phân trang từ URL
        const result = await employeeService.getAll(req.user, req.query);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in listEmployees controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách nhân viên.' });
    }
};

/**
 * Lấy danh sách nhân viên rút gọn cho các ô select/dropdown.
 */
const getEmployeeSelectList = async (req, res) => {
    try {
        const { companyId } = req.query;
        const employees = await employeeService.getEmployeeListForSelect(req.user, companyId);
        res.status(200).json(employees);
    } catch (error) {
        console.error('Error in getEmployeeSelectList controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách nhân viên.' });
    }
};


/**
 * Lấy thông tin chi tiết của một nhân viên.
 */
const getEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        // Hàm getById bây giờ trả về object lớn { profile, contracts, decisions }
        const employeeData = await employeeService.getById(id);
        
        if (!employeeData) {
            return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
        }
        
        // Trả về toàn bộ object đó cho frontend
        res.status(200).json(employeeData);
    } catch (error) {
        console.error('Error in getEmployee controller:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy thông tin nhân viên.' });
    }
};

/**
 * Tạo mới một nhân viên.
 */
const createEmployee = async (req, res) => {
    try {
        const employeeData = req.body;
        if (!employeeData.full_name || !employeeData.employee_code || !employeeData.email) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ thông tin bắt buộc (tên, mã NV, email).' });
        }

        const newEmployee = await employeeService.create(employeeData);
        res.status(201).json(newEmployee);
    } catch (error) {
        // Bắt lỗi cụ thể từ service (ví dụ: email/mã NV đã tồn tại)
        if (error.message.includes('đã tồn tại')) {
            return res.status(409).json({ error: error.message }); // 409 Conflict
        }
        console.error('Error in createEmployee controller:', error);
        res.status(500).json({ error: 'Lỗi server khi tạo mới nhân viên.' });
    }
};

/**
 * Cập nhật thông tin một nhân viên.
 */
const updateEmployee = async (req, res) => {
    try {
        let { id } = req.params;
    
        // Nếu ai đó vô tình gọi /employees/profile hoặc /employees/me => chuyển sang id thật
        if (id === 'profile' || id === 'me') id = String(req.user?.id || req.user?.employee_id);
    
        id = Number(id);
        if (!id) return res.status(400).json({ error: 'Invalid employee id' });
    
        const data = pick(req.body, UPDATABLE_FIELDS);
        if (data.dob === '' || data.dob === undefined) data.dob = null;
    
        await employeeService.update(id, data);
        return res.json({ success: true });
      } catch (e) {
        console.error('Error in updateEmployee controller:', e);
        return res.status(500).json({ error: 'Update employee failed' });
      }
};

/**
 * Cập nhật trạng thái cho một hoặc nhiều nhân viên.
 */
const updateEmployeeStatus = async (req, res) => {
    try {
        const { ids, status } = req.body; // Frontend gửi lên một mảng các ID và trạng thái mới

        if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
            return res.status(400).json({ error: 'Vui lòng cung cấp danh sách ID và trạng thái mới.' });
        }
        
        await employeeService.updateStatus(ids, status);
        res.status(200).json({ success: true, message: `Đã cập nhật trạng thái cho ${ids.length} nhân viên.` });

    } catch (error) {
        console.error('Error in updateEmployeeStatus controller:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái nhân viên.' });
    }
};


/**
 * Xóa mềm một nhân viên.
 */
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await employeeService.remove(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Không tìm thấy nhân viên để xóa.' });
        }
        
        res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái nhân viên thành "Đã nghỉ việc".' });
    } catch (error) {
        console.error('Error in deleteEmployee controller:', error);
        res.status(500).json({ error: 'Lỗi server khi xóa nhân viên.' });
    }
};
const getEmployeeById = async (req, res) => {
    try {
        const employee = await employeeService.getById(req.params.id);
        if (!employee) {
            return res.status(404).json({ msg: 'Không tìm thấy nhân viên' });
        }
        res.json(employee);
    } catch (err) {
        res.status(500).send('Lỗi server');
    }
};
const getMyProfile = async (req, res) => {
    try {
        const id = Number(req.user?.id || req.user?.employee_id);
        if (!id) return res.status(400).json({ error: 'Invalid user id from token' });
        const profile = await employeeService.findById(id);
        return res.json(profile);
      } catch (e) {
        console.error('getMyProfile error:', e);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };  
    async function getDataForForm(req, res) {
        try {
          const [companies, departments, positions] = await Promise.all([
            companyService.getAll().catch(() => []),
            departmentService.getAll().catch(() => []),
            positionService.getAll().catch(() => []),
          ]);
          res.json({ companies, departments, positions });
        } catch (err) {
          console.error('Error in getDataForForm controller:', err);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
const updateMyProfile = async (req, res) => {
    try {
        const id = Number(req.user?.id || req.user?.employee_id);
        if (!id) return res.status(400).json({ error: 'Invalid user id from token' });
    
        // Lọc field hợp lệ
        const data = pick(req.body, UPDATABLE_FIELDS);
        // Chuẩn hóa dob -> 'YYYY-MM-DD' hoặc null
        if (data.dob === '' || data.dob === undefined) data.dob = null;
    
        await employeeService.update(id, data);
        return res.json({ success: true });
      } catch (e) {
        console.error('updateMyProfile error:', e);
        return res.status(500).json({ error: 'Update profile failed' });
      }
};
const getMe = async (req, res) => {
    try {
        // req.user is populated by the 'protect' middleware from the JWT
        const { id, role, company_id, employee_id } = req.user;

        if (!id) {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        
        // You can query the database for the most up-to-date info if needed
        // For now, returning info from the token is fast and efficient.
        const userProfile = await db.User.findByPk(id, {
             attributes: ['id', 'role', 'company_id']
        });
        
        if (!userProfile) {
           return res.status(404).json({ error: 'User not found' });
        }

        res.json(userProfile);

    } catch (err) {
        console.error('GET /me error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
module.exports = {
    listEmployees,
    getMe,
    getDataForForm,
    getEmployeeSelectList,
    getEmployee,
    getMyProfile,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    updateMyProfile,
    updateEmployeeStatus,
    deleteEmployee,
    getAllEmployees: listEmployees,

};