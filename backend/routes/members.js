const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { status, keyword, level, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];
  
  if (status !== undefined) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (keyword) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  if (level) {
    sql += ' AND level = ?';
    params.push(level);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const members = db.prepare(sql).all(...params);
  res.json({ list: members, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  
  const pointsLog = db.prepare('SELECT * FROM member_points_log WHERE member_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const rechargeLog = db.prepare('SELECT * FROM member_recharge_log WHERE member_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const watchHistory = db.prepare(`SELECT o.id, o.order_no, o.created_at, o.total_price, m.title, s.start_time 
                                   FROM orders o 
                                   LEFT JOIN schedules s ON o.schedule_id = s.id 
                                   LEFT JOIN movies m ON s.movie_id = m.id 
                                   WHERE o.member_id = ? AND o.status = 'paid' 
                                   ORDER BY o.created_at DESC LIMIT 20`).all(req.params.id);
  
  res.json({ ...member, pointsLog, rechargeLog, watchHistory });
});

router.post('/', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { phone, name, level } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: '手机号不能为空' });
  }
  
  const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(400).json({ error: '该手机号已注册会员' });
  }
  
  const result = db.prepare('INSERT INTO members (phone, name, level) VALUES (?, ?, ?)')
    .run(phone, name, level || 1);
  
  res.json({ id: result.lastInsertRowid, message: '会员添加成功' });
});

router.put('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { name, level, status } = req.body;
  
  db.prepare('UPDATE members SET name = ?, level = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, level, status, id);
  
  res.json({ message: '会员信息更新成功' });
});

router.put('/:id/points', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { points, type, description } = req.body;
  
  if (!points) {
    return res.status(400).json({ error: '积分数量不能为空' });
  }
  
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  
  if (type === 'deduct' && member.points < points) {
    return res.status(400).json({ error: '积分不足' });
  }
  
  const adjustPoints = type === 'add' ? points : -points;
  db.prepare('UPDATE members SET points = points + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(adjustPoints, id);
  db.prepare('INSERT INTO member_points_log (member_id, points, type, description) VALUES (?, ?, ?, ?)')
    .run(id, adjustPoints, type, description || '管理员调整');
  
  res.json({ message: '积分调整成功' });
});

router.post('/:id/recharge', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { amount, payment_method } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '充值金额无效' });
  }
  
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  
  db.prepare('UPDATE members SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amount, id);
  db.prepare('INSERT INTO member_recharge_log (member_id, amount, payment_method) VALUES (?, ?, ?)')
    .run(id, amount, payment_method || 'cash');
  
  res.json({ message: '充值成功' });
});

router.get('/:id/orders', auth, (req, res) => {
  const { id } = req.params;
  const { page = 1, pageSize = 10 } = req.query;
  
  const orders = db.prepare(`SELECT o.*, m.title as movie_title, h.name as hall_name, s.start_time 
                             FROM orders o 
                             LEFT JOIN schedules s ON o.schedule_id = s.id 
                             LEFT JOIN movies m ON s.movie_id = m.id 
                             LEFT JOIN halls h ON s.hall_id = h.id 
                             WHERE o.member_id = ? 
                             ORDER BY o.created_at DESC 
                             LIMIT ? OFFSET ?`)
    .all(id, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  res.json(orders);
});

module.exports = router;
