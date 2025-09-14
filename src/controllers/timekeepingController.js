const timekeepingService = require('../services/timekeepingService');

// Lấy lịch sử chấm công của bản thân
async function getMyTimesheet(req, res) {
  try {
    const userId = req.user.id; // từ middleware protect
    const { year, month } = req.query;
    const timesheet = await timekeepingService.getTimesheetForUser(userId, year, month);
    return res.status(200).json(timesheet);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
}

// Thực hiện Check-in
async function checkIn(req, res) {
  try {
    const userId = req.user.id;
    const { device_info } = req.body;
    const ip_address = req.ip;
    const result = await timekeepingService.performCheckIn(userId, device_info, ip_address);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ msg: error.message });
  }
}

// Thực hiện Check-out
async function checkOut(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params; // id bản ghi chấm công
    const result = await timekeepingService.performCheckOut(userId, id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ msg: error.message });
  }
}

// Lấy lịch sử toàn bộ (cho quản lý)
async function getAllTimesheets(req, res) {
  try {
    const filters = {
      year: req.query.year ? parseInt(req.query.year, 10) : undefined,
      month: req.query.month ? parseInt(req.query.month, 10) : undefined,
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId, 10) : undefined,
      companyId: req.query.companyId ? parseInt(req.query.companyId, 10) : undefined,
    };
    const timesheets = await timekeepingService.getAllTimesheetsWithFilters(filters);
    return res.status(200).json(timesheets);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
}
async function getUnitTimesheets(req, res) {
    try {
      const { company_id } = req.user || {};
      if (!company_id) {
        return res.status(400).json({ msg: 'Thiếu company_id trong phiên đăng nhập.' });
      }
      const filters = {
        year: req.query.year ? parseInt(req.query.year, 10) : undefined,
        month: req.query.month ? parseInt(req.query.month, 10) : undefined,
        employeeId: req.query.employeeId ? parseInt(req.query.employeeId, 10) : undefined,
        // companyId sẽ bị server ép = company_id của manager, bảo toàn an ninh
        companyId: company_id,
      };
      const timesheets = await timekeepingService.getAllTimesheetsWithFilters(filters);
      return res.status(200).json(timesheets);
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
}
module.exports = { getMyTimesheet, checkIn, getAllTimesheets, checkOut };
module.exports.getUnitTimesheets = getUnitTimesheets;