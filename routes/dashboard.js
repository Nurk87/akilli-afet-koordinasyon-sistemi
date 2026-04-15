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

router.get('/ayarlar', (req, res) => {
  if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'ayarlar.html'));
});

router.get('/gecmis', (req, res) => {
  if (req.user.rol !== 'gonullu') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'gonullu_gecmis.html'));
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

router.get('/api/analytics', async (req, res) => {
  try {
    const dbType = pool.getDbType();
    
    // 1. Durum Dağılımı (Pie Chart)
    const [statusDist] = await pool.query(`
      SELECT durum as label, COUNT(*) as value 
      FROM yardim_talepleri 
      GROUP BY durum`);

    // 2. Zaman Serisi (Daily / Weekly / Monthly)
    let dailyQuery, weeklyQuery, monthlyQuery;

    if (dbType === 'mssql') {
      // MSSQL: Gelen vs Tamamlanan
      dailyQuery = `
        SELECT 
          COALESCE(t.label, a.label) as label,
          ISNULL(t.created, 0) as created,
          ISNULL(a.completed, 0) as completed
        FROM (
          SELECT FORMAT(olusturulma_tarihi, 'dd-MM') as label, COUNT(*) as created 
          FROM yardim_talepleri WHERE olusturulma_tarihi >= DATEADD(day, -7, GETDATE()) GROUP BY FORMAT(olusturulma_tarihi, 'dd-MM')
        ) t
        FULL OUTER JOIN (
          SELECT FORMAT(tamamlanma_tarihi, 'dd-MM') as label, COUNT(*) as completed 
          FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= DATEADD(day, -7, GETDATE()) GROUP BY FORMAT(tamamlanma_tarihi, 'dd-MM')
        ) a ON t.label = a.label
        ORDER BY label`;
      
      weeklyQuery = `
        SELECT 
          COALESCE(t.label, a.label) as label,
          ISNULL(t.created, 0) as created,
          ISNULL(a.completed, 0) as completed
        FROM (
          SELECT 'H' + CAST(DATEPART(week, olusturulma_tarihi) as varchar) as label, COUNT(*) as created 
          FROM yardim_talepleri WHERE olusturulma_tarihi >= DATEADD(week, -4, GETDATE()) GROUP BY DATEPART(week, olusturulma_tarihi)
        ) t
        FULL OUTER JOIN (
          SELECT 'H' + CAST(DATEPART(week, tamamlanma_tarihi) as varchar) as label, COUNT(*) as completed 
          FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= DATEADD(week, -4, GETDATE()) GROUP BY DATEPART(week, tamamlanma_tarihi)
        ) a ON t.label = a.label
        ORDER BY label`;

      monthlyQuery = `
        SELECT 
          COALESCE(t.label, a.label) as label,
          ISNULL(t.created, 0) as created,
          ISNULL(a.completed, 0) as completed
        FROM (
          SELECT FORMAT(olusturulma_tarihi, 'MM-yyyy') as label, COUNT(*) as created 
          FROM yardim_talepleri WHERE olusturulma_tarihi >= DATEADD(month, -6, GETDATE()) GROUP BY FORMAT(olusturulma_tarihi, 'MM-yyyy')
        ) t
        FULL OUTER JOIN (
          SELECT FORMAT(tamamlanma_tarihi, 'MM-yyyy') as label, COUNT(*) as completed 
          FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= DATEADD(month, -6, GETDATE()) GROUP BY FORMAT(tamamlanma_tarihi, 'MM-yyyy')
        ) a ON t.label = a.label
        ORDER BY label`;
    } else {
      // SQLite: Gelen vs Tamamlanan (Biraz daha manuel birleşim JS tarafında daha kolay olabilir ama SQL'de UNION ALL ile yapalım)
      dailyQuery = `
        SELECT label, SUM(created) as created, SUM(completed) as completed FROM (
          SELECT strftime('%d-%m', olusturulma_tarihi) as label, COUNT(*) as created, 0 as completed FROM yardim_talepleri WHERE olusturulma_tarihi >= date('now', '-7 days') GROUP BY label
          UNION ALL
          SELECT strftime('%d-%m', tamamlanma_tarihi) as label, 0 as created, COUNT(*) as completed FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= date('now', '-7 days') GROUP BY label
        ) GROUP BY label ORDER BY label`;
      
      weeklyQuery = `
        SELECT label, SUM(created) as created, SUM(completed) as completed FROM (
          SELECT 'H' + strftime('%W', olusturulma_tarihi) as label, COUNT(*) as created, 0 as completed FROM yardim_talepleri WHERE olusturulma_tarihi >= date('now', '-28 days') GROUP BY label
          UNION ALL
          SELECT 'H' + strftime('%W', tamamlanma_tarihi) as label, 0 as created, COUNT(*) as completed FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= date('now', '-28 days') GROUP BY label
        ) GROUP BY label ORDER BY label`;

      monthlyQuery = `
        SELECT label, SUM(created) as created, SUM(completed) as completed FROM (
          SELECT strftime('%m-%Y', olusturulma_tarihi) as label, COUNT(*) as created, 0 as completed FROM yardim_talepleri WHERE olusturulma_tarihi >= date('now', '-6 months') GROUP BY label
          UNION ALL
          SELECT strftime('%m-%Y', tamamlanma_tarihi) as label, 0 as created, COUNT(*) as completed FROM yardim_atamalari WHERE durum = 'tamamlandi' AND tamamlanma_tarihi >= date('now', '-6 months') GROUP BY label
        ) GROUP BY label ORDER BY label`;
    }

    const [daily] = await pool.query(dailyQuery);
    const [weekly] = await pool.query(weeklyQuery);
    const [monthly] = await pool.query(monthlyQuery);

    res.json({ statusDist, daily, weekly, monthly });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Analiz verileri alınamadı' });
  }
});

router.get('/api/export-csv', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        y.id, y.baslik, y.durum, y.oncelik, 
        (i.ad + ' / ' + ilc.ad) as adres,
        y.olusturulma_tarihi,
        (SELECT TOP 1 tamamlanma_tarihi FROM yardim_atamalari WITH (NOLOCK) WHERE talep_id = y.id AND durum = 'tamamlandi') as tamam_tarih
      FROM yardim_talepleri y WITH (NOLOCK)
      LEFT JOIN iller i WITH (NOLOCK) ON y.il_id = i.id
      LEFT JOIN ilceler ilc WITH (NOLOCK) ON y.ilce_id = ilc.id`);
    
    let csv = '\uFEFF'; // BOM for Excel Turkish Char Support
    csv += 'ID,Baslik,Durum,Öncelik,Adres,Oluşturulma Tarihi,Tamamlanma Tarihi\n';
    rows.forEach(r => {
      const sanitizedAdres = (r.adres || '').replace(/"/g, '""');
      csv += `${r.id},"${r.baslik}","${r.durum}","${r.oncelik}","${sanitizedAdres}","${r.olusturulma_tarihi || ''}","${r.tamam_tarih || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=afet-koordinasyon-tum-veriler.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).send('Dışa aktarma hatası');
  }
});

module.exports = router;