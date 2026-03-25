const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { verifyToken } = require('./middleware/auth');
const { requireRole } = require('./middleware/role');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'https://seninsiten.com', credentials: true })); // kendi domainini yaz
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 2000, // İstek sınırını 2000'e çıkarıyoruz ( yoğun polling desteği )
  message: "Çok fazla istek geldi, lütfen daha sonra tekrar deneyin."
});
app.use(apiLimiter); // Tüm sisteme uygula (Polling engellenmemesi için)

app.use('/', authRoutes);

const dashboardRoutes = require('./routes/dashboard');
const requestRoutes = require('./routes/requests');
const assignmentRoutes = require('./routes/assignments');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'anasayfa.html'));
});

app.use('/dashboard', verifyToken, dashboardRoutes);
app.use('/requests', verifyToken, requestRoutes);
app.use('/atamalar', verifyToken, assignmentRoutes);

app.get('/admin', verifyToken, requireRole('yetkili'), (req, res) => {
  res.send('Yalnızca yetkililer görebilir.');
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});