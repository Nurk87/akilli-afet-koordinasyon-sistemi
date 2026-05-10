const express = require('express');
const pool = require('../config/database');
const { assignRequestsGreedy } = require('../utils/algorithm');
const { sendNotification } = require('../utils/notifications');
const router = express.Router();

/**
 * Otomatik Atama API Endpointi
 * 'yetkili' rolündeki kullanıcıların basarak Greedy algoritmasını tetiklediği rota.
 */
router.post('/otomatik', async (req, res) => {
  try {
    console.log('🤖 Otomatik Atama Tetiklendi. Kullanıcı Rolü:', req.user.rol);
    // Sadece yetkililer otomatik atama yapabilir
    if (req.user.rol !== 'yetkili' && req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    // Bekleyen (yeni veya onaylanmış) yardım taleplerini çek
    const [talepler] = await pool.query(
      "SELECT TOP 100 id, enlem, boylam, oncelik, olusturulma_tarihi FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi') ORDER BY olusturulma_tarihi ASC"
    );

    if (talepler.length === 0) {
      return res.json({ success: true, message: 'Bekleyen yeni yardım talebi bulunmuyor.' });
    }

    // Müsait olan gönüllüleri çek
    const [gonulluler] = await pool.query(
      "SELECT id, enlem, boylam, kapasite, musaitlik_durumu FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND durum = 'aktif' AND kapasite > 0 AND enlem IS NOT NULL"
    );

    if (gonulluler.length === 0) {
      return res.json({ success: false, message: 'Bölgede müsait/kapasitesi olan gönüllü bulunamadı.' });
    }

    console.log(`📊 Bulunan Talepler: ${talepler.length}, Müsait Gönüllüler: ${gonulluler.length}`);

    // Greedy Algoritmasını Çalıştır
    const result = assignRequestsGreedy(talepler, gonulluler);
    const atamalar = result.assignments;
    const stats = result.stats;

    console.log(`🎯 Algoritma Sonucu: ${atamalar.length} adet atama bulundu.`);

    if (atamalar.length === 0) {
      return res.json({ success: false, message: 'Algoritma uygun bir eşleşme bulamadı (Kapasite veya koordinat eksikliği).' });
    }

    // Veritabanına Kaydet
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
          'Yeni Görev Atandı!', 
          `Sistem tarafından size yeni bir yardım talebi atandı: ${atama.talep_id}. Lütfen detayları kontrol edin.`,
          'success',
          '/dashboard'
        );

        yapilanAtamaSayisi++;
      } catch (insertError) {
        console.error('Atama Insert Hatası:', insertError);
      }
    }

    console.log('✅ Atama İşlemi Başarıyla Tamamlandı.');
    res.json({
      success: true,
      message: `${yapilanAtamaSayisi} adet talep başarıyla gönüllülere (Greedy algoritması ile) atandı!`,
      atamalar: atamalar,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Otomatik Atama Motoru Çöktü:', error);
    res.status(500).json({ success: false, message: 'Atama algoritması çalıştırılamadı.' });
  }
});

// Get available volunteers
router.get('/api/available-volunteers', async (req, res) => {
  try {
    const [volunteers] = await pool.query(
      "SELECT id, ad, soyad, telefon, kapasite FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND durum = 'aktif' AND kapasite > 0"
    );
    res.json(volunteers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gönüllü listesi alınamadı' });
  }
});

// Manual Assignment
router.post('/api/manual-assign', async (req, res) => {
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
router.get('/api/my-tasks', async (req, res) => {
  try {
    const query = `
      SELECT 
        y.*, 
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.durum as atama_durumu,
        ya.atama_tarihi
      FROM yardim_talepleri y
      JOIN yardim_atamalari ya ON y.id = ya.talep_id
      LEFT JOIN iller i ON y.il_id = i.id
      LEFT JOIN ilceler ilc ON y.ilce_id = ilc.id
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
