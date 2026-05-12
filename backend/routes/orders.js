const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');
const xlsx = require('xlsx');

router.get('/', auth, (req, res) => {
  const { status, order_no, member_id, start_date, end_date, page = 1, pageSize = 10 } = req.query;
  let sql = `SELECT o.*, m.title as movie_title, h.name as hall_name, 
             mem.name as member_name, mem.phone as member_phone,
             s.start_time as schedule_start_time
             FROM orders o 
             LEFT JOIN schedules s ON o.schedule_id = s.id 
             LEFT JOIN movies m ON s.movie_id = m.id 
             LEFT JOIN halls h ON s.hall_id = h.id 
             LEFT JOIN members mem ON o.member_id = mem.id 
             WHERE 1=1`;
  const params = [];
  
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  
  if (order_no) {
    sql += ' AND o.order_no LIKE ?';
    params.push(`%${order_no}%`);
  }
  
  if (member_id) {
    sql += ' AND o.member_id = ?';
    params.push(member_id);
  }
  
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  
  const countSql = sql.replace('SELECT o.*, m.title as movie_title, h.name as hall_name, mem.name as member_name, mem.phone as member_phone, s.start_time as schedule_start_time', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const orders = db.prepare(sql).all(...params);
  res.json({ list: orders, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', auth, (req, res) => {
  const order = db.prepare(`SELECT o.*, m.title as movie_title, m.poster as movie_poster, m.duration as movie_duration,
                            h.name as hall_name, h.rows, h.cols,
                            mem.name as member_name, mem.phone as member_phone,
                            s.start_time as schedule_start_time, s.end_time as schedule_end_time, s.price as ticket_price
                            FROM orders o 
                            LEFT JOIN schedules s ON o.schedule_id = s.id 
                            LEFT JOIN movies m ON s.movie_id = m.id 
                            LEFT JOIN halls h ON s.hall_id = h.id 
                            LEFT JOIN members mem ON o.member_id = mem.id 
                            WHERE o.id = ?`).get(req.params.id);
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  res.json(order);
});

router.post('/', auth, (req, res) => {
  const { schedule_id, member_id, seats, total_price, payment_method } = req.body;
  
  if (!schedule_id || !seats || !total_price) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND status = 1').get(schedule_id);
  if (!schedule) {
    return res.status(400).json({ error: '场次不存在或已下架' });
  }
  
  const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  const result = db.prepare('INSERT INTO orders (order_no, schedule_id, member_id, seats, total_price, payment_method, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(orderNo, schedule_id, member_id, JSON.stringify(seats), total_price, payment_method, 'paid', req.user.id);
  
  const seatList = typeof seats === 'string' ? JSON.parse(seats) : seats;
  const updateSeat = db.prepare('UPDATE seats SET status = ? WHERE schedule_id = ? AND seat_label = ?');
  for (const seat of seatList) {
    updateSeat.run('sold', schedule_id, seat);
  }
  
  if (member_id) {
    const points = Math.floor(total_price);
    db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(points, member_id);
    db.prepare('INSERT INTO member_points_log (member_id, points, type, description) VALUES (?, ?, ?, ?)')
      .run(member_id, points, 'earn', `订单 ${orderNo} 获得积分`);
  }
  
  res.json({ id: result.lastInsertRowid, order_no: orderNo, message: '订单创建成功' });
});

router.put('/:id/refund', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  if (order.status === 'refunded') {
    return res.status(400).json({ error: '订单已退款' });
  }
  
  if (order.status === 'cancelled') {
    return res.status(400).json({ error: '订单已取消' });
  }
  
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('refunded', id);
  
  const seats = JSON.parse(order.seats);
  const updateSeat = db.prepare('UPDATE seats SET status = ? WHERE schedule_id = ? AND seat_label = ?');
  for (const seat of seats) {
    updateSeat.run('available', order.schedule_id, seat);
  }
  
  if (order.member_id) {
    const points = Math.floor(order.total_price);
    db.prepare('UPDATE members SET points = points - ? WHERE id = ?').run(points, order.member_id);
    db.prepare('INSERT INTO member_points_log (member_id, points, type, description) VALUES (?, ?, ?, ?)')
      .run(order.member_id, -points, 'refund', `订单 ${order.order_no} 退款扣除积分`);
  }
  
  res.json({ message: '退款成功' });
});

router.put('/:id/cancel', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('cancelled', id);
  
  const seats = JSON.parse(order.seats);
  const updateSeat = db.prepare('UPDATE seats SET status = ? WHERE schedule_id = ? AND seat_label = ?');
  for (const seat of seats) {
    updateSeat.run('available', order.schedule_id, seat);
  }
  
  res.json({ message: '订单已作废' });
});

router.get('/export', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { start_date, end_date } = req.query;
  let sql = `SELECT o.order_no, o.total_price, o.status, o.payment_method, o.created_at,
             m.title as movie_title, h.name as hall_name,
             mem.name as member_name, mem.phone as member_phone,
             s.start_time as schedule_time
             FROM orders o 
             LEFT JOIN schedules s ON o.schedule_id = s.id 
             LEFT JOIN movies m ON s.movie_id = m.id 
             LEFT JOIN halls h ON s.hall_id = h.id 
             LEFT JOIN members mem ON o.member_id = mem.id 
             WHERE 1=1`;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  
  sql += ' ORDER BY o.created_at DESC';
  
  const orders = db.prepare(sql).all(...params);
  
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(orders.map(o => ({
    '订单号': o.order_no,
    '电影名称': o.movie_title,
    '影厅': o.hall_name,
    '放映时间': o.schedule_time,
    '会员姓名': o.member_name || '散客',
    '会员手机': o.member_phone || '-',
    '订单金额': o.total_price,
    '支付方式': o.payment_method || '-',
    '订单状态': o.status === 'paid' ? '已支付' : o.status === 'refunded' ? '已退款' : o.status === 'cancelled' ? '已作废' : '待支付',
    '下单时间': o.created_at
  })));
  
  xlsx.utils.book_append_sheet(workbook, worksheet, '订单列表');
  
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', `attachment; filename=orders_${Date.now()}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
