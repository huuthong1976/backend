// server/services/companyKpiResultsService.js

const {
    CompanyKpiRegistration,
    CompanyKpiMonthly,
    CompanyKpiMonthlySummary,
    KpiLibrary,
    sequelize,
  } = require('../models');
  
  /** Xác định KPI "thấp hơn tốt hơn" */
  const isLowerBetter = (direction) => {
    if (!direction) return false;
    const d = String(direction).toLowerCase().trim();
    return d === 'lower_is_better' || d.includes('thấp');
  };
  
  /**
   * % hoàn thành:
   * - target = 0:
   *    - actual = 0  -> 100%
   *    - 'thấp hơn tốt hơn': actual <= 0 -> 200%, actual > 0 -> 0%
   *    - 'cao hơn tốt hơn' : actual  > 0 -> 200%, actual <= 0 -> 0%
   * - target > 0:
   *    - 'thấp hơn tốt hơn': (2 - actual/target) * 100
   *    - 'cao hơn tốt hơn' : (actual/target) * 100
   * - Giới hạn [0..200]
   */
  const computeCompletionRate = (target, actual, direction) => {
    const t = Number(target) || 0;
    const a = Number(actual) || 0;
  
    let rate = 0;
  
    if (t === 0) {
      if (a === 0) {
        rate = 100;
      } else if (isLowerBetter(direction)) {
        rate = a <= 0 ? 200 : 0;
      } else {
        rate = a > 0 ? 200 : 0;
      }
    } else {
      if (isLowerBetter(direction)) {
        rate = (2 - a / t) * 100;
      } else {
        rate = (a / t) * 100;
      }
    }
  
    return Math.max(0, Math.min(200, rate));
  };
  
  /** Tổng điểm tháng = tổng score KPI lá, chặn biên 0..100 */
  const sumMonthlyLeafScore = (rows, leafIdSet) => {
    const total = (rows || []).reduce((sum, r) => {
      if (!leafIdSet || leafIdSet.has(r.registration_id)) {
        const s = parseFloat(r?.score ?? 0);
        return sum + (Number.isFinite(s) ? s : 0);
      }
      return sum;
    }, 0);
    return Math.max(0, Math.min(100, total));
  };
  
  /**
   * LẤY DỮ LIỆU KẾT QUẢ KPI ĐƠN VỊ (phẳng)
   * Trả về danh sách KPI đã đăng ký + dữ liệu tháng (nếu có).
   */
  const get = async (filters) => {
    const { companyId, year, month } = filters || {};
    if (!companyId || !year || !month) return [];
  
    try {
      // 1) Đăng ký KPI + chi tiết KPI (chốt cứng attributes để tránh select cột ảo)
      const kpiDetailAttrs = [
        'id',
        'kpi_name',
        'perspective_id',
        'parent_id',
        'unit',
        'description',
        'type',
        'direction',
        'company_id',
      ];
  
      const registrations = await CompanyKpiRegistration.findAll({
        where: { company_id: companyId, year },
        include: [
          {
            model: KpiLibrary,
            as: 'kpiDetail',
            required: false,
            attributes: kpiDetailAttrs,
          },
        ],
        order: [['parent_registration_id', 'ASC'], ['id', 'ASC']],
      });
  
      // 2) Dòng tháng đã lưu
      const monthlyRows = await CompanyKpiMonthly.findAll({
        where: { year, month, registration_id: registrations.map((r) => r.id) },
        attributes: [
          'registration_id',
          'target_value',
          'actual_value',
          'completion_rate',
          'score',
        ],
        raw: true,
      });
      const monthlyMap = new Map(monthlyRows.map((m) => [m.registration_id, m]));
  
      // 3) Gộp dữ liệu phẳng cho FE
      const detailedResults = registrations.map((reg) => {
        const r = reg.toJSON();
        const monthData = monthlyMap.get(r.id);
  
        const kpiName = r?.kpiDetail?.kpi_name || 'N/A';
        const aspectName = r?.kpiDetail?.perspective?.name || 'Chưa phân loại'; // nếu có association perspective thì FE hiển thị, không bắt buộc
        const direction = r?.kpiDetail?.direction || r?.direction || 'cao hơn tốt hơn';
        const unit = r?.kpiDetail?.unit || r?.unit || '';
        const weight = Number(r?.weight || r?.kpiDetail?.weight || 0);
  
        const targetMonth = Number(monthData?.target_value || 0);
        const actual = Number(monthData?.actual_value || 0);
  
        const completion =
          monthData?.completion_rate != null
            ? Number(monthData.completion_rate)
            : computeCompletionRate(targetMonth, actual, direction);
  
        const score =
          monthData?.score != null
            ? Number(monthData.score)
            : (completion / 100) * weight;
  
        return {
          id: r.id,
          parent_registration_id: r.parent_registration_id,
          kpi_name: kpiName,
          aspectName,
          direction,
          unit,
          weight,
          target_month: targetMonth,
          actual_value: actual,
          completion_rate: Number(completion.toFixed(2)),
          score: Number(score.toFixed(2)),
        };
      });
  
      return detailedResults;
    } catch (err) {
      console.error('companyKpiResultsService.get error:', err);
      return [];
    }
  };
  
  /**
   * LƯU KẾT QUẢ KPI THÁNG
   * body: { company_id, year, month, results: [{ registration_id, actual_value }] }
   */
  const save = async (payload) => {
    const { company_id, year, month, results } = payload || {};
    if (!company_id || !year || !month || !Array.isArray(results)) {
      throw new Error('Thiếu tham số company_id/year/month hoặc results.');
    }
  
    const t = await sequelize.transaction();
    try {
      const regIds = results.map((r) => r.registration_id).filter(Boolean);
      if (regIds.length === 0) {
        await t.rollback();
        return { ok: true, updated: 0, total_score: 0 };
      }
  
      // 1) Lấy registrations (chốt cứng attributes của kpiDetail)
      const kpiDetailAttrs = [
        'id',
        'kpi_name',
        'perspective_id',
        'parent_id',
        'unit',
        'description',
        'type',
        'direction',
        'company_id',
      ];
  
      const regs = await CompanyKpiRegistration.findAll({
        where: { id: regIds, company_id, year },
        include: [
          {
            model: KpiLibrary,
            as: 'kpiDetail',
            required: false,
            attributes: kpiDetailAttrs,
          },
        ],
        transaction: t,
      });
  
      if (regs.length === 0) {
        await t.rollback();
        throw new Error('Không tìm thấy đăng ký KPI tương ứng.');
      }
  
      const regMap = new Map(
        regs.map((r) => [
          r.id,
          {
            id: r.id,
            parent_registration_id: r.parent_registration_id,
            weight: Number(r.weight || r?.kpiDetail?.weight || 0),
            direction: r?.kpiDetail?.direction || r.direction || 'cao hơn tốt hơn',
          },
        ])
      );
  
      // Xác định các ID cha để phân biệt KPI lá
      const parentIdSet = new Set();
      regs.forEach((r) => {
        if (r.parent_registration_id) parentIdSet.add(r.parent_registration_id);
      });
  
      // 2) Lấy target tháng đã phân bổ để tính % hoàn thành
      const monthlyExisted = await CompanyKpiMonthly.findAll({
        where: { year, month, registration_id: regIds },
        attributes: ['registration_id', 'target_value', 'actual_value'],
        transaction: t,
        raw: true,
      });
      const monthlyMap = new Map(monthlyExisted.map((m) => [m.registration_id, m]));
  
      // 3) Chuẩn bị dữ liệu upsert
      const rowsToUpsert = results
        .map((r) => {
          const reg = regMap.get(r.registration_id);
          if (!reg) return null;
  
          const existed = monthlyMap.get(r.registration_id);
          const target = Number(existed?.target_value || 0);
          const actual = Number(r.actual_value || 0);
  
          const completion = computeCompletionRate(target, actual, reg.direction);
          const score = (completion / 100) * reg.weight;
  
          return {
            registration_id: r.registration_id,
            year: Number(year),
            month: Number(month),
            target_value: target,
            actual_value: actual,
            completion_rate: Number(completion.toFixed(2)),
            score: Number(score.toFixed(2)),
          };
        })
        .filter(Boolean);
  
      if (rowsToUpsert.length === 0) {
        await t.rollback();
        return { ok: true, updated: 0, total_score: 0 };
      }
  
      // 4) Upsert CompanyKpiMonthly
      await CompanyKpiMonthly.bulkCreate(rowsToUpsert, {
        updateOnDuplicate: ['actual_value', 'completion_rate', 'score'],
        transaction: t,
      });
  
      // 5) Tổng điểm = tổng score của KPI lá
      const leafIdSet = new Set(
        rowsToUpsert
          .map((r) => r.registration_id)
          .filter((id) => !parentIdSet.has(id))
      );
  
      const totalScore = sumMonthlyLeafScore(rowsToUpsert, leafIdSet);
  
      await CompanyKpiMonthlySummary.upsert(
        {
          company_id,
          year: Number(year),
          month: Number(month),
          total_score: Number(totalScore.toFixed(2)),
        },
        { transaction: t }
      );
  
      await t.commit();
      return { ok: true, updated: rowsToUpsert.length, total_score: totalScore };
    } catch (err) {
      console.error('companyKpiResultsService.save error:', err);
      await t.rollback();
      throw err;
    }
  };
  
  const getMonthlySummary = async (companyId, year, month) => {
    const row = await CompanyKpiMonthlySummary.findOne({
      where: { company_id: companyId, year, month },
      attributes: ['total_score'],
      raw: true,
    });
    return row ? Number(row.total_score) : 0;
  };
  
  module.exports = {
    get,
    save,
    getMonthlySummary,
  };
  