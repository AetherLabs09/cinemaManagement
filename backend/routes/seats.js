const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');

router.get('/schedule/:scheduleId', auth, (req, res) => {
  const { scheduleId } = req.params;
  
  const schedule = db.prepare(`SELECT s.*, h.rows, h.cols, h.name as hall_name 
                               FROM schedules s 
                               LEFT JOIN halls h ON s.hall_id = h.id 
                               WHERE s.id = ?`).get(scheduleId);
  
  if (!schedule) {
    return res.status(404).json({ error: '场次不存在' });
  }
  
  const seats = db.prepare('SELECT * FROM seats WHERE schedule_id = ?').all(scheduleId);
  
  const seatMap = [];
  for (let row = 1; row <= schedule.rows; row++) {
    const rowSeats = [];
    for (let col = 1; col <= schedule.cols; col++) {
      const seat = seats.find(s => s.row_num === row && s.col_num === col);
      rowSeats.push(seat || { row_num: row, col_num: col, seat_label: `${String.fromCharCode(64 + row)}${col}`, status: 'available' });
    }
    seatMap.push(rowSeats);
  }
  
  res.json({ schedule, seatMap, seats });
});

router.put('/lock', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { schedule_id, seats, reason } = req.body;
  
  if (!schedule_id || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: '参数错误' });
  }
  
  const updateSeat = db.prepare('UPDATE seats SET status = ?, locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE schedule_id = ? AND seat_label = ? AND status = ?');
  
  let lockedCount = 0;
  for (const seatLabel of seats) {
    const result = updateSeat.run('locked', req.user.id, schedule_id, seatLabel, 'available');
    if (result.changes > 0) {
      lockedCount++;
    }
  }
  
  res.json({ message: `成功锁定 ${lockedCount} 个座位`, lockedCount });
});

router.put('/unlock', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { schedule_id, seats } = req.body;
  
  if (!schedule_id || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: '参数错误' });
  }
  
  const updateSeat = db.prepare('UPDATE seats SET status = ?, locked_by = NULL, locked_at = NULL WHERE schedule_id = ? AND seat_label = ? AND status = ?');
  
  let unlockedCount = 0;
  for (const seatLabel of seats) {
    const result = updateSeat.run('available', schedule_id, seatLabel, 'locked');
    if (result.changes > 0) {
      unlockedCount++;
    }
  }
  
  res.json({ message: `成功解锁 ${unlockedCount} 个座位`, unlockedCount });
});

router.get('/stats/:scheduleId', auth, (req, res) => {
  const { scheduleId } = req.params;
  
  const stats = db.prepare(`SELECT 
    COUNT(*) as total_seats,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_seats,
    SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_seats,
    SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked_seats
    FROM seats WHERE schedule_id = ?`).get(scheduleId);
  
  res.json(stats);
});

module.exports = router;
