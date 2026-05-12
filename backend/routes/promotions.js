const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.get('/promotions', auth, (req, res) => {
  const { status, type } = req.query;
  let sql = 'SELECT * FROM promotions WHERE 1=1';
  const params = [];
  
  if (status !== undefined) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const promotions = db.prepare(sql).all(...params);
  res.json(promotions);
});

router.post('/promotions', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { name, type, discount, condition_amount, start_date, end_date } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: '活动名称和类型不能为空' });
  }
  
  const result = db.prepare('INSERT INTO promotions (name, type, discount, condition_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, type, discount, condition_amount, start_date, end_date);
  
  res.json({ id: result.lastInsertRowid, message: '活动创建成功' });
});

router.put('/promotions/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { name, type, discount, condition_amount, start_date, end_date, status } = req.body;
  
  db.prepare('UPDATE promotions SET name = ?, type = ?, discount = ?, condition_amount = ?, start_date = ?, end_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, type, discount, condition_amount, start_date, end_date, status, id);
  
  res.json({ message: '活动更新成功' });
});

router.delete('/promotions/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  
  db.prepare('DELETE FROM coupons WHERE promotion_id = ?').run(id);
  db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
  
  res.json({ message: '活动删除成功' });
});

router.get('/coupons', auth, (req, res) => {
  const { promotion_id, used, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT c.*, p.name as promotion_name FROM coupons c LEFT JOIN promotions p ON c.promotion_id = p.id WHERE 1=1';
  const params = [];
  
  if (promotion_id) {
    sql += ' AND c.promotion_id = ?';
    params.push(promotion_id);
  }
  
  if (used !== undefined) {
    sql += ' AND c.used = ?';
    params.push(used);
  }
  
  const countSql = sql.replace('SELECT c.*, p.name as promotion_name', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const coupons = db.prepare(sql).all(...params);
  res.json({ list: coupons, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.post('/coupons', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { promotion_id, discount, min_amount, expire_date, count } = req.body;
  
  if (!discount || !count) {
    return res.status(400).json({ error: '优惠金额和数量不能为空' });
  }
  
  const insertCoupon = db.prepare('INSERT INTO coupons (promotion_id, code, discount, min_amount, expire_date) VALUES (?, ?, ?, ?, ?)');
  
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = uuidv4().substring(0, 8).toUpperCase();
    insertCoupon.run(promotion_id, code, discount, min_amount || 0, expire_date);
    codes.push(code);
  }
  
  res.json({ message: `成功生成 ${count} 张优惠券`, codes });
});

router.delete('/coupons/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ message: '优惠券删除成功' });
});

router.get('/ticket-types', auth, (req, res) => {
  const ticketTypes = db.prepare('SELECT * FROM ticket_types WHERE status = 1').all();
  res.json(ticketTypes);
});

router.post('/ticket-types', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { name, discount, description } = req.body;
  
  if (!name || !discount) {
    return res.status(400).json({ error: '票种名称和折扣不能为空' });
  }
  
  const result = db.prepare('INSERT INTO ticket_types (name, discount, description) VALUES (?, ?, ?)')
    .run(name, discount, description);
  
  res.json({ id: result.lastInsertRowid, message: '票种添加成功' });
});

router.put('/ticket-types/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { name, discount, description, status } = req.body;
  
  db.prepare('UPDATE ticket_types SET name = ?, discount = ?, description = ?, status = ? WHERE id = ?')
    .run(name, discount, description, status, id);
  
  res.json({ message: '票种更新成功' });
});

router.delete('/ticket-types/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  db.prepare('DELETE FROM ticket_types WHERE id = ?').run(req.params.id);
  res.json({ message: '票种删除成功' });
});

module.exports = router;
