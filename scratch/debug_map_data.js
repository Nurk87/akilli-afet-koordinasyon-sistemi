const pool = require('../config/database');

async function checkData() {
  try {
    const [requests] = await pool.query("SELECT COUNT(*) as count FROM yardim_talepleri");
    console.log("TOPLAM TALEP SAYISI:", requests[0].count);
    
    const [sample] = await pool.query("SELECT TOP 5 id, enlem, boylam, baslik, oncelik FROM yardim_talepleri");
    console.log("ÖRNEK VERİLER:", JSON.stringify(sample, null, 2));
    
    const [volunteers] = await pool.query("SELECT COUNT(*) as count FROM users WHERE rol = 'gonullu'");
    console.log("TOPLAM GÖNÜLLÜ SAYISI:", volunteers[0].count);
    
    process.exit(0);
  } catch (err) {
    console.error("HATA:", err);
    process.exit(1);
  }
}

checkData();
