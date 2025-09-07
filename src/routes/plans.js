const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isoToMysql } = require('../utils/dates');
// const { protect } = require('../middleware/auth'); // nếu có

/** Tạo câu IN (?,?,...) an toàn cho mysql2 */
const inClause = (arr) => arr.map(() => '?').join(',');

/** GET /api/plans?from&to&unit_id&room_id&type
 *  Trả về danh sách event + participants []
 */
router.get('/', /*protect,*/ async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const from = req.query.from ? isoToMysql(req.query.from) : '1970-01-01 00:00:00';
    const to   = req.query.to   ? isoToMysql(req.query.to)   : '2100-01-01 00:00:00';
    const { unit_id, room_id, type } = req.query;

    let where = 'p.start_ts < ? AND p.end_ts > ?';
    const params = [to, from]; // (A.start < to) AND (A.end > from)

    if (unit_id) { where += ' AND p.unit_id = ?'; params.push(+unit_id); }
    if (room_id) { where += ' AND p.room_id = ?'; params.push(+room_id); }
    if (type)    { where += ' AND p.type = ?';   params.push(type); }

    const [rows] = await conn.query(
      `SELECT p.*
       FROM plans p
       WHERE ${where}
       ORDER BY p.start_ts ASC`,
      params
    );

    if (rows.length === 0) return res.json([]);

    const planIds = rows.map(r => r.id);
    const [pp] = await conn.query(
      `SELECT plan_id, employee_id FROM plan_participants
       WHERE plan_id IN (${inClause(planIds)})`,
      planIds
    );

    // gộp participants
    const partMap = new Map();
    for (const r of pp) {
      const arr = partMap.get(r.plan_id) || [];
      arr.push(r.employee_id);
      partMap.set(r.plan_id, arr);
    }

    const out = rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      description: r.description,
      start: new Date(r.start_ts).toISOString(),
      end:   new Date(r.end_ts).toISOString(),
      unit_id: r.unit_id,
      room_id: r.room_id,
      online_url: r.online_url,
      resources: r.resources ? JSON.parse(r.resources) : [],
      recurrence: r.recurrence ? JSON.parse(r.recurrence) : null,
      visibility: r.visibility,
      owner_id: r.owner_id,
      status: r.status,
      participants: partMap.get(r.id) || []
    }));

    res.json(out);
  } catch (e) { next(e); } finally { conn.release(); }
});

/** POST /api/plans  - tạo event + participants (transaction) */
router.post('/', /*protect,*/ async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;

    const [ret] = await conn.query(
      `INSERT INTO plans
       (title, type, description, start_ts, end_ts, unit_id, room_id, online_url, resources, recurrence, visibility, owner_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        b.title,
        b.type,
        b.description || null,
        isoToMysql(b.start),
        isoToMysql(b.end),
        b.unit_id,
        b.room_id || null,
        b.online_url || null,
        b.resources ? JSON.stringify(b.resources) : null,
        b.recurrence ? JSON.stringify(b.recurrence) : null,
        b.visibility || 'public',
        // req.user?.id || 0, // nếu có auth
        b.owner_id || 0,
        b.status || 'scheduled'
      ]
    );
    const planId = ret.insertId;

    if (Array.isArray(b.participants) && b.participants.length) {
      const values = b.participants.map(() => '(?,?)').join(',');
      const args = [];
      b.participants.forEach((pid) => { args.push(planId, pid); });
      await conn.query(`INSERT INTO plan_participants (plan_id, employee_id) VALUES ${values}`, args);
    }

    await conn.commit();
    res.status(201).json({ id: planId });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

/** PUT /api/plans/:id - update + replace participants (transaction) */
router.put('/:id', /*protect,*/ async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = +req.params.id;
    const b = req.body;

    await conn.query(
      `UPDATE plans SET
         title=?, type=?, description=?, start_ts=?, end_ts=?,
         room_id=?, online_url=?, resources=?, recurrence=?, visibility=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        b.title,
        b.type,
        b.description || null,
        isoToMysql(b.start),
        isoToMysql(b.end),
        b.room_id || null,
        b.online_url || null,
        b.resources ? JSON.stringify(b.resources) : null,
        b.recurrence ? JSON.stringify(b.recurrence) : null,
        b.visibility || 'public',
        b.status || 'scheduled',
        id
      ]
    );

    // replace participants
    await conn.query(`DELETE FROM plan_participants WHERE plan_id=?`, [id]);
    if (Array.isArray(b.participants) && b.participants.length) {
      const values = b.participants.map(() => '(?,?)').join(',');
      const args = [];
      b.participants.forEach((pid) => { args.push(id, pid); });
      await conn.query(`INSERT INTO plan_participants (plan_id, employee_id) VALUES ${values}`, args);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

/** DELETE /api/plans/:id */
router.delete('/:id', /*protect,*/ async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = +req.params.id;
    await conn.query(`DELETE FROM plans WHERE id=?`, [id]);
    res.json({ ok: true });
  } catch (e) { next(e); } finally { conn.release(); }
});

/** POST /api/plans/check-conflicts
 *  body: {start,end,room_id,participants[],ignore_plan_id?}
 */
router.post('/check-conflicts', /*protect,*/ async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { start, end, room_id, participants = [], ignore_plan_id } = req.body;
    const startDt = isoToMysql(start);
    const endDt   = isoToMysql(end);

    const reasons = [];

    // 1) Trùng phòng
    if (room_id) {
      const args = [room_id, endDt, startDt];
      let sql = `SELECT id, title, start_ts, end_ts FROM plans
                 WHERE room_id=? AND start_ts < ? AND end_ts > ?`;
      if (ignore_plan_id) { sql += ' AND id<>?'; args.push(ignore_plan_id); }
      const [rows] = await conn.query(sql, args);
      if (rows.length) reasons.push({ type: 'room', message: `Trùng phòng (${rows.length}).`, meta: rows });
    }

    // 2) Trùng người tham dự
    if (participants.length) {
      let sql = `
        SELECT p.id, p.title, pp.employee_id, p.start_ts, p.end_ts
        FROM plan_participants pp
        JOIN plans p ON p.id = pp.plan_id
        WHERE pp.employee_id IN (${inClause(participants)})
          AND p.start_ts < ? AND p.end_ts > ?`;
      const args = [...participants, endDt, startDt];
      if (ignore_plan_id) { sql += ' AND p.id<>?'; args.push(ignore_plan_id); }
      const [rows] = await conn.query(sql, args);
      if (rows.length) reasons.push({ type: 'people', message: `Trùng lịch thành viên (${rows.length}).`, meta: rows });
    }

    const level = reasons.some(r => r.type === 'room' || r.type === 'people') ? 'error'
                 : reasons.length ? 'warn' : 'none';

    res.json({ level, reasons });
  } catch (e) { next(e); } finally { conn.release(); }
});

module.exports = router;
