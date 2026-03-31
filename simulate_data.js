const pool = require('./config/database');

async function simulate() {
  console.log('🚀 Grafik verisi simülasyonu başlatılıyor...');
  
  try {
    const dbType = pool.getDbType();
    const now = new Date();
    
    // Geçerli bir gönüllü bul
    const limitQuery = dbType === 'mssql' ? "SELECT TOP 1 id FROM users WHERE rol = 'gonullu'" : "SELECT id FROM users WHERE rol = 'gonullu' LIMIT 1";
    const [volunteers] = await pool.query(limitQuery);
    if (volunteers.length === 0) {
      console.log('⚠️ Gönüllü bulunamadı, simülasyon iptal.');
      process.exit(0);
    }
    const gonulluId = volunteers[0].id;

    // Rastgele 15 adet tamamlanmış görev ekle (Son 30 gün içinde)
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

      // 1. Talebi oluştur
      const [res] = await pool.query(
        "INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, durum, oncelik, enlem, boylam) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [`Simüle Talep ${i+1}`, 'Otomatik üretilmiş test verisi.', 34, 450, 'tamamlandi', 'orta', 41.0, 28.0]
      );
      
      const talepId = res[0]?.id || res.insertId;

      // 2. Atamayı oluştur ve tamamlandı olarak işaretle
      await pool.query(
        `INSERT INTO yardim_atamalari (talep_id, gonullu_id, durum, atama_tarihi, tamamlanma_tarihi) 
         VALUES (?, ?, 'tamamlandi', ?, ?)`,
        [talepId, gonulluId, dateStr, dateStr]
      );
    }
    
    console.log('✅ Simülasyon TAMAMLANDI. Grafikler artık dolu görünecek!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

simulate();
