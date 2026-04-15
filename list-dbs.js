const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: 'master', // Master'a bağlanıp listeyi alalım
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  try {
    console.log('🔄 Master veritabanına bağlanılıyor...');
    const pool = await sql.connect(config);
    console.log('✅ Bağlantı başarılı.');
    
    const result = await pool.request().query('SELECT name FROM sys.databases');
    console.log('📡 Mevcut veritabanları:');
    result.recordset.forEach(db => console.log(` - ${db.name}`));
    
    await pool.close();
  } catch (err) {
    console.error('❌ HATA:', err.message);
  }
}

check();
