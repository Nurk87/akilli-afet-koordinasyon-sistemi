const sql = require('mssql');
const bcrypt = require('bcryptjs');
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

async function fix() {
  let pool;
  try {
    console.log('🔐 ŞİFRE DÜZELTME İŞLEMİ BAŞLATILIYOR...');
    pool = await sql.connect(config);
    console.log('✅ MSSQL Bağlantısı başarılı.');

    const users = await pool.request().query('SELECT id, email, sifre FROM users');
    console.log(`📊 Toplam ${users.recordset.length} kullanıcı kontrol ediliyor...`);

    let fixCount = 0;
    for (const user of users.recordset) {
      // Bcrypt hashleri genellikle $2a$ veya $2b$ ile başlar ve 60 karakterdir
      const isHashed = user.sifre.startsWith('$2a$') || user.sifre.startsWith('$2b$');
      
      if (!isHashed) {
        console.log(`🛠️ Düzeltiliyor: ${user.email} (Düz metin şifre tespit edildi)`);
        const hashedPassword = await bcrypt.hash(user.sifre, 10);
        
        await pool.request()
          .input('id', sql.Int, user.id)
          .input('hashed', sql.NVarChar(255), hashedPassword)
          .query('UPDATE users SET sifre = @hashed WHERE id = @id');
        
        fixCount++;
      }
    }

    console.log(`\n✨ İŞLEM TAMAMLANDI!`);
    console.log(`✅ ${fixCount} kullanıcının şifresi güvenli hale getirildi.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

fix();
