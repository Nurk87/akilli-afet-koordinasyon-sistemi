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
const { fetchAfadToplanmaAlanlari } = require('./utils/afad-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true })); // Geliştirme aşamasında tüm kökenlere izin ver veya [origin: 'http://localhost:3000'] kullan
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const notificationRoutes = require('./routes/notifications');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'anasayfa.html'));
});

app.get('/guvenli-alanlar', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'guvenli_alanlar.html'));
});

app.get('/api/guvenli-alanlar', async (req, res) => {
  const pool = require('./config/database');
  try {
    // Veritabanından mevcut alanları getir
    const [rows] = await pool.query("SELECT * FROM guvenli_alanlar WHERE aktif = 1");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Veriler çekilemedi.' });
  }
});

// AFAD Sisteminden Verileri Güncelleme (Sync)
app.post('/api/sync-afad', verifyToken, requireRole('admin'), async (req, res) => {
  const pool = require('./config/database');
  try {
    const afadData = await fetchAfadToplanmaAlanlari();
    
    // Basit bir senkronizasyon mantığı:
    // Mevcut verileri pasife çekip yenileri ekleyebilir veya güncelleyebiliriz.
    for (const area of afadData) {
        await pool.query(
            "IF NOT EXISTS (SELECT 1 FROM guvenli_alanlar WHERE ad = ?) " +
            "INSERT INTO guvenli_alanlar (ad, tip, enlem, boylam, kapasite, aciklama, aktif) VALUES (?, ?, ?, ?, ?, ?, 1)",
            [area.ad, area.ad, area.tip, area.enlem, area.boylam, area.kapasite, area.aciklama]
        );
    }
    
    res.json({ success: true, message: 'AFAD verileri başarıyla senkronize edildi.', count: afadData.length });
  } catch (error) {
    res.status(500).json({ error: 'Senkronizasyon başarısız: ' + error.message });
  }
});

app.get('/dashboard/analiz', verifyToken, (req, res) => {
  if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'dashboard', 'analiz.html'));
});

app.use('/dashboard', verifyToken, dashboardRoutes);
app.use('/requests', requestRoutes); 
app.use('/atamalar', verifyToken, assignmentRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);

app.get('/admin', verifyToken, requireRole('yetkili'), (req, res) => {
  res.send('Yalnızca yetkililer görebilir.');
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});