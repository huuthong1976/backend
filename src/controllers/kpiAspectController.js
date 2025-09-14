// server/controllers/kpiAspectController.js
const kpiAspectService = require('../services/kpiAspectService');

/**
 * @desc    Lấy danh sách ĐỊNH NGHĨA các khía cạnh BSC
 * @route   GET /api/kpi-aspects
 * @access  Private
 */
async function getBscPerspectives(req, res, next) {
  try {
    // ✅ Logic đúng: Gọi đến service để lấy danh sách định nghĩa từ bảng bsc_perspectives
    const perspectives = await kpiAspectService.getBscPerspectives();
    res.json(perspectives);
  } catch (e) {
    console.error('Error in getBscPerspectives:', e);
    next(e); // Chuyển lỗi cho middleware xử lý
  }
}

/**
 * @desc    Lấy tỷ trọng đã lưu của các khía cạnh theo đơn vị và năm
 * @route   GET /api/kpi-aspects/weights
 * @access  Private
 */
async function getBscWeights(req, res, next) {
  try {
    const companyId = parseInt(req.query.company_id, 10);
    const year = parseInt(req.query.year, 10);

    if (!companyId || !year) {
      return res.status(400).json({ error: 'company_id và year là bắt buộc' });
    }
    
    // ✅ BƯỚC 1: Gọi service để lấy dữ liệu TỶ TRỌNG (đã sửa)
    // Lưu ý: Tôi đã sửa lại hàm gọi service cho đúng với cấu trúc service của bạn
    const weights = await kpiAspectService.getBscWeightsWithDefaults({ 
      company_id: companyId, 
      year: year 
    });

    // ✅ BƯỚC 2: Sắp xếp kết quả bằng JavaScript (an toàn và hiệu quả hơn)
    weights.sort((a, b) => a.perspective_id - b.perspective_id);

    res.json(weights);
  } catch (e) {
    console.error('Error in getBscWeights:', e);
    next(e);
  }
}

/**
 * @desc    Lưu tỷ trọng các khía cạnh
 * @route   POST /api/kpi-aspects/weights 
 * @access  Private
 */
async function savePerspectiveWeights(req, res, next) {
  try {
    const { company_id, year, weights } = req.body;
    
    // ✅ Logic đúng: Gọi hàm service đã viết đúng
    await kpiAspectService.updateBscWeights(company_id, year, weights);
    
    res.json({ message: 'Cập nhật tỷ trọng thành công!' });
  } catch (e) {
    console.error('Error in savePerspectiveWeights:', e);
    res.status(400).json({ error: e.message }); // Trả về lỗi từ service
  }
}

// Các hàm không dùng tới
async function create(req, res){ res.status(201).json({ ok: true }); }
async function update(req, res){ res.json({ ok: true }); }
async function remove(req, res){ res.json({ ok: true }); }

module.exports = {
  getBscPerspectives,
  getBscWeights,
  savePerspectiveWeights,
  create,
  update,
  remove,
};