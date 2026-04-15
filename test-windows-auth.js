const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'afet_koordinasyon',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    integratedSecurity: true // Windows Authentication denemesi
  }
};

async function test() {
  try {
    console.log('🔄 Windows Authentication (Trusted Connection) deneniyor...');
    const pool = await sql.connect(config);
    console.log('✅ BAŞARILI: Windows Authentication ile bağlandık!');
    await pool.close();
  } catch (err) {
    console.error('❌ HATA:', err.message);
  }
}

test();
