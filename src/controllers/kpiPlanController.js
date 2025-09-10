// server/controllers/kpiPlanController.js
const db = require('../models');
const { Op } = require('sequelize');

// Hàm helper để lấy ID cấp dưới
async function getSubordinateIds(managerId) {
  const subordinates = await db.Employee.findAll({
    where: { manager_id: managerId },
    attributes: ['id'],
  });
  return subordinates.map(s => s.id);
}

// Lấy kế hoạch KPI
exports.getMyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Thiếu thông tin tháng hoặc năm' });
    }

    // Chỉ lấy kế hoạch của chính người dùng này
    const plan = await db.KpiPlan.findOne({
      where: { 
        employee_id: userId,
        month: parseInt(month), 
        year: parseInt(year) 
      },
      include: [
        { model: db.KpiPlanItem, as: 'items' },
        { model: db.Employee, as: 'employee', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [
        [{ model: db.KpiPlanItem, as: 'items' }, 'id', 'ASC']
      ],
    });

    // SỬA LỖI: Kiểm tra `plan` là object, không phải array. Bỏ logic trả về mảng rỗng.
    if (!plan) {
      return res.json({ message: 'No plan found for this period.' });
    }

    res.json(plan);
  } catch (err) {
    console.error("Lỗi getMyPlan:", err);
    res.status(500).json({ error: 'Lỗi server khi tải kế hoạch KPI' });
  }
};

// Tạo mới kế hoạch
exports.createMyPlan = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const userId = req.user.id;
    const { month, year, items } = req.body;

    if (!month || !year || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Thiếu dữ liệu kế hoạch." });
    }

    const existingPlan = await db.KpiPlan.findOne({
      where: { employee_id: userId, month, year }
    });
    if (existingPlan) {
      return res.status(409).json({ error: 'Kế hoạch đã tồn tại cho kỳ này.' });
    }

    const newPlan = await db.KpiPlan.create({
      employee_id: userId,
      month: parseInt(month),
      year: parseInt(year),
      status: 'Mới tạo',
      final_score: 0,
    }, { transaction });

    // CẢI TIỆN: Dùng bulkCreate để tối ưu hiệu năng
    const itemPayload = items.map(item => ({
        plan_id: newPlan.id,
        name: item.name,
        weight: item.weight,
    }));
    await db.KpiPlanItem.bulkCreate(itemPayload, { transaction });

    await transaction.commit();
    res.status(201).json({ message: 'Tạo kế hoạch thành công!', planId: newPlan.id });
  } catch (err) {
    await transaction.rollback();
    console.error("Lỗi createMyPlan:", err);
    res.status(500).json({ error: 'Lỗi server khi tạo kế hoạch' });
  }
};

// Cập nhật các mục tiêu trong kế hoạch
exports.updateMyPlan = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const userId = req.user.id;
    const { planId, items } = req.body;

    if (!planId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Thiếu planId hoặc dữ liệu cập nhật.' });
    }
    
    // CẢI TIỆN: Thêm kiểm tra quyền sở hữu
    const plan = await db.KpiPlan.findByPk(planId);
    if (!plan || plan.employee_id !== userId) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa kế hoạch này.'});
    }
    if (plan.status !== 'Mới tạo') {
        return res.status(403).json({ error: 'Chỉ có thể chỉnh sửa kế hoạch ở trạng thái "Mới tạo".'});
    }

    for (const item of items) {
      if (item.id) { // Chỉ cập nhật item đã có
        await db.KpiPlanItem.update(
          { name: item.name, weight: item.weight },
          { where: { id: item.id, plan_id: planId }, transaction }
        );
      }
    }
    
    await transaction.commit();
    res.json({ message: 'Cập nhật kế hoạch thành công!' });

  } catch (err) {
    await transaction.rollback();
    console.error("Lỗi updateMyPlan:", err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật kế hoạch.' });
  }
};

