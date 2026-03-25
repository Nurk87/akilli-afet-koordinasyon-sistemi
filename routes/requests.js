const express = require('express');
const path = require('path');
const pool = require('../config/database');
const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'index.html'));
});

router.get('/yeni', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'requests', 'yeni.html'));
});

router.post('/olustur', async (req, res) => {
  try {
    const { il_id, ilce_id, baslik, aciklama, enlem, boylam, oncelik } = req.body;
    
    // il_id and ilce_id in the form are names in the HTML right now, 
    // but the DB expects INT. The actual DB has an iller and ilceler table.
    // For simplicity, we just save the request directly if possible, or adapt.
    // Let's insert mapping logic. Since the JS frontend sends il name, we will look it up.
    
    const [iller] = await pool.query('SELECT id FROM iller WHERE ad = ?', [il_id]);
    let gercek_il_id = iller.length > 0 ? iller[0].id : 1; // fallback
    
    const [ilceler] = await pool.query('SELECT id FROM ilceler WHERE ad = ? AND il_id = ?', [ilce_id, gercek_il_id]);
    let gercek_ilce_id = ilceler.length > 0 ? ilceler[0].id : 1; // fallback

    await pool.query(
      `INSERT INTO yardim_talepleri 
      (kullanici_id, il_id, ilce_id, enlem, boylam, baslik, aciklama, durum, oncelik) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'yeni', ?)`,
      [req.user.id, gercek_il_id, gercek_ilce_id, enlem, boylam, baslik, aciklama, oncelik]
    );

    res.redirect('/requests');
  } catch (error) {
    console.error(error);
    res.status(500).send('Talep oluşturulurken bir hata oluştu.');
  }
});

// JSON API for fetching requests dynamically in index.html
router.get('/api/list', async (req, res) => {
  try {
    let whereClause = "";
    let params = [];
    
    // If victim, only show their own requests
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

// Update request status (Approve / Dispatch teams / Complete)
router.post('/api/update-status', async (req, res) => {
  try {
    const { id, durum } = req.body;
    if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    // Validate allowed status transitions if needed, but for now simple update
    await pool.query(
      'UPDATE yardim_talepleri SET durum = ? WHERE id = ?',
      [durum, id]
    );

    res.json({ success: true, message: `Talep durumu '${durum}' olarak güncellendi.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Durum güncellenemedi.' });
  }
});

module.exports = router;