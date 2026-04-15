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

async function seed() {
  try {
    console.log('🔄 MSSQL bağlanılıyor...');
    const pool = await sql.connect(config);
    console.log('✅ Bağlantı başarılı!');

    const content = fs.readFileSync(path.join(__dirname, 'public', 'js', 'iller-ilceler.js'), 'utf8');
    const match = content.match(/var iller = (\{[\s\S]+\});/);
    if (!match) throw new Error('iller-ilceler.js parse edilemedi!');
    const illerObj = eval('(' + match[1] + ')');

    console.log('🗑️  Mevcut veriler temizleniyor...');
    await pool.request().query('ALTER TABLE ilceler NOCHECK CONSTRAINT ALL');
    await pool.request().query('DELETE FROM ilceler');
    await pool.request().query('DELETE FROM iller');
    await pool.request().query('ALTER TABLE ilceler CHECK CONSTRAINT ALL');

    console.log('📍 81 il ekleniyor...');
    // IDENTITY_INSERT aynı batch içinde olmalı
    for (const plate in illerObj) {
      const id = parseInt(plate);
      const ad = illerObj[plate].ad;
      await pool.request()
        .input('id', sql.Int, id)
        .input('ad', sql.NVarChar(100), ad)
        .query('SET IDENTITY_INSERT iller ON; INSERT INTO iller (id, ad) VALUES (@id, @ad); SET IDENTITY_INSERT iller OFF;');
    }
    console.log('✅ 81 il eklendi.');

    console.log('📍 İlçeler ekleniyor...');
    let ilceCount = 0;
    // İlçeleri hızlandırmak için batch/transaction kullanılabilir ama şimdilik tek tek devam edelim
    for (const plate in illerObj) {
      const il_id = parseInt(plate);
      for (const ilce of illerObj[plate].ilceler) {
        await pool.request()
          .input('il_id', sql.Int, il_id)
          .input('ad', sql.NVarChar(100), ilce)
          .query('INSERT INTO ilceler (il_id, ad) VALUES (@il_id, @ad)');
        ilceCount++;
      }
      if (il_id % 10 === 0) console.log(`... ${il_id} nolu ile kadar olan ilçeler yüklendi.`);
    }
    console.log(`✅ ${ilceCount} ilçe eklendi.`);
    
    console.log('\n🎉 MSSQL seeding tamamlandı!');
    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  }
}

seed();
