
const { Op, fn, col, where, literal } = require('sequelize');
const db = require('../models'); // Sequelize models: Timekeeping, Employee, Company

class TimekeepingService {
    /**
     * Helper: build where for a specific month (year, month are integers 1-12)
     */
    _monthRange(year, month) {
        if (!year || !month) return {}; // no filter
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        return {
            work_date: {
                [Op.gte]: start,
                [Op.lt]: end,
            }
        };
    }

    // Lấy lịch sử cho 1 người dùng
    async getTimesheetForUser(userId, year, month) {
        const whereClause = {
            employee_id: userId,
            ...this._monthRange(year && parseInt(year,10), month && parseInt(month,10))
        };
        const records = await db.Timekeeping.findAll({
            where: whereClause,
            order: [['work_date', 'DESC']],
        });
        return Array.isArray(records) ? records : [];
    }

    // Thực hiện Check-in
    async performCheckIn(userId, deviceInfo, ipAddress) {
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayEnd = new Date();
        todayEnd.setHours(23,59,59,999);

        const existingRecord = await db.Timekeeping.findOne({
            where: {
                employee_id: userId,
                work_date: { [Op.between]: [todayStart, todayEnd] }
            }
        });
        if (existingRecord && existingRecord.check_in_time) {
            throw new Error('Bạn đã check-in hôm nay rồi.');
        }

        const newRecord = await db.Timekeeping.create({
            employee_id: userId,
            check_in_time: new Date(),
            work_date: new Date(),
            device_info: deviceInfo || null,
            ip_address: ipAddress || null,
            status: 'Working'
        });
        return { msg: 'Check-in thành công!', record: newRecord };
    }

    // Thực hiện Check-out và tính giờ làm
    async performCheckOut(userId, recordId) {
        const record = await db.Timekeeping.findOne({
            where: { id: recordId, employee_id: userId }
        });
        if (!record) throw new Error('Không tìm thấy bản ghi chấm công.');
        if (record.check_out_time) throw new Error('Bạn đã check-out bản ghi này.');

        const checkOutTime = new Date();
        // Tính số giờ làm
        const start = record.check_in_time ? new Date(record.check_in_time) : null;
        let workHours = null;
        if (start) {
            const diffMs = checkOutTime - start;
            workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // làm tròn 2 chữ số
        }

        await record.update({
            check_out_time: checkOutTime,
            work_hours: workHours,
            status: 'CheckedOut'
        });

        return { msg: 'Check-out thành công!', record };
    }

    // Lấy lịch sử toàn bộ theo filter (cho quản lý)
    async getAllTimesheetsWithFilters(filters = {}) {
        const { year, month, employeeId, companyId } = filters;
        const whereClause = {
            ...(this._monthRange(year, month))
        };

        if (employeeId) whereClause.employee_id = employeeId;

        const include = [
            {
                model: db.Employee,
                as: 'employee',
                required: true,
                ...(companyId ? { where: { company_id: companyId } } : {})
            },
            {
                model: db.Company,
                as: 'company',
                required: false
            }
        ];

        const records = await db.Timekeeping.findAll({
            where: whereClause,
            include,
            order: [['work_date', 'DESC']],
        });

        return Array.isArray(records) ? records : [];
    }
}

module.exports = new TimekeepingService();