// Nộp điểm đánh giá và chuyển trạng thái
exports.submitAssessment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
      const { planId, items } = req.body;
      const userRole = req.user.role;

      const plan = await db.KpiPlan.findByPk(planId, { transaction });
      if (!plan) {
          return res.status(404).json({ error: 'Kế hoạch không tồn tại.' });
      }
      
      let nextStatus = '';
      if (['NhanvienCM', 'Phophong', 'Truongphong', 'PhoDV'].includes(userRole)) {
          nextStatus = 'Chờ TĐV chấm';
      } else if (userRole === 'TruongDonVi') {
          nextStatus = 'Chờ TGĐ chấm';
      } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
          nextStatus = 'Hoàn thành';
      } else {
          return res.status(403).json({ error: 'Vai trò không hợp lệ.' });
      }

      for (const item of items) {
          const updateData = {};
          if (userRole.startsWith('Nhanvien') || userRole.includes('phong') || userRole.includes('PhoDV')) {
              updateData.self_score = item.self_score;
          } else if (userRole === 'TruongDonVi') {
              updateData.manager_score = item.manager_score;
          } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
              updateData.director_score = item.director_score;
          }
          if (Object.keys(updateData).length > 0) {
            await db.KpiPlanItem.update(updateData, { where: { id: item.id }, transaction });
          }
      }
      
      plan.status = nextStatus;
      
      if (nextStatus === 'Hoàn thành') {
          const allItems = await db.KpiPlanItem.findAll({ where: { plan_id: planId }, transaction });
          const employeeBeingRated = await db.Employee.findByPk(plan.employee_id);
          
          // SỬA LỖI: Tính lại final_score theo đúng công thức nhân với trọng số
          let totalScore = 0;
          for (const item of allItems) {
              const weight = Number(item.weight) || 0;
              const selfScore = (Number(item.self_score) || 0) * 10;
              const managerScore = (Number(item.manager_score) || 0) * 10;
              const directorScore = (Number(item.director_score) || 0) * 10;
              
              let definitiveScore = 0;
              if (employeeBeingRated.role === 'TruongDonVi') {
                  definitiveScore = (managerScore * 0.3) + (directorScore * 0.7);
              } else {
                  definitiveScore = (selfScore * 0.3) + (managerScore * 0.4) + (directorScore * 0.3);
              }
              totalScore += (definitiveScore * weight) / 100;
          }
          plan.final_score = totalScore.toFixed(2);
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

// Duyệt hàng loạt
exports.bulkApprove = async (req, res) => {
  // SỬA LỖI & CẢI TIỆN: Toàn bộ logic được viết lại cho chính xác
  const transaction = await db.sequelize.transaction();
  try {
    const { planIds } = req.body;
    const userRole = req.user.role;

    if (!Array.isArray(planIds) || planIds.length === 0) {
      return res.status(400).json({ error: 'Thiếu danh sách kế hoạch cần duyệt.' });
    }

    let nextStatus = '';
    if (userRole === 'TruongDonVi') {
      nextStatus = 'Chờ TGĐ chấm';
    } else if (userRole === 'TongGiamDoc' || userRole === 'Admin') {
      nextStatus = 'Hoàn thành';
    } else {
      return res.status(403).json({ error: 'Vai trò của bạn không có quyền duyệt hàng loạt.' });
    }

    await db.KpiPlan.update(
        { status: nextStatus },
        { where: { id: { [Op.in]: planIds } }, transaction }
    );
    
    // Nếu là bước cuối cùng (Hoàn thành), tính lại điểm cho tất cả các plan
    if (nextStatus === 'Hoàn thành') {
        for(const planId of planIds) {
            // Có thể tách logic tính điểm ra một hàm riêng để tái sử dụng
            const plan = await db.KpiPlan.findByPk(planId, {transaction});
            const allItems = await db.KpiPlanItem.findAll({ where: { plan_id: planId }, transaction });
            const employeeBeingRated = await db.Employee.findByPk(plan.employee_id, {transaction});
            
            let totalScore = 0;
            for (const item of allItems) {
                const weight = Number(item.weight) || 0;
                const selfScore = (Number(item.self_score) || 0) * 10;
                const managerScore = (Number(item.manager_score) || 0) * 10;
                const directorScore = (Number(item.director_score) || 0) * 10;
                
                let definitiveScore = 0;
                if (employeeBeingRated.role === 'TruongDonVi') {
                    definitiveScore = (managerScore * 0.3) + (directorScore * 0.7);
                } else {
                    definitiveScore = (selfScore * 0.3) + (managerScore * 0.4) + (directorScore * 0.3);
                }
                totalScore += (definitiveScore * weight) / 100;
            }
            plan.final_score = totalScore.toFixed(2);
            await plan.save({transaction});
        }
    }

    await transaction.commit();
    res.json({ message: `Duyệt hàng loạt ${planIds.length} kế hoạch thành công!` });
  } catch (err) {
    await transaction.rollback();
    console.error('Lỗi bulkApprove:', err);
    res.status(500).json({ error: 'Lỗi server khi duyệt hàng loạt.' });
  }
};