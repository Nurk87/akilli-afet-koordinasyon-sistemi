const pool = require('./config/database');
const { assignRequestsGreedy } = require('./utils/algorithm');

async function verifyAssignment() {
  try {
    console.log('🔄 Akıllı Atama doğrulanıyor...');
    
    // 1. Bekleyen talepleri çek
    const [talepler] = await pool.query(
      "SELECT TOP 10 id, enlem, boylam, oncelik FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi') ORDER BY olusturulma_tarihi ASC"
    );
    
    // 2. Müsait gönüllüleri çek
    const [gonulluler] = await pool.query(
      "SELECT id, enlem, boylam, kapasite, musaitlik_durumu FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND kapasite > 0 AND enlem IS NOT NULL"
    );
    
    console.log(`Talepler: ${talepler.length}, Gönüllüler: ${gonulluler.length}`);
    
    if (talepler.length > 0 && gonulluler.length > 0) {
      const atamalar = assignRequestsGreedy(talepler, gonulluler);
      console.log('✅ Algoritma Çalıştı! Atama sayısı:', atamalar.length);
      if (atamalar.length > 0) {
        console.log('Örnek Atama:', atamalar[0]);
      }
    } else {
      console.warn('⚠️ Test için yetersiz veri (talep veya gönüllü eksik).');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Atama Doğrulama Hatası:', err);
    process.exit(1);
  }
}

verifyAssignment();
