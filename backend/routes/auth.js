const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { auth, checkRole, JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = 1').get(username);
  
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, real_name: user.real_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      real_name: user.real_name,
      role: user.role,
      phone: user.phone,
      email: user.email
    }
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, real_name, role, phone, email, status, created_at FROM users WHERE id = ?').get(req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json(user);
});

router.put('/password', auth, (req, res) => {
  const { old_password, new_password } = req.body;
  
  if (!old_password || !new_password) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  
  if (!bcrypt.compareSync(old_password, user.password)) {
    return res.status(400).json({ error: '旧密码错误' });
  }
  
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user.id);
  
  res.json({ message: '密码修改成功' });
});

router.put('/profile', auth, (req, res) => {
  const { real_name, phone, email } = req.body;
  
  db.prepare('UPDATE users SET real_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(real_name, phone, email, req.user.id);
  
  res.json({ message: '个人信息更新成功' });
});

router.get('/users', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, real_name, role, phone, email, status, created_at FROM users').all();
  res.json(users);
});

router.post('/users', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { username, password, real_name, role, phone, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, real_name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, hashedPassword, real_name, role || 'staff', phone, email);
  
  res.json({ id: result.lastInsertRowid, message: '用户创建成功' });
});

router.put('/users/:id', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { real_name, role, phone, email, status } = req.body;
  
  db.prepare('UPDATE users SET real_name = ?, role = ?, phone = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(real_name, role, phone, email, status, id);
  
  res.json({ message: '用户更新成功' });
});

router.delete('/users/:id', auth, checkRole('super_admin'), (req, res) => {
  const { id } = req.params;
  
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: '不能删除自己的账号' });
  }
  
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: '用户删除成功' });
});

router.put('/users/:id/reset-password', auth, checkRole('super_admin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  
  if (!new_password) {
    return res.status(400).json({ error: '新密码不能为空' });
  }
  
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, id);
  
  res.json({ message: '密码重置成功' });
});

module.exports = router;
