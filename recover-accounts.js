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

const newPassword = 'Afet1234!';
const authorizedEmails = [
  'admin@test.com',
  'nisa.7137k@gmail.com',
  'nkpodyumsahneee@gmail.com',
  'testadmin@test.com',
  'efesari@gmail.com' // Bu hem kurtarılacak hem de gerekirse oluşturulacak
];

async function recover() {
  let pool;
  try {
    console.log('🚀 HESAP KURTARMA VE ŞİFRE SIFIRLAMA BAŞLATILIYOR...');
    pool = await sql.connect(config);
    console.log('✅ MSSQL Bağlantısı başarılı.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    for (const email of authorizedEmails) {
      console.log(`\n🔍 Kontrol ediliyor: ${email}`);
      
      const res = await pool.request()
        .input('email', sql.NVarChar(100), email)
        .query('SELECT id, rol FROM users WHERE email = @email');

      if (res.recordset.length > 0) {
        // Mevcut kullanıcıyı güncelle
        const user = res.recordset[0];
        console.log(`🛠️ Şifre sıfırlanıyor: ${email} (Mevcut rol: ${user.rol})`);
        
        await pool.request()
          .input('id', sql.Int, user.id)
          .input('hashed', sql.NVarChar(255), hashedPassword)
          .query('UPDATE users SET sifre = @hashed WHERE id = @id');
        
        console.log(`✅ ${email} şifresi başarıyla sıfırlandı.`);
      } else {
        // Eksik kullanıcıyı oluştur
        console.log(`✨ Yeni yetkili oluşturuluyor: ${email}`);
        
        await pool.request()
          .input('ad', sql.NVarChar(100), 'Eski')
          .input('soyad', sql.NVarChar(100), 'Kullanıcı')
          .input('email', sql.NVarChar(100), email)
          .input('sifre', sql.NVarChar(255), hashedPassword)
          .input('rol', sql.NVarChar(20), 'yetkili')
          .query(`
            INSERT INTO users (ad, soyad, email, sifre, rol, durum)
            VALUES (@ad, @soyad, @email, @sifre, @rol, 'aktif')
          `);
        
        console.log(`✅ ${email} başarıyla oluşturuldu ve yetkilendirildi.`);
      }
    }

    console.log('\n--- İŞLEM TAMAMLANDI ---');
    console.log(`🔑 TÜM YETKİLİ HESAPLAR İÇİN ŞİFRE: ${newPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

recover();
