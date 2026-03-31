const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function fixDatabase() {
  try {
    console.log('🔄 Veritabanı bağlantısı kuruluyor...');
    let pool = await sql.connect(config);
    console.log('✅ Bağlantı başarılı.');

    const sqlPath = path.join(__dirname, 'migrations', 'fix_encoding.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ HATA: migrations/fix_encoding.sql dosyası bulunamadı.');
      return;
    }

    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // MSSQL driver'ı GO komutunu desteklemez, içeriği parçalara ayırıp çalıştıralım
    const batches = sqlContent.split(/\sGO\s/i);

    console.log(`🚀 ${batches.length} komut bloğu çalıştırılıyor...`);

    for (let batch of batches) {
      if (batch.trim()) {
        await pool.query(batch);
      }
    }

    console.log('✨ TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!');
    console.log('Artık Türkçe karakterler doğru görünüyor olmalı.');
    
    await pool.close();
  } catch (err) {
    console.error('❌ HATA:', err.message);
    if (err.message.includes('Login failed')) {
      console.log('Lütfen .env dosyasındaki DB_USER ve DB_PASSWORD bilgilerini kontrol edin.');
    }
  }
}

fixDatabase();
