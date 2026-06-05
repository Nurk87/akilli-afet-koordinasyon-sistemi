const express = require('express');
const pool = require('../config/database');
const { assignRequestsGreedy } = require('../utils/algorithm');
const { sendNotification } = require('../utils/notifications');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Otomatik Atama API Endpointi
 * 'yetkili' rolündeki kullanıcıların basarak Greedy algoritmasını tetiklediği rota.
 */
router.post('/otomatik', verifyToken, async (req, res) => {
  try {
    console.log('🤖 Otomatik Atama Tetiklendi. Kullanıcı Rolü:', req.user?.rol);
    
    if (!req.user || (req.user.rol !== 'yetkili' && req.user.rol !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    // Sistem ayarlarından otomatik atama motorunun açık olup olmadığını kontrol et
    const { getSettings } = require('../utils/settings');
    const settings = getSettings();
    if (settings.ai_otomatik_atama === false) {
      return res.status(400).json({ success: false, message: 'Otomatik atma motoru sistem ayarlarından kapatılmıştır. Lütfen ayarlardan aktifleştirin.' });
    }

    console.log('🔍 Bekleyen talepler çekiliyor...');
    const [talepler] = await pool.query(
      "SELECT TOP 100 id, enlem, boylam, oncelik, olusturulma_tarihi FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi') AND baslik NOT LIKE '%Simülasyon%' AND aciklama NOT LIKE '%Simülasyon%' ORDER BY olusturulma_tarihi ASC"
    );

    if (talepler.length === 0) {
      return res.json({ success: true, message: 'Bekleyen yeni yardım talebi bulunmuyor.' });
    }

    console.log('🔍 Müsait gönüllüler çekiliyor...');
    const [gonulluler] = await pool.query(
      "SELECT id, enlem, boylam, kapasite, musaitlik_durumu FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND durum = 'aktif' AND kapasite > 0 AND enlem IS NOT NULL"
    );

    if (gonulluler.length === 0) {
      return res.json({ success: false, message: 'Bölgede müsait/kapasitesi olan gönüllü bulunamadı. Lütfen gönüllülerin konumlarını ve kapasitelerini kontrol edin.' });
    }

    console.log(`📊 İşlem Başlatılıyor: ${talepler.length} Talep, ${gonulluler.length} Gönüllü.`);

    // Greedy Algoritmasını Çalıştır
    const result = assignRequestsGreedy(talepler, gonulluler);
    if (!result || !result.assignments) {
       throw new Error('Algoritma bir sonuç üretemedi.');
    }

    const atamalar = result.assignments;
    const stats = result.stats;

    if (atamalar.length === 0) {
      return res.json({ success: false, message: 'Algoritma uygun bir eşleşme bulamadı. Koordinat farkları çok büyük olabilir.' });
    }

    console.log(`🎯 Algoritma Sonucu: ${atamalar.length} atama yapılıyor...`);

    let yapilanAtamaSayisi = 0;
    for (let atama of atamalar) {
      try {
        await pool.query(
          "INSERT INTO yardim_atamalari (talep_id, gonullu_id, mesafe_km, oncelik_skoru, durum) VALUES (?, ?, ?, ?, 'atandi')",
          [atama.talep_id, atama.gonullu_id, atama.mesafe_km, atama.oncelik_skoru]
        );
        
        await pool.query(
          "UPDATE yardim_talepleri SET durum = 'atandi', hesaplanan_oncelik_skoru = ? WHERE id = ?",
          [atama.oncelik_skoru, atama.talep_id]
        );

        await sendNotification(
          atama.gonullu_id, 
          'Yeni Görev!', 
          `Sistem tarafından size yeni bir görev atandı (ID: ${atama.talep_id}).`,
          'success',
          '/dashboard'
        );

        yapilanAtamaSayisi++;
      } catch (insertError) {
        console.error(`❌ Atama Kayıt Hatası (Talep: ${atama.talep_id}):`, insertError.message);
      }
    }

    res.json({
      success: true,
      message: `${yapilanAtamaSayisi} adet talep başarıyla atandı.`,
      atamalar: atamalar,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Otomatik Atama Motoru Çöktü:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Atama algoritması çalıştırılamadı.',
      details: error.message 
    });
  }
});

// Get available volunteers
router.get('/api/available-volunteers', verifyToken, async (req, res) => {
  try {
    const [volunteers] = await pool.query(
      "SELECT id, ad, soyad, telefon, kapasite FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND durum = 'aktif' AND kapasite > 0"
    );
    console.log('📡 API: Müsait Gönüllüler Gönderiliyor. Sayı:', volunteers.length);
    res.json(volunteers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gönüllü listesi alınamadı' });
  }
});

// Manual Assignment
router.post('/api/manual-assign', verifyToken, async (req, res) => {
  try {
    const { talep_id, gonullu_id } = req.body;
    if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    // 1. Create assignment record
    await pool.query(
      "INSERT INTO yardim_atamalari (talep_id, gonullu_id, mesafe_km, oncelik_skoru, durum) VALUES (?, ?, 0, 0, 'atandi')",
      [talep_id, gonullu_id]
    );

    // 2. Update request status to 'atandı'
    await pool.query(
      "UPDATE yardim_talepleri SET durum = 'atandi' WHERE id = ?",
      [talep_id]
    );

    // 3. Optional: Decrement volunteer capacity
    await pool.query(
      "UPDATE users SET kapasite = kapasite - 1 WHERE id = ?",
      [gonullu_id]
    );

    // 4. Bildirim Gönder
    await sendNotification(
      gonullu_id,
      'Yeni Görev Atandı (Manuel)',
      `Koordinasyon merkezi tarafından size yeni bir görev atandı: ${talep_id}.`,
      'success',
      '/dashboard'
    );

    res.json({ success: true, message: 'Gönüllü başarıyla atandı!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Atama işlemi başarısız' });
  }
});

// YENİ: Gönüllüye atanan görevleri listele
router.get('/api/my-tasks', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT TOP 50
        y.*, 
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.durum as atama_durumu,
        ya.atama_tarihi
      FROM yardim_talepleri y WITH (NOLOCK)
      JOIN yardim_atamalari ya WITH (NOLOCK) ON y.id = ya.talep_id
      LEFT JOIN iller i WITH (NOLOCK) ON y.il_id = i.id
      LEFT JOIN ilceler ilc WITH (NOLOCK) ON y.ilce_id = ilc.id
      WHERE ya.gonullu_id = ? AND ya.durum != 'iptal'
      ORDER BY y.hesaplanan_oncelik_skoru DESC, y.olusturulma_tarihi DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error('❌ Gönüllü Görev Listesi Hatası:', error);
    res.status(500).json({ error: 'Görevleriniz yüklenirken bir hata oluştu.' });
  }
});

module.exports = router;
