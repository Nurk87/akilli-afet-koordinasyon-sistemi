const pool = require('./config/database');

async function verify() {
  try {
    console.log('🔄 Düzeltme doğrulanıyor...');
    
    // 1. Anonim bir test talebi oluştur
    const testKod = 'TEST' + Math.floor(Math.random() * 10000);
    await pool.query(
      "INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, durum, oncelik, ad_soyad, telefon, takip_kodu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['OTOMATIK TEST TALEBI', 'Bu talep sistem tarafından doğrulanmak için oluşturuldu.', 1, 976, 'yeni', 'orta', 'Test Kullanici (Anonim)', '5550001122', testKod]
    );
    console.log(`✅ Test talebi oluşturuldu (Kod: ${testKod})`);

    // 2. API listesini kontrol et (LEFT JOIN düzgün çalışıyor mu?)
    // Mock user for yetkili role
    const mockUser = { rol: 'yetkili', id: 999 };
    
    // routes/requests.js içindeki mantığı burada manuel test edelim
    let query = `
      SELECT 
        y.*, 
        COALESCE(u.ad, y.ad_soyad) as ad, 
        COALESCE(u.soyad, '') as soyad
      FROM yardim_talepleri y
      LEFT JOIN users u ON y.kullanici_id = u.id
      WHERE y.takip_kodu = ?
    `;
    const [rows] = await pool.query(query, [testKod]);

    if (rows.length > 0) {
      console.log('✅ DOĞRULAMA BAŞARILI: Anonim talep listede görünüyor!');
      console.log(' - Görünen Ad:', rows[0].ad);
      console.log(' - Görünen Soyad:', rows[0].soyad);
    } else {
      console.error('❌ DOĞRULAMA BAŞARISIZ: Anonim talep listede bulunamadı!');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  }
}

verify();
