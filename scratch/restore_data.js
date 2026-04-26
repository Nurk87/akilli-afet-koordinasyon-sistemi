const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const sql = require('mssql');
require('dotenv').config();

const mssqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function restore() {
  let mssqlPool;
  try {
    console.log('🔄 Veritabanlarına bağlanılıyor...');
    mssqlPool = await sql.connect(mssqlConfig);
    const sqliteDb = new sqlite3.Database('database.db');
    
    console.log('📦 Kaynak veriler okunuyor...');
    
    // 1. Load users from JSON
    const jsonUsers = JSON.parse(fs.readFileSync('temp_users.json', 'utf8'));
    
    // 2. Load data from SQLite
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM yardim_talepleri", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const sqliteUsers = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM users", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Bulunan veriler: JSON Users: ${jsonUsers.length}, SQLite Users: ${sqliteUsers.length}, SQLite Talepler: ${sqliteData.length}`);

    // --- USER MIGRATION ---
    console.log('👤 Kullanıcılar aktarılıyor...');
    
    // Merge users (SQLite users might have more info than JSON)
    const userMap = new Map();
    
    // Process JSON users (Basic info)
    jsonUsers.forEach(u => {
      userMap.set(u.email.toLowerCase(), {
        email: u.email.toLowerCase(),
        sifre: u.sifre,
        rol: u.rol,
        ad: u.email.split('@')[0],
        soyad: 'Sistem',
        telefon: '',
        enlem: 41.0082,
        boylam: 28.9784,
        kapasite: 5
      });
    });
    
    // Enrich with SQLite users info
    sqliteUsers.forEach(u => {
      const email = u.email.toLowerCase();
      if (userMap.has(email)) {
        const existing = userMap.get(email);
        userMap.set(email, {
          ...existing,
          ad: u.ad || existing.ad,
          soyad: u.soyad || existing.soyad,
          telefon: u.telefon || existing.telefon,
          enlem: u.enlem || existing.enlem,
          boylam: u.boylam || existing.boylam,
          kapasite: u.kapasite || existing.kapasite,
          uzmanlik: u.uzmanlik || existing.uzmanlik
        });
      } else {
        userMap.set(email, {
          email: email,
          sifre: u.sifre,
          rol: u.rol,
          ad: u.ad || email.split('@')[0],
          soyad: u.soyad || 'Sistem',
          telefon: u.telefon || '',
          enlem: u.enlem || 41.0082,
          boylam: u.boylam || 28.9784,
          kapasite: u.kapasite || 5,
          uzmanlik: u.uzmanlik || ''
        });
      }
    });

    for (const [email, u] of userMap) {
      if (email === 'admin@test.com') continue; // Admini geçelim, zaten var.
      
      try {
        await mssqlPool.request()
          .input('ad', sql.NVarChar, u.ad)
          .input('soyad', sql.NVarChar, u.soyad)
          .input('email', sql.NVarChar, u.email)
          .input('sifre', sql.NVarChar, u.sifre)
          .input('rol', sql.NVarChar, u.rol)
          .input('telefon', sql.NVarChar, u.telefon)
          .input('enlem', sql.Decimal(10, 8), u.enlem)
          .input('boylam', sql.Decimal(11, 8), u.boylam)
          .input('kapasite', sql.Int, u.kapasite)
          .input('uzmanlik', sql.NVarChar, u.uzmanlik || '')
          .query(`IF NOT EXISTS (SELECT 1 FROM users WHERE email = @email)
                  INSERT INTO users (ad, soyad, email, sifre, rol, telefon, enlem, boylam, kapasite, uzmanlik)
                  VALUES (@ad, @soyad, @email, @sifre, @rol, @telefon, @enlem, @boylam, @kapasite, @uzmanlik)`);
        console.log(`✅ Aktarıldı: ${email}`);
      } catch (err) {
        if (!err.message.includes('Violation of UNIQUE KEY')) {
            console.error(`❌ Hata (${email}):`, err.message);
        }
      }
    }

    // --- REQUESTS MIGRATION ---
    console.log('🆘 Yardım talepleri aktarılıyor...');
    for (const r of sqliteData) {
      try {
        await mssqlPool.request()
          .input('il_id', sql.Int, r.il_id)
          .input('ilce_id', sql.Int, r.ilce_id)
          .input('baslik', sql.NVarChar, r.baslik)
          .input('aciklama', sql.NVarChar, r.aciklama)
          .input('enlem', sql.Decimal(10, 8), r.enlem)
          .input('boylam', sql.Decimal(11, 8), r.boylam)
          .input('durum', sql.NVarChar, r.durum)
          .input('oncelik', sql.NVarChar, r.oncelik)
          .input('fotograf', sql.NVarChar, r.fotograf_yolu)
          .input('ses', sql.NVarChar, r.ses_kaydi_yolu)
          .input('ad_soyad', sql.NVarChar, r.ad_soyad)
          .input('telefon', sql.NVarChar, r.telefon)
          .input('takip', sql.NVarChar, r.takip_kodu)
          .query(`INSERT INTO yardim_talepleri (il_id, ilce_id, baslik, aciklama, enlem, boylam, durum, oncelik, fotograf_yolu, ses_kaydi_yolu, ad_soyad, telefon, takip_kodu)
                  VALUES (@il_id, @ilce_id, @baslik, @aciklama, @enlem, @boylam, @durum, @oncelik, @fotograf, @ses, @ad_soyad, @telefon, @takip)`);
        console.log(`✅ Talep aktarıldı: ${r.baslik}`);
      } catch (err) {
        console.error(`❌ Talep hatası (${r.baslik}):`, err.message);
      }
    }

    console.log('\n✨ TÜM VERİLER BAŞARIYLA MSSQL\'E TAŞINDI!');
    sqliteDb.close();
    await mssqlPool.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ KRİTİK HATA:', err);
    process.exit(1);
  }
}

restore();
