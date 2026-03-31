const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const path = require('path');
const multer = require('multer');

// Multer Storage Konfigürasyonu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.get('/yeni', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'yeni.html'));
});

// Alias for Turkish translation
router.get('/olustur', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'yeni.html'));
});

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'index.html'));
});

router.post('/api/create', upload.single('fotograf'), async (req, res) => {
  try {
    const { baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam } = req.body;
    const kullanici_id = req.user.id; 
    const fotograf_yolu = req.file ? '/uploads/' + req.file.filename : null;

    await pool.query(
      'INSERT INTO yardim_talepleri (kullanici_id, baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam, durum, fotograf_yolu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [kullanici_id, baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam, 'yeni', fotograf_yolu]
    );

    res.json({ success: true, message: 'Yardım talebi başarıyla oluşturuldu.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Talep oluşturulurken bir hata oluştu.' });
  }
});

// Form submission handler for /olustur
router.post('/olustur', upload.single('fotograf'), async (req, res) => {
  try {
    const { baslik, aciklama, il_id, ilce_id, oncelik, enlem, boylam } = req.body;
    const kullanici_id = req.user.id;
    const fotograf_yolu = req.file ? '/uploads/' + req.file.filename : null;

    // Resolve ilce_id (form sends name, db needs INT ID)
    const [ilceRows] = await pool.query(
      "SELECT id FROM ilceler WHERE il_id = ? AND ad = ?",
      [parseInt(il_id), ilce_id]
    );

    const actualIlceId = ilceRows.length > 0 ? ilceRows[0].id : null;
    
    if (!actualIlceId) {
      return res.status(400).send(`Geçersiz ilçe seçimi: ${ilce_id}`);
    }

    await pool.query(
      'INSERT INTO yardim_talepleri (kullanici_id, baslik, aciklama, il_id, ilce_id, oncelik, enlem, boylam, durum, fotograf_yolu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        kullanici_id, 
        baslik, 
        aciklama || '', 
        parseInt(il_id), 
        actualIlceId, 
        oncelik, 
        enlem ? parseFloat(enlem) : 0, 
        boylam ? parseFloat(boylam) : 0, 
        'yeni',
        fotograf_yolu
      ]
    );

    res.redirect('/requests');
  } catch (error) {
    console.error('Kayıt Hatası:', error);
    res.status(500).send('Yardım talebi oluşturulurken hata oluştu. Lütfen tüm alanları (il/ilçe/koordinat) kontrol ediniz.');
  }
});

router.get('/api/list', async (req, res) => {
  try {
    let whereClause = "";
    let params = [];

    if (req.user.rol === 'kazazede') {
      whereClause = "WHERE y.kullanici_id = ?";
      params.push(req.user.id);
    }

    let query = `
      SELECT 
        y.*, 
        u.ad, u.soyad, u.telefon, 
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.gonullu_id,
        ya.durum as atama_durumu,
        gv.ad as gonullu_ad, 
        gv.soyad as gonullu_soyad,
        gv.telefon as gonullu_telefon
      FROM yardim_talepleri y
      JOIN users u ON y.kullanici_id = u.id
      LEFT JOIN iller i ON y.il_id = i.id
      LEFT JOIN ilceler ilc ON y.ilce_id = ilc.id
      LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id AND ya.durum != 'iptal'
      LEFT JOIN users gv ON ya.gonullu_id = gv.id
      ${whereClause}
      ORDER BY y.olusturulma_tarihi DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Veri çekilemedi' });
  }
});

router.post('/api/update-status', async (req, res) => {
  try {
    const { id, durum } = req.body;
    if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    await pool.query(
      'UPDATE yardim_talepleri SET durum = ? WHERE id = ?',
      [durum, id]
    );

    if (durum === 'tamamlandi') {
      const [atamalar] = await pool.query(
        "SELECT gonullu_id FROM yardim_atamalari WHERE talep_id = ? AND durum != 'iptal'",
        [id]
      );
      if (atamalar.length > 0) {
        await pool.query(
          "UPDATE users SET kapasite = kapasite + 1 WHERE id = ?",
          [atamalar[0].gonullu_id]
        );
        await pool.query(
          "UPDATE yardim_atamalari SET durum = 'tamamlandi', tamamlanma_tarihi = GETDATE() WHERE talep_id = ? AND durum != 'iptal'",
          [id]
        );
      }
    }

    res.json({ success: true, message: `Talep durumu '${durum}' olarak güncellendi.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Durum güncellenemedi.' });
  }
});

router.post('/api/update-status-gonullu', async (req, res) => {
  try {
    const { id, durum } = req.body;
    if (req.user.rol !== 'gonullu') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const [atama] = await pool.query(
      "SELECT id FROM yardim_atamalari WHERE talep_id = ? AND gonullu_id = ? AND durum != 'iptal'",
      [id, req.user.id]
    );

    if (atama.length === 0) {
      return res.status(403).json({ error: 'Bu görevi güncelleme yetkiniz yok.' });
    }

    await pool.query(
      'UPDATE yardim_talepleri SET durum = ? WHERE id = ?',
      [durum, id]
    );

    if (durum === 'tamamlandi') {
      await pool.query(
        "UPDATE users SET kapasite = kapasite + 1 WHERE id = ?",
        [req.user.id]
      );
      await pool.query(
        "UPDATE yardim_atamalari SET durum = 'tamamlandi', tamamlanma_tarihi = GETDATE() WHERE talep_id = ?",
        [id]
      );
    } else {
       await pool.query(
        "UPDATE yardim_atamalari SET durum = ? WHERE talep_id = ?",
        [durum, id]
      );
    }

    res.json({ success: true, message: `Durum '${durum}' olarak güncellendi.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Durum güncellenemedi.' });
  }
});

module.exports = router;