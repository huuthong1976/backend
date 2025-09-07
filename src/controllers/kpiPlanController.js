// server/controllers/kpiPlanController.js
const db = require('../models');
const { Op } = require('sequelize');

async function getSubordinateIds(managerId) {
  const subordinates = await db.Employee.findAll({
    where: { manager_id: managerId },
    attributes: ['id'],
  });
  return subordinates.map(s => s.id);
}

exports.getMyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ error: 'Missing month or year information' });
    }

    let whereClause = { month, year };

    if (['NhanvienCM', 'Phophong', 'Truongphong', 'PhoDV'].includes(userRole)) {
      whereClause.employee_id = userId;
    } else if (userRole === 'TruongDonVi') {
      const subordinateIds = await getSubordinateIds(userId);
      whereClause.employee_id = {
        [Op.in]: [...subordinateIds, userId],
      };
    } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
      // TGĐ và Admin có thể xem tất cả
    } else {
      return res.status(403).json({ error: 'Your role does not have permission to view this plan.' });
    }

    const plan = await db.KpiPlan.findOne({
      where: whereClause,
      include: [
        { model: db.KpiPlanItem, as: 'items' },
        { model: db.Employee, as: 'employee', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [
        [{ model: db.KpiPlanItem, as: 'items' }, 'id', 'ASC']
      ],
    });

    if (!plan || plan.length === 0) {
      return res.json({ message: 'No plan found for this period.' });
    }
    
    // Nếu là nhân viên thường hoặc Trưởng Đơn vị tự xem kế hoạch của mình, chỉ trả về 1 plan
    if (['NhanvienCM', 'Phophong', 'Truongphong', 'PhoDV', 'TruongDonVi'].includes(userRole) && plan.length === 1) {
      return res.json({ items: [] });
    }

    res.json(plan);
  } catch (err) {
    console.error("Lỗi getMyPlan:", err);
    res.status(500).json({ error: 'Server error while loading KPI plan' });
  }
};
exports.createMyPlan = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const userId = req.user.id;
    const { month, year, items } = req.body;

    if (!month || !year || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Thiếu dữ liệu kế hoạch." });
    }

    const existingPlan = await db.KpiPlan.findOne({
      where: { employee_id: userId, month, year },
      transaction
    });
    if (existingPlan) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Kế hoạch đã tồn tại cho kỳ này.' });
    }

    const newPlan = await db.KpiPlan.create({
      employee_id: userId,
      month: parseInt(month),
      year: parseInt(year),
      status: 'Mới tạo',
      final_score: 0,
    }, { transaction });

    for (const item of items) {
      await db.KpiPlanItem.create({
        plan_id: newPlan.id,
        name: item.name,
        weight: item.weight,
        self_score: 0,
        manager_score: 0,
        director_score: 0,
      }, { transaction });
    }

    await transaction.commit();
    res.json({ message: 'Tạo kế hoạch thành công!', planId: newPlan.id });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Lỗi createMyPlan:", err);
    res.status(500).json({ error: 'Lỗi server khi tạo kế hoạch' });
  }
};

exports.updateMyPlan = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const userId = req.user.id;
    const { planId, items } = req.body;

    if (!planId || !Array.isArray(items)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Thiếu planId hoặc dữ liệu cập nhật.' });
    }
    
    for (const item of items) {
      await db.KpiPlanItem.update(
        {
          name: item.name,
          weight: item.weight,
        },
        { where: { id: item.id, plan_id: planId }, transaction }
      );
    }
    
    await transaction.commit();
    res.json({ message: 'Cập nhật kế hoạch thành công!' });

  } catch (err) {
    await transaction.rollback();
    console.error("Lỗi updateMyPlan:", err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật kế hoạch.' });
  }
};

