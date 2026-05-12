const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { auth, checkRole } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { status, type } = req.query;
  let sql = 'SELECT * FROM halls WHERE 1=1';
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
  
  const halls = db.prepare(sql).all(...params);
  res.json(halls);
});

router.get('/:id', auth, (req, res) => {
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(req.params.id);
  
  if (!hall) {
    return res.status(404).json({ error: '影厅不存在' });
  }
  
  res.json(hall);
});

router.post('/', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { name, rows, cols, type } = req.body;
  
  if (!name || !rows || !cols) {
    return res.status(400).json({ error: '影厅名称、行数、列数不能为空' });
  }
  
  const existing = db.prepare('SELECT id FROM halls WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ error: '影厅名称已存在' });
  }
  
  const result = db.prepare('INSERT INTO halls (name, rows, cols, type) VALUES (?, ?, ?, ?)')
    .run(name, rows, cols, type || 'normal');
  
  res.json({ id: result.lastInsertRowid, message: '影厅添加成功' });
});

router.put('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { name, rows, cols, type, status } = req.body;
  
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(id);
  if (!hall) {
    return res.status(404).json({ error: '影厅不存在' });
  }
  
  if (name && name !== hall.name) {
    const existing = db.prepare('SELECT id FROM halls WHERE name = ? AND id != ?').get(name, id);
    if (existing) {
      return res.status(400).json({ error: '影厅名称已存在' });
    }
  }
  
  if (status === 0) {
    const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE hall_id = ? AND status = 1 AND start_time > datetime("now")').get(id);
    if (schedules.count > 0) {
      return res.status(400).json({ error: '该影厅有未结束的场次，无法停用' });
    }
  }
  
  db.prepare('UPDATE halls SET name = ?, rows = ?, cols = ?, type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name || hall.name, rows || hall.rows, cols || hall.cols, type || hall.type, status !== undefined ? status : hall.status, id);
  
  res.json({ message: '影厅更新成功' });
});

router.delete('/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  
  const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE hall_id = ?').get(id);
  if (schedules.count > 0) {
    return res.status(400).json({ error: '该影厅有排片记录，无法删除' });
  }
  
  db.prepare('DELETE FROM halls WHERE id = ?').run(id);
  res.json({ message: '影厅删除成功' });
});

router.get('/:id/seats', auth, (req, res) => {
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(req.params.id);
  
  if (!hall) {
    return res.status(404).json({ error: '影厅不存在' });
  }
  
  const seats = [];
  for (let row = 1; row <= hall.rows; row++) {
    for (let col = 1; col <= hall.cols; col++) {
      seats.push({
        row: row,
        col: col,
        label: `${String.fromCharCode(64 + row)}${col}`
      });
    }
  }
  
  res.json({ hall, seats });
});

module.exports = router;
