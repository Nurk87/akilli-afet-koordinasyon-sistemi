const express = require('express');
const path = require('path');
const pool = require('../config/database');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.user.rol === 'gonullu') {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'gonullu.html'));
  } else if (req.user.rol === 'kazazede') {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'kazazede.html'));
  } else if (req.user.rol === 'yetkili') {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'yetkili.html'));
  } else {
    res.redirect('/giris');
  }
});

router.get('/atama', (req, res) => {
  if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'atama.html'));
});

router.get('/users', (req, res) => {
  if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'users.html'));
});

router.get('/api/users', async (req, res) => {
  try {
    if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    const [users] = await pool.query('SELECT id, ad, soyad, email, telefon, rol, olusturulma_tarihi FROM users ORDER BY olusturulma_tarihi DESC');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Kullanıcı listesi alınamadı' });
  }
});

router.get('/api/stats', async (req, res) => {
  try {
    const [totalRes] = await pool.query('SELECT COUNT(*) as count FROM yardim_talepleri');
    const [emergencyRes] = await pool.query("SELECT COUNT(*) as count FROM yardim_talepleri WHERE oncelik = 'acil' AND durum != 'tamamlandi'");
    const [completedRes] = await pool.query("SELECT COUNT(*) as count FROM yardim_talepleri WHERE durum = 'tamamlandi'");
    const [volunteerRes] = await pool.query("SELECT COUNT(*) as count FROM users WHERE rol = 'gonullu'");

    res.json({
      totalRequests: totalRes[0].count,
      pendingEmergency: emergencyRes[0].count,
      completedRequests: completedRes[0].count,
      activeVolunteers: volunteerRes[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

module.exports = router;