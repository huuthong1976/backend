// backend/routes/work_plans.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// Hàm helper để lấy tỷ trọng đánh giá
const getEvaluationWeights = async (evaluatedRole, companyId, year) => {
    // Hàm này giống như trong kpi.js, có thể chuyển thành helper chung nếu cần
    let query = `SELECT evaluator_role, weight_percentage FROM evaluation_weights WHERE evaluated_role = ? `;
    const params = [evaluatedRole];
    if (companyId) { query += `AND company_id = ? `; params.push(companyId); } else { query += `AND company_id IS NULL `; }
    if (year) { query += `AND year = ? `; params.push(year); } else { query += `AND year IS NULL `; }
    const [weights] = await db.query(query, params);
    const weightMap = {};
    weights.forEach(w => { weightMap[w.evaluator_role] = parseFloat(w.weight_percentage); });
    return weightMap;
};

// Hàm tính điểm thành phần (chuyển đổi 1-10 về 0-100)
const calculateComponentScore = (rawScore) => {
    return rawScore !== null ? (rawScore / 10) * 100 : 100; // Mặc định là 10 nếu chưa chấm
};

// @route   GET /api/work-plans
// @desc    Lấy kế hoạch công việc cá nhân (cho mình hoặc người khác nếu có quyền)
// @access  Private
router.get('/', protect, async (req, res) => {
    const { month, year, employee_id } = req.query;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    let targetEmployeeId = employee_id || currentUserId;

    if (currentUserRole === 'NhanVien' && targetEmployeeId != currentUserId) {
        return res.status(403).json({ error: 'Bạn không có quyền xem kế hoạch công việc của người khác.' });
    }
    if (currentUserRole === 'TruongDonVi' && targetEmployeeId != currentUserId) {
        const [emp] = await db.query('SELECT manager_id, company_id FROM employees WHERE id = ?', [targetEmployeeId]);
        if (emp.length === 0 || emp[0].manager_id != currentUserId) {
            // Hoặc nếu trưởng đơn vị chỉ quản lý nhân viên trong cùng đơn vị
            const [managerCompany] = await db.query('SELECT company_id FROM employees WHERE id = ?', [currentUserId]);
            if(managerCompany.length === 0 || managerCompany[0].company_id !== emp[0].company_id) {
                return res.status(403).json({ error: 'Bạn không có quyền xem kế hoạch công việc của nhân viên này.' });
            }
        }
    }

    if (!month || !year) {
        return res.status(400).json({ error: 'Tháng và Năm là bắt buộc.' });
    }

    try {
        const query = `
            SELECT 
                ewp.*, 
                e.full_name as employee_full_name, e.role as employee_role, e.company_id as employee_company_id
            FROM employee_work_plans ewp
            JOIN employees e ON ewp.employee_id = e.id
            WHERE ewp.employee_id = ? AND ewp.month = ? AND ewp.year = ?
            ORDER BY ewp.work_order_number ASC, ewp.id ASC
        `;
        const [plans] = await db.query(query, [targetEmployeeId, month, year]);

        const plansWithScores = [];
        let totalWeightedScore = 0; // Để tính tổng điểm KPI cuối cùng

        if (plans.length > 0) {
            const evaluatedRole = plans[0].employee_role;
            const companyId = plans[0].employee_company_id;
            const planYear = plans[0].year;

            const weights = await getEvaluationWeights(evaluatedRole, companyId, planYear);

            for (const plan of plans) {
                const personal_score_raw = calculateComponentScore(plan.self_score);
                const manager_score_raw = calculateComponentScore(plan.manager_score);
                const ceo_score_raw = calculateComponentScore(plan.ceo_score);

                let work_score = 0;
                if (evaluatedRole === 'NhanVien' || evaluatedRole === 'TruongPhong' || evaluatedRole === 'KeToan') {
                    work_score = (personal_score_raw * (weights['Cá nhân'] || 0) / 100) +
                                 (manager_score_raw * (weights['Trưởng đơn vị'] || 0) / 100) +
                                 (ceo_score_raw * (weights['Tổng giám đốc'] || 0) / 100);
                } else if (evaluatedRole === 'TruongDonVi' || evaluatedRole === 'TongGiamDoc') { // TGĐ tự chấm cũng dùng quy tắc Trưởng đơn vị
                    work_score = (personal_score_raw * (weights['Cá nhân'] || 0) / 100) +
                                 (ceo_score_raw * (weights['Tổng giám đốc'] || 0) / 100);
                }

                const weighted_work_score = work_score * (plan.weight_percentage / 100);
                totalWeightedScore += weighted_work_score;

                plansWithScores.push({
                    ...plan,
                    personal_score_calculated: personal_score_raw,
                    manager_score_calculated: manager_score_raw,
                    ceo_score_calculated: ceo_score_raw,
                    weighted_work_score: weighted_work_score
                });
            }
        }

        // Gắn tổng điểm vào response (có thể ở một trường riêng hoặc là một phần của tổng thể)
        res.json({
            plans: plansWithScores,
            total_kpi_score: totalWeightedScore
        });

    } catch (err) {
        console.error("Lỗi Server tại /api/work-plans (GET):", err.message);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/work-plans
// @desc    Tạo kế hoạch công việc mới
// @access  Private (Chỉ user tạo cho mình, Admin/Trưởng đơn vị tạo cho người khác)
router.post('/', protect, async (req, res) => {
    // Loại bỏ work_order_number khỏi destructuring req.body vì nó sẽ được tự động tính toán
    const { employee_id, month, year, work_name, assigned_date, due_date, weight_percentage, company_id } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const currentUserCompanyId = req.user.company_id; // Giá trị này đến từ JWT của người dùng

    // ... (Logic xác định targetCompanyId)
    let targetCompanyId = company_id; // company_id từ request body (nếu có)

    if (currentUserRole === 'NhanVien' || currentUserRole === 'TruongPhong' || currentUserRole === 'KeToan' || currentUserRole === 'TruongDonVi') {
        targetCompanyId = currentUserCompanyId;
    }
    console.log('User company ID from JWT:', currentUserCompanyId);
    console.log('Company ID determined for insert:', targetCompanyId);
    console.log('Request body company ID:', company_id);

    if (!targetCompanyId) {
        return res.status(400).json({ error: 'Không thể xác định đơn vị cho kế hoạch công việc.' });
    }
    // Phân quyền tạo:
    if (employee_id != currentUserId && currentUserRole !== 'Admin' && currentUserRole !== 'TruongDonVi') {
        return res.status(403).json({ error: 'Bạn không có quyền tạo kế hoạch công việc cho người khác.' });
    }
    // Nếu là Trưởng đơn vị, kiểm tra xem có phải nhân viên dưới quyền không
    if (currentUserRole === 'TruongDonVi' && employee_id != currentUserId) {
        const [emp] = await db.query('SELECT manager_id, company_id FROM employees WHERE id = ?', [employee_id]);
        if (emp.length === 0 || emp[0].manager_id != currentUserId) {
             const [managerCompany] = await db.query('SELECT company_id FROM employees WHERE id = ?', [currentUserId]);
             if(managerCompany.length === 0 || managerCompany[0].company_id !== emp[0].company_id) {
                 return res.status(403).json({ error: 'Bạn không có quyền tạo kế hoạch cho nhân viên này.' });
             }
        }
    }

    if (!employee_id || !month || !year || !work_name || !weight_percentage) {
        return res.status(400).json({ msg: 'Thiếu thông tin bắt buộc (employee_id, tháng, năm, tên công việc, tỷ trọng).' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Kiểm tra tổng tỷ trọng không vượt 100%
        const [currentWeights] = await connection.query(
            'SELECT SUM(weight_percentage) as total_weight FROM employee_work_plans WHERE employee_id = ? AND month = ? AND year = ?',
            [employee_id, month, year]
        );
        const totalWeight = parseFloat(currentWeights[0].total_weight || 0) + parseFloat(weight_percentage);
        if (totalWeight > 100) {
            await connection.rollback();
            return res.status(400).json({ msg: `Tổng tỷ trọng công việc không được vượt quá 100%. Hiện tại là ${totalWeight}%.` });
        }

        // Bước mới: Lấy work_order_number lớn nhất hiện có và tăng lên 1
        const [maxOrderResult] = await connection.query(
            'SELECT COALESCE(MAX(work_order_number), 0) + 1 AS next_work_order_number FROM employee_work_plans WHERE employee_id = ? AND month = ? AND year = ?',
            [employee_id, month, year]
        );
        const nextWorkOrderNumber = maxOrderResult[0].next_work_order_number;

        // Cập nhật câu lệnh INSERT để sử dụng nextWorkOrderNumber đã tính toán
        const [result] = await connection.query(
            `INSERT INTO employee_work_plans (employee_id, company_id, month, year, work_order_number, work_name, assigned_date, due_date, weight_percentage, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Mới tạo')`,
            [employee_id, targetCompanyId, month, year, nextWorkOrderNumber, work_name, assigned_date || null, due_date || null, weight_percentage]
        );
        await connection.commit();
        res.status(201).json({ id: result.insertId, msg: 'Thêm kế hoạch công việc thành công!', work_order_number: nextWorkOrderNumber }); // Trả về số thứ tự đã tạo
    } catch (err) {
        await connection.rollback();
        // Cần chỉnh sửa thông báo lỗi cho ER_DUP_ENTRY vì giờ work_order_number tự tạo
        if (err.code === 'ER_DUP_ENTRY') {
            // Lỗi này giờ chỉ xảy ra nếu work_name trùng lặp cho cùng nhân viên, tháng, năm
            return res.status(409).json({ msg: 'Tên công việc đã tồn tại cho nhân viên trong tháng/năm này. Vui lòng chọn tên khác.' });
        }
        console.error("Lỗi Server tại /api/work-plans (POST):", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// @route   PUT /api/work-plans/:id
// @desc    Cập nhật kế hoạch công việc (chỉ các trường kế hoạch)
// @access  Private (chỉ người tạo hoặc Admin/Trưởng đơn vị)
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    // work_order_number vẫn có thể được chỉnh sửa thủ công nếu Admin muốn thay đổi thứ tự
    const { work_order_number, work_name, assigned_date, due_date, weight_percentage } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [plan] = await connection.query('SELECT employee_id, month, year, status, weight_percentage FROM employee_work_plans WHERE id = ?', [id]);
        if (plan.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Không tìm thấy kế hoạch công việc.' });
        }

        // Phân quyền sửa: Chỉ Admin, hoặc chủ sở hữu khi status là 'Mới tạo'
        if (currentUserRole !== 'Admin' && plan[0].employee_id !== currentUserId) {
            await connection.rollback();
            return res.status(403).json({ error: 'Bạn không có quyền sửa kế hoạch công việc này.' });
        }
        if (currentUserRole !== 'Admin' && plan[0].status !== 'Mới tạo') {
            await connection.rollback();
            return res.status(403).json({ error: 'Không thể sửa kế hoạch công việc đã được duyệt/chấm điểm.' });
        }

        // Kiểm tra tổng tỷ trọng nếu weight_percentage thay đổi
        if (weight_percentage && parseFloat(weight_percentage) !== parseFloat(plan[0].weight_percentage)) {
            const [currentWeights] = await connection.query(
                'SELECT SUM(weight_percentage) as total_weight FROM employee_work_plans WHERE employee_id = ? AND month = ? AND year = ? AND id != ?',
                [plan[0].employee_id, plan[0].month, plan[0].year, id]
            );
            const totalWeight = parseFloat(currentWeights[0].total_weight || 0) + parseFloat(weight_percentage);
            if (totalWeight > 100) {
                await connection.rollback();
                return res.status(400).json({ msg: `Tổng tỷ trọng công việc không được vượt quá 100%. Hiện tại là ${totalWeight}%.` });
            }
        }

        // Kiểm tra trùng work_name hoặc work_order_number nếu chúng được thay đổi
        if (work_name !== plan[0].work_name || (work_order_number && parseInt(work_order_number) !== plan[0].work_order_number)) {
            const [duplicateCheck] = await connection.query(
                `SELECT id FROM employee_work_plans 
                 WHERE employee_id = ? AND month = ? AND year = ? AND id != ?
                 AND (work_name = ? OR work_order_number = ?)`,
                [plan[0].employee_id, plan[0].month, plan[0].year, id, work_name, work_order_number]
            );
            if (duplicateCheck.length > 0) {
                await connection.rollback();
                return res.status(409).json({ msg: 'Số thứ tự hoặc tên công việc đã tồn tại cho nhân viên trong tháng/năm này.' });
            }
        }


        await connection.query(
            `UPDATE employee_work_plans SET 
                work_order_number = ?, work_name = ?, assigned_date = ?, due_date = ?, weight_percentage = ?
            WHERE id = ?`,
            [work_order_number || null, work_name, assigned_date || null, due_date || null, weight_percentage, id]
        );
        await connection.commit();
        res.json({ msg: 'Cập nhật kế hoạch công việc thành công!' });

    } catch (err) {
        await connection.rollback();
        // Lỗi ER_DUP_ENTRY có thể vẫn xảy ra nếu một trong hai trường UNIQUE KEY bị trùng do lỗi logic khác hoặc cập nhật sai
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ msg: 'Số thứ tự hoặc tên công việc đã tồn tại cho nhân viên trong tháng/năm này.' });
        }
        console.error("Lỗi Server tại /api/work-plans (PUT):", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// @route   DELETE /api/work-plans/:id
// @desc    Xóa kế hoạch công việc
// @access  Admin
router.delete('/:id', [protect, authorize('Admin')], async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user.id;
        const userIp = req.ip;
        const [result] = await db.query(
            'UPDATE employee_work_plans SET deleted_at = NOW(), deleted_by = ?, deleted_from_ip = ? WHERE id = ?',
            [userId, userIp, recordId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Không tìm thấy kế hoạch công việc.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Lỗi Server tại /api/work-plans (DELETE):", err.message);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/work-plans/submit-for-self-evaluation
// @desc    Chuyển trạng thái kế hoạch công việc sang 'Chờ tự chấm'
// @access  Private (Chủ sở hữu hoặc Admin/Trưởng đơn vị)
router.post('/submit-for-self-evaluation', protect, async (req, res) => {
    const { employee_id, month, year } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Chỉ chủ sở hữu hoặc Admin/Trưởng đơn vị mới có thể submit
    if (employee_id != currentUserId && currentUserRole !== 'Admin' && currentUserRole !== 'TruongDonVi') {
        return res.status(403).json({ error: 'Bạn không có quyền submit kế hoạch công việc này.' });
    }

    try {
        const [result] = await db.query(
            `UPDATE employee_work_plans SET status = 'Chờ tự chấm' 
             WHERE employee_id = ? AND month = ? AND year = ? AND status = 'Mới tạo'`,
            [employee_id, month, year]
        );
        if (result.affectedRows === 0) {
            return res.status(400).json({ msg: 'Không có kế hoạch công việc nào ở trạng thái "Mới tạo" để submit hoặc đã submit.' });
        }
        res.json({ msg: 'Kế hoạch công việc đã được gửi để tự chấm điểm.' });
    } catch (err) {
        console.error("Lỗi Server tại /api/work-plans/submit-for-self-evaluation:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/work-plans/self-evaluate
// @desc    Lưu điểm và đánh giá tự chấm
// @access  Private (chủ sở hữu hoặc Admin)
router.post('/self-evaluate', protect, async (req, res) => {
    const { evaluations } = req.body; // evaluations: [{id, self_score, self_evaluation}, ...]
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const ev of evaluations) {
            const [plan] = await connection.query('SELECT employee_id, status FROM employee_work_plans WHERE id = ?', [ev.id]);
            if (plan.length === 0) {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không tồn tại.`);
            }
            // Chỉ chủ sở hữu hoặc Admin mới có thể tự chấm
            if (currentUserRole !== 'Admin' && plan[0].employee_id !== currentUserId) {
                throw new Error(`Bạn không có quyền tự chấm điểm cho kế hoạch công việc ID ${ev.id}.`);
            }
            // Chỉ cho phép chấm khi status là 'Chờ tự chấm'
            if (plan[0].status !== 'Chờ tự chấm' && currentUserRole !== 'Admin') {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không ở trạng thái 'Chờ tự chấm'.`);
            }

            await connection.query(
                `UPDATE employee_work_plans SET self_score = ?, self_evaluation = ?, status = 'Chờ QL chấm' WHERE id = ?`,
                [ev.self_score, ev.self_evaluation, ev.id]
            );
        }
        await connection.commit();
        res.json({ msg: 'Lưu tự đánh giá thành công!' });
    } catch (err) {
        await connection.rollback();
        console.error("Lỗi Server tại /api/work-plans/self-evaluate:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// @route   POST /api/work-plans/manager-evaluate
// @desc    Trưởng đơn vị chấm điểm và đánh giá
// @access  Private (Trưởng đơn vị, Admin)
router.post('/manager-evaluate', protect, async (req, res) => {
    const { evaluations } = req.body; // evaluations: [{id, manager_score, manager_evaluation}, ...]
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const ev of evaluations) {
            const [plan] = await connection.query(`
                SELECT ewp.employee_id, ewp.status, e.manager_id, e.role as employee_role, e.company_id
                FROM employee_work_plans ewp
                JOIN employees e ON ewp.employee_id = e.id
                WHERE ewp.id = ?
            `, [ev.id]);
            if (plan.length === 0) {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không tồn tại.`);
            }
            const employeePlan = plan[0];

            // Phân quyền: Chỉ Admin hoặc Trưởng đơn vị trực tiếp của nhân viên này
            if (currentUserRole !== 'Admin' && employeePlan.manager_id !== currentUserId) {
                const [managerCompany] = await db.query('SELECT company_id FROM employees WHERE id = ?', [currentUserId]);
                if(managerCompany.length === 0 || managerCompany[0].company_id !== employeePlan.company_id) {
                     throw new Error(`Bạn không có quyền chấm điểm cho kế hoạch công việc ID ${ev.id}.`);
                }
            }
            // Chỉ cho phép chấm khi status là 'Chờ QL chấm'
            if (employeePlan.status !== 'Chờ QL chấm' && currentUserRole !== 'Admin') {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không ở trạng thái 'Chờ QL chấm'.`);
            }

            let nextStatus;
            // Nếu người được chấm là Trưởng đơn vị hoặc Tổng giám đốc, luôn cần TGĐ duyệt tiếp
            if (employeePlan.employee_role === 'TruongDonVi' || employeePlan.employee_role === 'TongGiamDoc') {
                nextStatus = 'Chờ TGĐ chấm';
            } else {
                // Nếu là NV/TP, cần kiểm tra tỷ trọng TGĐ (đã lưu trong evaluation_weights)
                const weights = await getEvaluationWeights(employeePlan.employee_role, employeePlan.company_id, employeePlan.year);
                if (weights['Tổng giám đốc'] && weights['Tổng giám đốc'] > 0) {
                    nextStatus = 'Chờ TGĐ chấm';
                } else {
                    nextStatus = 'Hoàn thành';
                }
            }

            await connection.query(
                `UPDATE employee_work_plans SET manager_score = ?, manager_evaluation = ?, status = ? WHERE id = ?`,
                [ev.manager_score, ev.manager_evaluation, nextStatus, ev.id]
            );
        }
        await connection.commit();
        res.json({ msg: 'Lưu đánh giá của Trưởng đơn vị thành công!' });
    } catch (err) {
        await connection.rollback();
        console.error("Lỗi Server tại /api/work-plans/manager-evaluate:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// @route   POST /api/work-plans/ceo-evaluate
// @desc    Tổng giám đốc chấm điểm và đánh giá (hoàn thành quy trình)
// @access  Private (Tổng giám đốc, Admin)
router.post('/ceo-evaluate', protect, async (req, res) => {
    const { evaluations } = req.body; // evaluations: [{id, ceo_score, ceo_evaluation}, ...]
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const ev of evaluations) {
            const [plan] = await connection.query(`
                SELECT ewp.employee_id, ewp.status
                FROM employee_work_plans ewp
                WHERE ewp.id = ?
            `, [ev.id]);
            if (plan.length === 0) {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không tồn tại.`);
            }
            const employeePlan = plan[0];

            // Phân quyền: Chỉ Admin hoặc Tổng giám đốc
            if (currentUserRole !== 'Admin' && currentUserRole !== 'TongGiamDoc') {
                throw new Error(`Bạn không có quyền chấm điểm kế hoạch công việc ID ${ev.id}.`);
            }
            // Chỉ cho phép chấm khi status là 'Chờ TGĐ chấm'
            if (employeePlan.status !== 'Chờ TGĐ chấm' && currentUserRole !== 'Admin') {
                throw new Error(`Kế hoạch công việc ID ${ev.id} không ở trạng thái 'Chờ TGĐ chấm'.`);
            }

            await connection.query(
                `UPDATE employee_work_plans SET ceo_score = ?, ceo_evaluation = ?, status = 'Hoàn thành' WHERE id = ?`,
                [ev.ceo_score, ev.ceo_evaluation, ev.id]
            );
        }
        await connection.commit();
        res.json({ msg: 'Lưu đánh giá của Tổng giám đốc thành công!' });
    } catch (err) {
        await connection.rollback();
        console.error("Lỗi Server tại /api/work-plans/ceo-evaluate:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;