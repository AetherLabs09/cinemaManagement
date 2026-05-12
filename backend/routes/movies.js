const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', auth, (req, res) => {
  const { status, keyword, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT * FROM movies WHERE 1=1';
  const params = [];
  
  if (status !== undefined) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (keyword) {
    sql += ' AND (title LIKE ? OR actors LIKE ? OR director LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const movies = db.prepare(sql).all(...params);
  res.json({ list: movies, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', auth, (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  
  if (!movie) {
    return res.status(404).json({ error: '电影不存在' });
  }
  
  res.json(movie);
});

router.post('/', auth, checkRole('super_admin', 'admin'), upload.single('poster'), (req, res) => {
  const { title, type, duration, synopsis, actors, director, release_date, rating, trailer_url } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '电影名称不能为空' });
  }
  
  const poster = req.file ? `/uploads/${req.file.filename}` : null;
  
  const result = db.prepare(
    'INSERT INTO movies (title, poster, type, duration, synopsis, actors, director, release_date, rating, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, poster, type, duration, synopsis, actors, director, release_date, rating, trailer_url);
  
  res.json({ id: result.lastInsertRowid, message: '电影添加成功' });
});

router.put('/:id', auth, checkRole('super_admin', 'admin'), upload.single('poster'), (req, res) => {
  const { id } = req.params;
  const { title, type, duration, synopsis, actors, director, release_date, rating, trailer_url, status } = req.body;
  
  let poster = null;
  if (req.file) {
    poster = `/uploads/${req.file.filename}`;
  }
  
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  if (!movie) {
    return res.status(404).json({ error: '电影不存在' });
  }
  
  const updatePoster = poster || movie.poster;
  
  db.prepare(
    'UPDATE movies SET title = ?, poster = ?, type = ?, duration = ?, synopsis = ?, actors = ?, director = ?, release_date = ?, rating = ?, trailer_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, updatePoster, type, duration, synopsis, actors, director, release_date, rating, trailer_url, status, id);
  
  res.json({ message: '电影更新成功' });
});

router.delete('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  
  const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE movie_id = ? AND status = 1').get(id);
  if (schedules.count > 0) {
    return res.status(400).json({ error: '该电影有正在上映的场次，无法删除' });
  }
  
  db.prepare('DELETE FROM movies WHERE id = ?').run(id);
  res.json({ message: '电影删除成功' });
});

router.put('/:id/status', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.prepare('UPDATE movies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  res.json({ message: status === 1 ? '电影已上架' : '电影已下架' });
});

module.exports = router;
