const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const { sendNotification } = require('../utils/notifications');

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

router.get('/', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'index.html'));
});

// Yeni: Başarı sayfası
router.get('/basarili', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'basarili.html'));
});

// Yeni: Takip sayfası
router.get('/takip/:kod', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'takip.html'));
});

router.post('/api/create', upload.fields([{ name: 'fotograf', maxCount: 1 }, { name: 'ses_kaydi', maxCount: 1 }]), async (req, res) => {
  try {
    const { baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam, ad_soyad, telefon, acik_adres, yardim_tipi } = req.body;
    const kullanici_id = req.user ? req.user.id : null; 
    
    const fotograf_yolu = req.files['fotograf'] ? '/uploads/' + req.files['fotograf'][0].filename : null;
    const ses_kaydi_yolu = req.files['ses_kaydi'] ? '/uploads/' + req.files['ses_kaydi'][0].filename : null;
    
    const takip_kodu = crypto.randomBytes(4).toString('hex').toUpperCase();

    await pool.query(
      'INSERT INTO yardim_talepleri (kullanici_id, baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam, durum, fotograf_yolu, ses_kaydi_yolu, ad_soyad, telefon, takip_kodu, acik_adres, yardim_tipi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [kullanici_id, baslik, aciklama, il_id, ilce_id, mahalle, oncelik, enlem, boylam, 'yeni', fotograf_yolu, ses_kaydi_yolu, ad_soyad, telefon, takip_kodu, acik_adres, yardim_tipi]
    );

    // YETKİLİ VE ADMİNLERE BİLDİRİM GÖNDER
    const [admins] = await pool.query("SELECT id FROM users WHERE rol IN ('yetkili', 'admin')");
    for (let admin of admins) {
      await sendNotification(
        admin.id,
        'YENİ YARDIM TALEBİ!',
        `Yeni bir yardım talebi oluşturuldu: ${baslik}. Lütfen inceleyin.`,
        'warning',
        '/requests'
      );
    }

    res.json({ success: true, message: 'Yardım talebi başarıyla oluşturuldu.', takip_kodu });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Talep oluşturulurken bir hata oluştu.' });
  }
});

// Form submission handler for /olustur
router.post('/olustur', upload.fields([{ name: 'fotograf', maxCount: 1 }, { name: 'ses_kaydi', maxCount: 1 }]), async (req, res) => {
  try {
    const { baslik, aciklama, il_id, ilce_id, oncelik, enlem, boylam, ad_soyad, telefon, acik_adres, yardim_tipi } = req.body;
    const kullanici_id = req.user ? req.user.id : null;
    
    const fotograf_yolu = req.files['fotograf'] ? '/uploads/' + req.files['fotograf'][0].filename : null;
    const ses_kaydi_yolu = req.files['ses_kaydi'] ? '/uploads/' + req.files['ses_kaydi'][0].filename : null;
    
    const takip_kodu = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Resolve ilce_id
    const [ilceRows] = await pool.query(
      "SELECT id FROM ilceler WHERE il_id = ? AND ad = ?",
      [parseInt(il_id), ilce_id]
    );

    const actualIlceId = ilceRows.length > 0 ? ilceRows[0].id : null;
    
    if (!actualIlceId) {
      return res.status(400).send(`Geçersiz ilçe seçimi: il_id=${il_id}, ilce_id=${ilce_id}`);
    }

    await pool.query(
      'INSERT INTO yardim_talepleri (kullanici_id, baslik, aciklama, il_id, ilce_id, oncelik, enlem, boylam, durum, fotograf_yolu, ses_kaydi_yolu, ad_soyad, telefon, takip_kodu, acik_adres, yardim_tipi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        fotograf_yolu,
        ses_kaydi_yolu,
        ad_soyad || null,
        telefon || null,
        takip_kodu,
        acik_adres || null,
        yardim_tipi
      ]
    );

    // YETKİLİ VE ADMİNLERE BİLDİRİM GÖNDER
    const [admins] = await pool.query("SELECT id FROM users WHERE rol IN ('yetkili', 'admin')");
    for (let admin of admins) {
      await sendNotification(
        admin.id,
        'YENİ YARDIM TALEBİ!',
        `Yeni bir yardım talebi oluşturuldu: ${baslik}. Lütfen inceleyin.`,
        'warning',
        '/requests'
      );
    }

    res.redirect(`/requests/basarili?kod=${takip_kodu}&baslik=${encodeURIComponent(baslik)}`);
  } catch (error) {
    console.error('❌ Kayıt Hatası DETAY:', error);
    res.status(500).send(`Yardım talebi oluşturulurken hata oluştu: ${error.message}`);
  }
});

