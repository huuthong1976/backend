/* =================================================================== */
/* FILE: kpi-backend/routes/timekeeping.js                             */
/* =================================================================== */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');
const moment = require('moment'); // Import moment for date/time handling

// @route   POST /api/timekeeping/checkin
// @desc    Ghi nhận giờ vào
router.post('/checkin', protect, async (req, res) => {
    const { device_info } = req.body;
    const employee_id = req.user.id;
    const device_user = req.user.full_name;
    const ip_address = req.ip || req.connection.remoteAddress;
    const currentTime = moment(); // Thời gian hiện tại

    // BƯỚC 0: Kiểm tra giờ hiện tại có vượt quá 17:00 không
    if (currentTime.hour() >= 17) {
        return res.status(400).json({ msg: 'Không thể check-in sau 17:00.' });
    }

    try {
        // BƯỚC 1: Kiểm tra xem đã có bản ghi chấm công cho nhân viên này trong ngày hôm nay chưa.
        const [existingRecord] = await db.query(
            'SELECT id, check_out_time FROM timesheets WHERE employee_id = ? AND work_date = CURDATE()',
            [employee_id]
        );

        // BƯỚC 2: Nếu đã tồn tại bản ghi và đã check-out, không cho phép check-in lại.
        if (existingRecord.length > 0) {
            if (existingRecord[0].check_out_time) {
                 return res.status(400).json({ msg: 'Bạn đã hoàn thành chấm công hôm nay rồi.' });
            }
            // Nếu đã check-in nhưng chưa check-out, thông báo đã check-in
            return res.status(400).json({ msg: 'Bạn đã check-in hôm nay rồi. Vui lòng check-out khi kết thúc.' });
        }

        // BƯỚC 3: Nếu chưa có bản ghi, tiến hành chèn bản ghi mới.
        await db.query(
            'INSERT INTO timesheets (employee_id, work_date, check_in_time, status, device_info, device_user, ip_address) VALUES (?, CURDATE(), ?, ?, ?, ?, ?)',
            [employee_id, currentTime.format('YYYY-MM-DD HH:mm:ss'), 'Đi làm', device_info, device_user, ip_address]
        );
        
        res.json({ msg: 'Check-in thành công!' });

    } catch (error) {
        console.error("Lỗi khi check-in:", error);
        res.status(500).json({ msg: 'Lỗi server khi thực hiện check-in.' });
    }
});


// @route   PUT /api/timekeeping/checkout/:id
// @desc    Cập nhật giờ ra và tính toán giờ làm cho bản ghi chấm công (ID của timesheet)
router.put('/checkout/:id', protect, async (req, res) => {
    const timesheetId = req.params.id; // ID của bản ghi timesheet cần cập nhật
    const { device_info } = req.body;
    const device_user = req.user.full_name;
    const ip_address = req.ip || req.connection.remoteAddress;
    const currentTime = moment(); // Thời gian hiện tại

    try {
        // Lấy bản ghi chấm công hiện tại để kiểm tra check_in_time
        const [todayRecord] = await db.query(
            'SELECT check_in_time, check_out_time FROM timesheets WHERE id = ? AND employee_id = ? AND work_date = CURDATE()',
            [timesheetId, req.user.id] // Đảm bảo chỉ cập nhật bản ghi của chính người dùng và trong ngày
        );

        // Kiểm tra xem bản ghi có tồn tại và đã check-in chưa
        if (todayRecord.length === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy bản ghi chấm công cho hôm nay hoặc bạn chưa check-in.' });
        }
        if (!todayRecord[0].check_in_time) {
            return res.status(400).json({ msg: 'Bạn chưa check-in nên không thể check-out.' });
        }
        if (todayRecord[0].check_out_time) {
            return res.status(400).json({ msg: 'Bạn đã check-out hôm nay rồi.' });
        }

        const checkInTime = moment(todayRecord[0].check_in_time);
        const checkOutTime = currentTime;

        // Đảm bảo giờ check-out không sớm hơn giờ check-in
        if (checkOutTime.isBefore(checkInTime)) {
            return res.status(400).json({ msg: 'Giờ check-out không thể sớm hơn giờ check-in.' });
        }

        // Tính toán giờ làm
        const duration = moment.duration(checkOutTime.diff(checkInTime));
        const workingHours = duration.asHours().toFixed(2); 

        // Cập nhật bản ghi chấm công
        await db.query(
            `UPDATE timesheets SET check_out_time = ?, work_hours = ?, status = ?, device_info = ?, device_user = ?, ip_address = ? WHERE id = ?`, 
            [
                checkOutTime.format('YYYY-MM-DD HH:mm:ss'),
                workingHours, 
                'Hoàn thành',
                device_info,
                device_user,
                ip_address,
                timesheetId
            ]
        );
        
        res.json({ msg: 'Check-out thành công!', workingHours: workingHours });

    } catch (error) {
        console.error("Lỗi khi check-out:", error);
        res.status(500).json({ msg: 'Lỗi server khi thực hiện check-out.' });
    }
});

