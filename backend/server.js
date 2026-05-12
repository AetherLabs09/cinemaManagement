const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const hallRoutes = require('./routes/halls');
const scheduleRoutes = require('./routes/schedules');
const orderRoutes = require('./routes/orders');
const seatRoutes = require('./routes/seats');
const memberRoutes = require('./routes/members');
const promotionRoutes = require('./routes/promotions');
const newsRoutes = require('./routes/news');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`数据库路径: ${path.join(__dirname, '../db/cinema.db')}`);
});