// Yeni: Takip API
router.get('/api/track/:kod', async (req, res) => {
  try {
    const { kod } = req.params;
    const query = `
      SELECT 
        y.*, 
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.durum as atama_durumu,
        ya.atama_tarihi,
        gv.ad as gonullu_ad, 
        gv.soyad as gonullu_soyad,
        gv.telefon as gonullu_telefon,
        gv.enlem as gonullu_enlem,
        gv.boylam as gonullu_boylam
      FROM yardim_talepleri y
      LEFT JOIN iller i ON y.il_id = i.id
      LEFT JOIN ilceler ilc ON y.ilce_id = ilc.id
      LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id AND ya.durum != 'iptal'
      LEFT JOIN users gv ON ya.gonullu_id = gv.id
      WHERE y.takip_kodu = ?
    `;
    const [rows] = await pool.query(query, [kod]);
    if (rows.length === 0) return res.status(404).json({ error: 'Talep bulunamadı' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Takip verisi alınamadı' });
  }
});

// Yeni: İlçe Bazlı Talep Geri Getirme (Hızlı Kurtarma için)
router.get('/api/recover-list', async (req, res) => {
  try {
    const { il_id, ilce_ad } = req.query;
    if (!il_id || !ilce_ad) {
      return res.status(400).json({ error: 'İl ve İlçe seçimi zorunludur.' });
    }

    // Önce ilce_ad'dan ilce_id bul
    const [ilceRows] = await pool.query(
      "SELECT id FROM ilceler WHERE il_id = ? AND ad = ?",
      [parseInt(il_id), ilce_ad]
    );

    if (ilceRows.length === 0) {
      return res.json([]); // İlçe bulunamadıysa boş dön
    }

    const actualIlceId = ilceRows[0].id;
    const isSqlite = pool.getDbType() === 'sqlite';
    const timeFilter = isSqlite ? "datetime('now', '-2 days')" : "DATEADD(day, -2, GETDATE())";

    const query = `
      SELECT 
        ad_soyad, baslik, takip_kodu, durum, olusturulma_tarihi 
      FROM yardim_talepleri 
      WHERE il_id = ? AND ilce_id = ? AND ad_soyad IS NOT NULL
      AND olusturulma_tarihi >= ${timeFilter}
      ORDER BY olusturulma_tarihi DESC
    `;

    const [rows] = await pool.query(query, [il_id, actualIlceId]);
    res.json(rows.slice(0, 30));
  } catch (error) {
    console.error('Kurtarma Listesi Hatası:', error);
    res.status(500).json({ error: 'Liste alınamadı' });
  }
});

router.get('/api/list', verifyToken, async (req, res) => {
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
        COALESCE(u.ad, y.ad_soyad) as ad, 
        COALESCE(u.soyad, '') as soyad, 
        COALESCE(y.telefon, u.telefon) as telefon,
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.gonullu_id,
        ya.gonullu_id as assigned_volunteer_id,
        ya.durum as atama_durumu,
        gv.ad as gonullu_ad, 
        gv.soyad as gonullu_soyad,
        gv.telefon as gonullu_telefon
      FROM yardim_talepleri y WITH (NOLOCK)
      LEFT JOIN users u WITH (NOLOCK) ON y.kullanici_id = u.id
      LEFT JOIN iller i WITH (NOLOCK) ON y.il_id = i.id
      LEFT JOIN ilceler ilc WITH (NOLOCK) ON y.ilce_id = ilc.id
      LEFT JOIN yardim_atamalari ya WITH (NOLOCK) ON y.id = ya.talep_id AND ya.durum != 'iptal'
      LEFT JOIN users gv WITH (NOLOCK) ON ya.gonullu_id = gv.id
      ${whereClause}
      ORDER BY y.olusturulma_tarihi DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Veri çekilemedi' });
  }
});

router.post('/api/update-status', verifyToken, async (req, res) => {
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

router.post('/api/update-status-gonullu', verifyToken, async (req, res) => {
  try {
    const { id, durum } = req.body;
    if (req.user.rol !== 'gonullu') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const [atama] = await pool.query(
      "SELECT id FROM yardim_atamalari WHERE talep_id = ? AND gonullu_id = ?",
      [id, req.user.id]
    );

    if (atama.length === 0) {
      return res.status(403).json({ error: 'Bu görevi güncelleme yetkiniz yok.' });
    }

    // --- SIRALI GÖREV DİSİPLİNİ KONTROLÜ ---
    // Gönüllünün üzerine atanmış daha yüksek öncelik skorlu ve henüz tamamlanmamış görev var mı?
    const [higherPriority] = await pool.query(`
      SELECT TOP 1 y.baslik, y.hesaplanan_oncelik_skoru
      FROM yardim_talepleri y
      JOIN yardim_atamalari ya ON y.id = ya.talep_id
      WHERE ya.gonullu_id = ? 
      AND ya.durum IN ('atandi', 'yola cikti', 'talep alindi')
      AND y.id != ?
      AND y.hesaplanan_oncelik_skoru > (SELECT hesaplanan_oncelik_skoru FROM yardim_talepleri WHERE id = ?)
      ORDER BY y.hesaplanan_oncelik_skoru DESC
    `, [req.user.id, id, id]);

    if (higherPriority.length > 0) {
      return res.status(403).json({ 
        error: `Sıralı Görev Kuralı: Lütfen önce en yüksek öncelikli ' ${higherPriority[0].baslik} ' görevini tamamlayın.` 
      });
    }
    // --------------------------------------

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