// @route   GET /api/timekeeping/my-timesheet
// @desc    Lấy bảng chấm công của cá nhân trong tháng, bao gồm work_hours
router.get('/my-timesheet', protect, async (req, res) => {
    const { year, month } = req.query;
    const employee_id = req.user.id;
    try {
        // Đảm bảo lấy cột work_hours
        const [rows] = await db.query(
            'SELECT id, work_date, check_in_time, check_out_time, work_hours, status, device_info, device_user, ip_address FROM timesheets WHERE employee_id = ? AND YEAR(work_date) = ? AND MONTH(work_date) = ? ORDER BY work_date DESC', // Sắp xếp giảm dần theo ngày
            [employee_id, year, month]
        );
        res.json(rows);
    } catch (err) {
        console.error('Lỗi tải bảng chấm công cá nhân:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/timekeeping/all-timesheets
// @desc    Lấy bảng chấm công của TẤT CẢ nhân viên với bộ lọc (Admin/TongGiamDoc)
// @access  Private (Admin, TongGiamDoc, TruongDonVi có thể truy cập nếu cần)
router.get('/all-timesheets', protect, async (req, res) => {
    const { year, month, employeeId, companyId } = req.query; // Thêm các query params
    const requestingUserRole = req.user.role;

    // Kiểm tra quyền truy cập
    const allowedRolesForFullAccess = ['Admin', 'TongGiamDoc', 'TruongDonVi']; // Giả sử Trưởng đơn vị cũng có thể xem toàn bộ
    if (!allowedRolesForFullAccess.includes(requestingUserRole)) {
        return res.status(403).json({ msg: 'Bạn không có quyền truy cập chức năng này.' });
    }

    try {
        let query = `
            SELECT 
                ts.id, 
                ts.work_date, 
                ts.check_in_time, 
                ts.check_out_time, 
                ts.work_hours, 
                ts.status, 
                ts.device_info, 
                ts.device_user, 
                ts.ip_address,
                e.employee_code,
                e.full_name AS employee_name,
                c.company_name,
                d.department_name
            FROM timesheets ts
            JOIN employees e ON ts.employee_id = e.id
            LEFT JOIN companies c ON e.company_id = c.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (year) {
            query += ' AND YEAR(ts.work_date) = ?';
            queryParams.push(year);
        }
        if (month) {
            query += ' AND MONTH(ts.work_date) = ?';
            queryParams.push(month);
        }
        if (employeeId) {
            query += ' AND ts.employee_id = ?';
            queryParams.push(employeeId);
        }
        if (companyId) {
            query += ' AND e.company_id = ?';
            queryParams.push(companyId);
        }

        query += ' ORDER BY ts.work_date DESC, e.full_name ASC'; // Sắp xếp theo ngày giảm dần và tên tăng dần

        const [rows] = await db.query(query, queryParams);
        res.json(rows);

    } catch (err) {
        console.error('Lỗi tải bảng chấm công toàn bộ:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;