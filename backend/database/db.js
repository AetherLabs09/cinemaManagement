const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const db = new Database(path.join(dbPath, 'cinema.db'));

db.pragma('journal_mode = WAL');

const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
db.exec(initSql);

const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
if (adminCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, real_name, role, phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  insertUser.run('admin', hashedPassword, '超级管理员', 'super_admin', '13800138000', 'admin@cinema.com', 1);
  insertUser.run('manager', bcrypt.hashSync('manager123', 10), '系统管理员', 'admin', '13800138001', 'manager@cinema.com', 1);
  insertUser.run('staff', bcrypt.hashSync('staff123', 10), '影院员工', 'staff', '13800138002', 'staff@cinema.com', 1);
  
  console.log('默认用户创建完成');
}

console.log('数据库初始化完成');

module.exports = db;
