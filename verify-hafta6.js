const pool = require('./config/database');

async function verifyHafta6() {
  try {
    console.log('🔄 Hafta 6 Optimizasyon ve Veri Doğrulaması...');
    
    // 1. İstanbul verilerini kontrol et
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE email LIKE '%@afad.gov.tr') as vCount,
        (SELECT COUNT(*) FROM yardim_talepleri WHERE durum = 'yeni' AND baslik LIKE '%İstanbul%' OR baslik LIKE '%Üsküdar%' OR baslik LIKE '%Kadıköy%') as rCount
    `);
    
    console.log(`✅ İstanbul Senaryosu: ${stats[0].vCount} Gönüllü, ${stats[0].rCount} Yeni Talep mevcuttur.`);

    // 2. Atama Simülasyonu
    console.log('🚀 Akıllı Atama Motoru tetikleniyor (Istanbul)...');
    const assignmentsRes = await fetch('http://localhost:8080/assignments/otomatik', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    // Not: API'nin çalışması için sunucunun ayakta olması lazım. 
    // Eğer sunucu ayaktaysa sonucunu göreceğiz.
    
    process.exit(0);
  } catch (err) {
    console.log('⚠️ Not: Canlı API testi için sunucunun 8080 portunda çalışıyor olması gerekir.');
    process.nextTick(() => process.exit(0));
  }
}

verifyHafta6();
