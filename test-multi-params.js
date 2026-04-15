const pool = require('./config/database');

async function testMultiParams() {
  try {
    console.log('🔄 Çoklu parametre testi başlatılıyor...');
    
    // 3 parametreli bir test sorgusu
    const query = "SELECT TOP 1 id, ad FROM iller WHERE id = ? OR id = ? OR id = ?";
    const params = [1, 2, 3];
    
    console.log('Sorgu gönderiliyor...');
    const [rows] = await pool.query(query, params);
    
    console.log('✅ Test Başarılı! Dönen satır sayısı:', rows.length);
    if (rows.length > 0) {
      console.log('Örnek veri:', rows[0]);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Çoklu Parametre Hatası:', err.message);
    process.exit(1);
  }
}

testMultiParams();
