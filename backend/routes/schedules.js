const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { status, movie_id, hall_id, date, page = 1, pageSize = 10 } = req.query;
  let sql = `SELECT s.*, m.title as movie_title, m.poster as movie_poster, h.name as hall_name, h.type as hall_type 
             FROM schedules s 
             LEFT JOIN movies m ON s.movie_id = m.id 
             LEFT JOIN halls h ON s.hall_id = h.id 
             WHERE 1=1`;
  const params = [];
  
  if (status !== undefined) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  
  if (movie_id) {
    sql += ' AND s.movie_id = ?';
    params.push(movie_id);
  }
  
  if (hall_id) {
    sql += ' AND s.hall_id = ?';
    params.push(hall_id);
  }
  
  if (date) {
    sql += ' AND DATE(s.start_time) = ?';
    params.push(date);
  }
  
  const countSql = sql.replace('SELECT s.*, m.title as movie_title, m.poster as movie_poster, h.name as hall_name, h.type as hall_type', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY s.start_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const schedules = db.prepare(sql).all(...params);
  res.json({ list: schedules, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', auth, (req, res) => {
  const schedule = db.prepare(`SELECT s.*, m.title as movie_title, m.duration as movie_duration, h.name as hall_name, h.rows, h.cols 
                               FROM schedules s 
                               LEFT JOIN movies m ON s.movie_id = m.id 
                               LEFT JOIN halls h ON s.hall_id = h.id 
                               WHERE s.id = ?`).get(req.params.id);
  
  if (!schedule) {
    return res.status(404).json({ error: '场次不存在' });
  }
  
  res.json(schedule);
});

router.post('/', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { movie_id, hall_id, start_time, end_time, price } = req.body;
  
  if (!movie_id || !hall_id || !start_time || !end_time || !price) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }
  
  const conflict = db.prepare(`SELECT id FROM schedules 
                               WHERE hall_id = ? AND status = 1 
                               AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`)
    .get(hall_id, start_time, start_time, end_time, end_time, start_time, end_time);
  
  if (conflict) {
    return res.status(400).json({ error: '该时间段影厅已被占用' });
  }
  
  const result = db.prepare('INSERT INTO schedules (movie_id, hall_id, start_time, end_time, price) VALUES (?, ?, ?, ?, ?)')
    .run(movie_id, hall_id, start_time, end_time, price);
  
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(hall_id);
  const insertSeat = db.prepare('INSERT INTO seats (schedule_id, row_num, col_num, seat_label, status) VALUES (?, ?, ?, ?, ?)');
  
  for (let row = 1; row <= hall.rows; row++) {
    for (let col = 1; col <= hall.cols; col++) {
      const label = `${String.fromCharCode(64 + row)}${col}`;
      insertSeat.run(result.lastInsertRowid, row, col, label, 'available');
    }
  }
  
  res.json({ id: result.lastInsertRowid, message: '场次添加成功' });
});

router.post('/batch', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { schedules } = req.body;
  
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ error: '排片数据不能为空' });
  }
  
  const errors = [];
  const successIds = [];
  
  for (const schedule of schedules) {
    const { movie_id, hall_id, start_time, end_time, price } = schedule;
    
    const conflict = db.prepare(`SELECT id FROM schedules 
                                 WHERE hall_id = ? AND status = 1 
                                 AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`)
      .get(hall_id, start_time, start_time, end_time, end_time, start_time, end_time);
    
    if (conflict) {
      errors.push({ schedule, error: '时间段冲突' });
      continue;
    }
    
    const result = db.prepare('INSERT INTO schedules (movie_id, hall_id, start_time, end_time, price) VALUES (?, ?, ?, ?, ?)')
      .run(movie_id, hall_id, start_time, end_time, price);
    
    const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(hall_id);
    const insertSeat = db.prepare('INSERT INTO seats (schedule_id, row_num, col_num, seat_label, status) VALUES (?, ?, ?, ?, ?)');
    
    for (let row = 1; row <= hall.rows; row++) {
      for (let col = 1; col <= hall.cols; col++) {
        const label = `${String.fromCharCode(64 + row)}${col}`;
        insertSeat.run(result.lastInsertRowid, row, col, label, 'available');
      }
    }
    
    successIds.push(result.lastInsertRowid);
  }
  
  res.json({ 
    message: `成功添加 ${successIds.length} 个场次`, 
    successCount: successIds.length, 
    errorCount: errors.length,
    errors 
  });
});

router.put('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { movie_id, hall_id, start_time, end_time, price, status } = req.body;
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!schedule) {
    return res.status(404).json({ error: '场次不存在' });
  }
  
  if (hall_id || start_time || end_time) {
    const checkHallId = hall_id || schedule.hall_id;
    const checkStartTime = start_time || schedule.start_time;
    const checkEndTime = end_time || schedule.end_time;
    
    const conflict = db.prepare(`SELECT id FROM schedules 
                                 WHERE hall_id = ? AND status = 1 AND id != ?
                                 AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`)
      .get(checkHallId, id, checkStartTime, checkStartTime, checkEndTime, checkEndTime, checkStartTime, checkEndTime);
    
    if (conflict) {
      return res.status(400).json({ error: '该时间段影厅已被占用' });
    }
  }
  
  db.prepare('UPDATE schedules SET movie_id = ?, hall_id = ?, start_time = ?, end_time = ?, price = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(movie_id || schedule.movie_id, hall_id || schedule.hall_id, start_time || schedule.start_time, end_time || schedule.end_time, price || schedule.price, status !== undefined ? status : schedule.status, id);
  
  res.json({ message: '场次更新成功' });
});

router.delete('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  
  const orders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE schedule_id = ? AND status IN ("pending", "paid")').get(id);
  if (orders.count > 0) {
    return res.status(400).json({ error: '该场次有未完成的订单，无法删除' });
  }
  
  db.prepare('DELETE FROM seats WHERE schedule_id = ?').run(id);
  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  
  res.json({ message: '场次删除成功' });
});

router.put('/:id/status', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.prepare('UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  res.json({ message: status === 1 ? '场次已上架' : '场次已下架' });
});

module.exports = router;
