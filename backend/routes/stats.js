const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');
const xlsx = require('xlsx');

router.get('/overview', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todayStats = db.prepare(`SELECT 
    COALESCE(SUM(total_price), 0) as box_office,
    COUNT(*) as tickets_sold
    FROM orders 
    WHERE DATE(created_at) = ? AND status = 'paid'`).get(today);
  
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthStats = db.prepare(`SELECT 
    COALESCE(SUM(total_price), 0) as box_office,
    COUNT(*) as tickets_sold
    FROM orders 
    WHERE DATE(created_at) >= ? AND status = 'paid'`).get(monthStart);
  
  const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members WHERE status = 1').get();
  const totalMovies = db.prepare('SELECT COUNT(*) as count FROM movies WHERE status = 1').get();
  const totalHalls = db.prepare('SELECT COUNT(*) as count FROM halls WHERE status = 1').get();
  
  res.json({
    today: todayStats,
    month: monthStats,
    totalMembers: totalMembers.count,
    totalMovies: totalMovies.count,
    totalHalls: totalHalls.count
  });
});

router.get('/box-office', auth, (req, res) => {
  const { start_date, end_date, type = 'day' } = req.query;
  
  let sql, params;
  
  if (type === 'day') {
    sql = `SELECT DATE(created_at) as date, SUM(total_price) as box_office, COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY DATE(created_at) 
           ORDER BY date`;
    params = [start_date, end_date];
  } else if (type === 'week') {
    sql = `SELECT strftime('%Y-%W', created_at) as week, 
           MIN(DATE(created_at)) as start_date, 
           MAX(DATE(created_at)) as end_date,
           SUM(total_price) as box_office, 
           COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY strftime('%Y-%W', created_at) 
           ORDER BY week`;
    params = [start_date, end_date];
  } else {
    sql = `SELECT strftime('%Y-%m', created_at) as month, 
           SUM(total_price) as box_office, 
           COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY strftime('%Y-%m', created_at) 
           ORDER BY month`;
    params = [start_date, end_date];
  }
  
  const stats = db.prepare(sql).all(...params);
  res.json(stats);
});

router.get('/popular-movies', auth, (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  
  const stats = db.prepare(`SELECT m.id, m.title, m.poster, 
                            COUNT(o.id) as ticket_count, 
                            SUM(o.total_price) as box_office
                            FROM orders o 
                            LEFT JOIN schedules s ON o.schedule_id = s.id 
                            LEFT JOIN movies m ON s.movie_id = m.id 
                            WHERE o.status = 'paid' 
                            AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                            GROUP BY m.id 
                            ORDER BY ticket_count DESC 
                            LIMIT ?`).all(start_date, end_date, parseInt(limit));
  
  res.json(stats);
});

router.get('/hall-usage', auth, (req, res) => {
  const { start_date, end_date } = req.query;
  
  const stats = db.prepare(`SELECT h.id, h.name, h.type, h.rows, h.cols,
                            COUNT(DISTINCT s.id) as schedule_count,
                            COUNT(o.id) as ticket_count,
                            SUM(o.total_price) as box_office
                            FROM halls h 
                            LEFT JOIN schedules s ON h.id = s.hall_id AND DATE(s.start_time) >= ? AND DATE(s.start_time) <= ?
                            LEFT JOIN orders o ON s.id = o.schedule_id AND o.status = 'paid'
                            WHERE h.status = 1
                            GROUP BY h.id 
                            ORDER BY ticket_count DESC`).all(start_date, end_date);
  
  const result = stats.map(stat => ({
    ...stat,
    total_seats: stat.rows * stat.cols,
    usage_rate: stat.schedule_count > 0 ? (stat.ticket_count / (stat.schedule_count * stat.rows * stat.cols) * 100).toFixed(2) : 0
  }));
  
  res.json(result);
});

router.get('/export', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { start_date, end_date, type = 'day' } = req.query;
  
  let sql, params;
  
  if (type === 'day') {
    sql = `SELECT DATE(created_at) as date, SUM(total_price) as box_office, COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY DATE(created_at) 
           ORDER BY date`;
    params = [start_date, end_date];
  } else if (type === 'week') {
    sql = `SELECT strftime('%Y-%W', created_at) as period, 
           MIN(DATE(created_at)) as start_date, 
           MAX(DATE(created_at)) as end_date,
           SUM(total_price) as box_office, 
           COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY strftime('%Y-%W', created_at) 
           ORDER BY period`;
    params = [start_date, end_date];
  } else {
    sql = `SELECT strftime('%Y-%m', created_at) as period, 
           SUM(total_price) as box_office, 
           COUNT(*) as tickets_sold 
           FROM orders 
           WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ? 
           GROUP BY strftime('%Y-%m', created_at) 
           ORDER BY period`;
    params = [start_date, end_date];
  }
  
  const stats = db.prepare(sql).all(...params);
  
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(stats.map(s => ({
    '日期': s.date || s.period,
    '票房收入': s.box_office,
    '观影人次': s.tickets_sold
  })));
  
  xlsx.utils.book_append_sheet(workbook, worksheet, '营业统计');
  
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', `attachment; filename=stats_${Date.now()}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