exports.submitAssessment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
      const { planId, items } = req.body;
      const userRole = req.user.role;

      const plan = await db.KpiPlan.findByPk(planId, { transaction });
      if (!plan) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Kế hoạch không tồn tại.' });
      }
      
      // --- Logic xác định trạng thái mới ---
      let nextStatus = '';
      if (['NhanvienCM', 'Phophong', 'Truongphong', 'PhoDV', 'Admin'].includes(userRole)) {
          // Sau khi nhân viên nộp điểm, trạng thái chuyển sang Chờ TĐV chấm
          nextStatus = 'Chờ TĐV chấm';
      } else if (userRole === 'TruongDonVi') {
          // Sau khi Trưởng đơn vị chấm, trạng thái chuyển sang Chờ TGĐ chấm
          nextStatus = 'Chờ TGĐ chấm';
      } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
          // Sau khi TGĐ/Admin chấm, trạng thái hoàn tất
          nextStatus = 'Hoàn thành';
      } else {
          await transaction.rollback();
          return res.status(403).json({ error: 'Vai trò không hợp lệ.' });
      }

      // --- Logic cập nhật điểm số và trạng thái ---
      for (const item of items) {
          const updateData = {};
          // Xác định trường dữ liệu cần cập nhật dựa trên vai trò
          if (['NhanvienCM', 'Phophong', 'Truongphong', 'PhoDV'].includes(userRole)) {
              updateData.self_score = item.self_score;
          } else if (userRole === 'TruongDonVi') {
              updateData.manager_score = item.manager_score;
          } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
              updateData.director_score = item.director_score;
          }

          await db.KpiPlanItem.update(
              updateData,
              { where: { id: item.id }, transaction }
          );
      }
      
      // Cập nhật trạng thái và final_score cho kế hoạch chính
      plan.status = nextStatus;
      

      if (nextStatus === 'Hoàn thành') {
          const allItems = await db.KpiPlanItem.findAll({ where: { plan_id: planId }, transaction });
          const employeeBeingRated = await db.Employee.findByPk(plan.employee_id);
          
          const selfScoreSum = allItems.reduce((sum, item) => sum + (Number(item.self_score) || 0), 0);
          const managerScoreSum = allItems.reduce((sum, item) => sum + (Number(item.manager_score) || 0), 0);
          const directorScoreSum = allItems.reduce((sum, item) => sum + (Number(item.director_score) || 0), 0);

          let finalScore = 0;
          if (employeeBeingRated.role === 'TruongDonVi') {
              finalScore = (managerScoreSum * 0.3) + (directorScoreSum * 0.7);
          } else {
              finalScore = (selfScoreSum * 0.3) + (managerScoreSum * 0.4) + (directorScoreSum * 0.3);
          }
          plan.final_score = finalScore.toFixed(2);
      }
      
      await plan.save({ transaction });

      await transaction.commit();
      res.json({ message: 'Nộp đánh giá thành công!', status: nextStatus });
  } catch (err) {
      await transaction.rollback();
      console.error('Lỗi submitAssessment:', err);
      res.status(500).json({ error: 'Lỗi server khi nộp đánh giá' });
  }
};

// ✅ BỔ SUNG: Hàm bulkApprove
exports.bulkApprove = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { planIds, userRole } = req.body;

    if (!Array.isArray(planIds) || planIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Thiếu danh sách kế hoạch cần duyệt.' });
    }

    let nextStatus = '';
    let scoreFieldToUpdate = '';

    if (userRole === 'TruongDonVi') {
      nextStatus = 'Chờ TGĐ chấm';
      scoreFieldToUpdate = 'manager_score';
    } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
      nextStatus = 'Hoàn thành';
      scoreFieldToUpdate = 'director_score';
    } else {
      await transaction.rollback();
      return res.status(403).json({ error: 'Vai trò của bạn không có quyền duyệt kế hoạch.' });
    }

    for (const planId of planIds) {
      const plan = await db.KpiPlan.findByPk(planId, { transaction });
      if (!plan) continue;

      const planItems = await db.KpiPlanItem.findAll({ where: { plan_id: planId }, transaction });
      if (planItems.length === 0) continue;

      const updates = {};
      if (scoreFieldToUpdate === 'manager_score') {
        updates.status = nextStatus;
      } else if (scoreFieldToUpdate === 'director_score') {
        updates.status = nextStatus;
        // Tính final_score nếu là bước cuối
        const selfScoreSum = planItems.reduce((sum, item) => sum + (Number(item.self_score) || 0), 0);
        const managerScoreSum = planItems.reduce((sum, item) => sum + (Number(item.manager_score) || 0), 0);
        const directorScoreSum = planItems.reduce((sum, item) => sum + (Number(item.director_score) || 0), 0);

        let finalScore = 0;
        const employeeBeingRated = await db.Employee.findByPk(plan.employee_id);
        if (employeeBeingRated.role === 'TruongDonVi') {
          finalScore = (managerScoreSum * 0.3) + (directorScoreSum * 0.7);
        } else {
          finalScore = (selfScoreSum * 0.3) + (managerScoreSum * 0.4) + (directorScoreSum * 0.3);
        }
        plan.final_score = finalScore.toFixed(2);
        await plan.save({ transaction });
      }

      await db.KpiPlanItem.update(
        { status: nextStatus },
        { where: { plan_id: planId }, transaction }
      );
    }

    await transaction.commit();
    res.json({ message: 'Duyệt hàng loạt thành công!' });
  } catch (err) {
    await transaction.rollback();
    console.error('Lỗi bulkApprove:', err);
    res.status(500).json({ error: 'Lỗi server khi duyệt hàng loạt.' });
  }
};