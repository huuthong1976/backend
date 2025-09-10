
const jwt = require('jsonwebtoken');
const db = require('../config/db');


const protect = async (req, res, next) => {
  let token;

  // 1. Lấy token từ header 'Authorization'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
 
  // 2. Trả về lỗi nếu không có token
  if (!token) {
    return res.status(401).json({ msg: 'Không tìm thấy token, truy cập bị từ chối.' });
  }

  try {
    // 3. Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret');

    // 4. Lấy thông tin người dùng MỚI NHẤT từ database bằng ID trong token
  
    const [rows] = await db.query(
      'SELECT id, username, role, company_id, status FROM employees WHERE id = ?',
      [decoded.user.id]
    );

    if (rows.length === 0 || rows[0].status !== 'Đang làm việc') {
        return res.status(401).json({ msg: 'Người dùng không tồn tại hoặc đã bị khóa.' });
    }

    // 5. Gán thông tin người dùng vào đối tượng request để các xử lý sau có thể sử dụng
    req.user = rows[0];

    next(); 
  } catch (err) {
    console.error('Lỗi middleware xác thực:', err.message);
    return res.status(401).json({ msg: 'Token không hợp lệ.' });
  }
};


/**
 * @function    authorize
 * @description Middleware để kiểm soát quyền truy cập dựa trên vai trò (role).
 * Nó là một hàm bậc cao (higher-order function), nhận vào danh sách các vai trò được phép
 * và trả về một middleware để kiểm tra.
 * @usage       Sử dụng sau middleware `protect`: `router.get('/', protect, authorize('Admin', 'KeToan'), ...)`
 * @access      Dùng cho các route yêu cầu quyền hạn cụ thể.
 * @lienket_fe  Được dùng trên các API yêu cầu quyền hạn đặc biệt. Ví dụ, API xóa nhân viên
 * (`DELETE /api/employees/:id`) có thể dùng `authorize('Admin')`. Do đó, nút "Xóa" trên
 * giao diện `HrmDashboard.js` sẽ chỉ hoạt động cho người dùng có vai trò 'Admin'.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Kiểm tra xem `req.user` (được tạo bởi `protect`) có tồn tại và vai trò của user
    //    có nằm trong danh sách các vai trò được phép không.
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Bạn không có quyền thực hiện hành động này.' });
    }
    
    // 2. Nếu hợp lệ, cho phép đi tiếp
    next();
  };
};

// --- Xuất các middleware để server có thể sử dụng ---
module.exports = { protect, authorize };