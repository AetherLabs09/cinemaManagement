const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', auth, (req, res) => {
  const { status, type, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT * FROM news WHERE 1=1';
  const params = [];
  
  if (status !== undefined) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const news = db.prepare(sql).all(...params);
  res.json({ list: news, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', auth, (req, res) => {
  const newsItem = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  
  if (!newsItem) {
    return res.status(404).json({ error: '新闻不存在' });
  }
  
  res.json(newsItem);
});

router.post('/', auth, checkRole('super_admin', 'admin'), upload.single('cover_image'), (req, res) => {
  const { title, content, type, publish_date } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  
  const cover_image = req.file ? `/uploads/${req.file.filename}` : null;
  
  const result = db.prepare('INSERT INTO news (title, content, type, cover_image, publish_date) VALUES (?, ?, ?, ?, ?)')
    .run(title, content, type || 'notice', cover_image, publish_date || new Date().toISOString());
  
  res.json({ id: result.lastInsertRowid, message: '新闻发布成功' });
});

router.put('/:id', auth, checkRole('super_admin', 'admin'), upload.single('cover_image'), (req, res) => {
  const { id } = req.params;
  const { title, content, type, publish_date, status } = req.body;
  
  const newsItem = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  if (!newsItem) {
    return res.status(404).json({ error: '新闻不存在' });
  }
  
  let cover_image = newsItem.cover_image;
  if (req.file) {
    cover_image = `/uploads/${req.file.filename}`;
  }
  
  db.prepare('UPDATE news SET title = ?, content = ?, type = ?, cover_image = ?, publish_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, content, type, cover_image, publish_date, status, id);
  
  res.json({ message: '新闻更新成功' });
});

router.delete('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.json({ message: '新闻删除成功' });
});

router.put('/:id/status', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.prepare('UPDATE news SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  res.json({ message: status === 1 ? '新闻已上架' : '新闻已下架' });
});

module.exports = router;
