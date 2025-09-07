// backend/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); 
const db = require('../config/db'); 
const { protect, authorize } = require('../middleware/auth'); 

// Lấy danh sách toàn bộ người dùng (Cần protect và authorize nếu chỉ admin mới xem được)
router.get('/', protect, authorize(['Admin']), async (req, res) => { 
  try {
    const [users] = await db.query('SELECT id, username, email, role, employee_id, is_active FROM employees');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi truy vấn CSDL.' });
  }
});

// Thêm mới người dùng (Cần protect và authorize)
router.post('/', protect, authorize(['Admin']), async (req, res) => { 
  const { username, email, role, employee_id, password } = req.body;
  try {
    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const [existingUser] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser.length > 0) {
        return res.status(400).json({ msg: 'Username hoặc Email đã tồn tại.' });
    }

    const hashed = await bcrypt.hash(password || 'admin@123', 10);
    await db.query(
      'INSERT INTO employees (username, email, role, employee_id, password, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [username, email, role, employee_id, hashed]
    );
    res.json({ msg: 'Tạo người dùng thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi tạo người dùng.' });
  }
});

// Cập nhật người dùng (Cần protect và authorize)
router.put('/:id', protect, authorize(['Admin']), async (req, res) => { 
  const { username, email, role, employee_id, is_active } = req.body;
  try {
    // Optional: Kiểm tra username/email mới có bị trùng với người khác không (trừ chính user đang update)
    await db.query(
      'UPDATE employees SET username = ?, email = ?, role = ?, employee_id = ?, is_active = ? WHERE id = ?',
      [username, email, role, employee_id, is_active, req.params.id]
    );
    res.json({ msg: 'Cập nhật người dùng thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật người dùng.' });
  }
});

// Xóa người dùng (Cần protect và authorize)
router.delete('/:id', protect, authorize(['Admin']), async (req, res) => { 
  try {
    const userId = req.user.id;
    const userIp = req.ip;
    await db.query(
      'UPDATE employees SET deleted_at = NOW(), deleted_by = ?, deleted_from_ip = ? WHERE id = ?',
      [userId, userIp, recordId]
    );
    
    res.json({ msg: 'Xóa người dùng thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa người dùng.' });
  }
});

// Reset mật khẩu về mặc định (Cần protect và authorize)
router.put('/:id/reset-password', protect, authorize(['Admin']), async (req, res) => { 
  try {
    const hashed = await bcrypt.hash('123456', 10); // Mật khẩu mặc định
    await db.query('UPDATE employees SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ msg: 'Đã reset mật khẩu về mặc định (123456).' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi reset mật khẩu.' });
  }
});

// =======================================================
// === CÁC API CHO TRANG CÀI ĐẶT CÁ NHÂN PersonalSettingsPage.js ===
// =======================================================

// @route   GET /api/users/me
// @desc    Lấy thông tin profile của người dùng đang đăng nhập
// @access  Private
router.get('/me', protect, async (req, res) => {
    // req.user được đặt bởi middleware 'protect'
    try {
        // Lấy thông tin từ bảng 'employees' vì 'users' có vẻ chỉ là bảng tài khoản
        // Và thông tin email, phone của nhân viên nằm ở bảng 'employees'
        const [employeeInfo] = await db.query('SELECT email, phone FROM employees WHERE id = ?', [req.user.id]);

        if (employeeInfo.length === 0) {
            // Có thể user.id trong JWT không khớp với employee.id
            return res.status(404).json({ msg: 'Không tìm thấy thông tin nhân viên cho người dùng này.' });
        }
        res.json(employeeInfo[0]);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin cá nhân:', error);
        res.status(500).json({ msg: 'Lỗi server khi lấy thông tin cá nhân.' });
    }
});

// @route   PUT /api/users/me/details
// @desc    Cập nhật thông tin liên lạc của người dùng đang đăng nhập
// @access  Private
router.put('/me/details', protect, async (req, res) => {
    const { email, phone } = req.body;
    try {
        await db.query('UPDATE employees SET email = ?, phone = ? WHERE id = ?', [email, phone, req.user.id]);
        res.json({ msg: 'Cập nhật thông tin liên lạc thành công!' });
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin liên lạc cá nhân:', error);
        res.status(500).json({ msg: 'Lỗi server khi cập nhật thông tin cá nhân.' });
    }
});

// @route   PUT /api/users/me/password
// @desc    Đổi mật khẩu của người dùng đang đăng nhập
// @access  Private
router.put('/me/password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        // Lấy hashed password hiện tại từ bảng 'employees' (nơi lưu password_hash)
        const [userRows] = await db.query('SELECT password_hash FROM employees WHERE id = ?', [req.user.id]);

        if (userRows.length === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy thông tin người dùng để đổi mật khẩu.' });
        }
        const userRecord = userRows[0];

        // So sánh mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, userRecord.password_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Mật khẩu hiện tại không đúng.' });
        }

        // Hash mật khẩu mới và cập nhật
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE employees SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        res.json({ msg: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu cá nhân:', error);
        res.status(500).json({ msg: 'Lỗi server khi đổi mật khẩu.' });
    }
});

module.exports = router;