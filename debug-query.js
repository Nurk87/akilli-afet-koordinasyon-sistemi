const pool = require('./config/database');

async function testQuery() {
  try {
    console.log('🔄 Sorgu testi başlatılıyor...');
    console.time('FullQuery');
    
    // routes/requests.js'deki sorguyu aynen kopyalıyoruz
    const query = `
      SELECT 
        y.*, 
        COALESCE(u.ad, y.ad_soyad) as ad, 
        COALESCE(u.soyad, '') as soyad, 
        COALESCE(y.telefon, u.telefon) as telefon,
        i.ad as il_adi, 
        ilc.ad as ilce_adi,
        ya.gonullu_id,
        ya.durum as atama_durumu,
        gv.ad as gonullu_ad, 
        gv.soyad as gonullu_soyad,
        gv.telefon as gonullu_telefon
      FROM yardim_talepleri y
      LEFT JOIN users u ON y.kullanici_id = u.id
      LEFT JOIN iller i ON y.il_id = i.id
      LEFT JOIN ilceler ilc ON y.ilce_id = ilc.id
      LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id AND ya.durum != 'iptal'
      LEFT JOIN users gv ON ya.gonullu_id = gv.id
      ORDER BY y.olusturulma_tarihi DESC
    `;
    
    const [rows] = await pool.query(query);
    console.timeEnd('FullQuery');
    console.log(`✅ Sorgu tamamlandı. Satır sayısı: ${rows.length}`);
    if (rows.length > 0) {
      console.log('İlk satır örneği:', {
        baslik: rows[0].baslik,
        ad: rows[0].ad,
        il: rows[0].il_adi
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Sorgu Hatası:', err);
    process.exit(1);
  }
}

testQuery();
