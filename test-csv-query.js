const pool = require('./config/database');

async function testCsvQuery() {
  try {
    console.log('🔄 CSV Sorgusu doğrulanıyor...');
    
    // routes/dashboard.js içindeki güncellenmiş sorgu
    const query = `
      SELECT 
        y.id, y.baslik, y.durum, y.oncelik, 
        (i.ad + ' / ' + ilc.ad) as adres,
        y.olusturulma_tarihi,
        (SELECT TOP 1 tamamlanma_tarihi FROM yardim_atamalari WITH (NOLOCK) WHERE talep_id = y.id AND durum = 'tamamlandi') as tamam_tarih
      FROM yardim_talepleri y WITH (NOLOCK)
      LEFT JOIN iller i WITH (NOLOCK) ON y.il_id = i.id
      LEFT JOIN ilceler ilc WITH (NOLOCK) ON y.ilce_id = ilc.id
    `;
    
    const [rows] = await pool.query(query);
    
    console.log('✅ Sorgu başarılı! Toplam satır:', rows.length);
    if (rows.length > 0) {
      console.log('İlk satır verisi (Adres kontrolü):', {
        id: rows[0].id,
        baslik: rows[0].baslik,
        adres: rows[0].adres
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ CSV Sorgu Hatası:', err.message);
    process.exit(1);
  }
}

testCsvQuery();
