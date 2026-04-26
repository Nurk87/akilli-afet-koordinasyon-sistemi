const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
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

async function restore() {
  let pool;
  try {
    console.log('🚀 TOPLAM VERİ ENTEGRASYONU BAŞLATILIYOR...');
    pool = await sql.connect(config);
    console.log('✅ MSSQL Bağlantısı başarılı.');

    // 1. TEMİZLİK
    console.log('🧹 Eski veriler temizleniyor...');
    await pool.request().query('ALTER TABLE yardim_atamalari NOCHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE yardim_talepleri NOCHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE ilceler NOCHECK CONSTRAINT ALL');
    
    await pool.request().query('DELETE FROM yardim_atamalari');
    await pool.request().query('DELETE FROM yardim_talepleri');
    await pool.request().query('DELETE FROM users');
    await pool.request().query('DELETE FROM ilceler');
    await pool.request().query('DELETE FROM iller');
    
    try { await pool.request().query('DBCC CHECKIDENT (users, RESEED, 0)'); } catch(e) {}
    try { await pool.request().query('DBCC CHECKIDENT (yardim_talepleri, RESEED, 0)'); } catch(e) {}
    
    await pool.request().query('ALTER TABLE yardim_atamalari CHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE yardim_talepleri CHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE ilceler CHECK CONSTRAINT ALL');
    console.log('✅ Temizlik tamamlandı.');

    // 2. ŞEMA VE LOKASYONLAR (Öncekiyle aynı)
    console.log('🛠️ Şema ve lokasyonlar hazırlanıyor...');
    // (Şema oluşturma kodları - garantili olsun diye burada tutuyoruz)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY, ad NVARCHAR(100), soyad NVARCHAR(100),
        email NVARCHAR(100) UNIQUE NOT NULL, telefon NVARCHAR(20), sifre NVARCHAR(255) NOT NULL,
        rol NVARCHAR(20) DEFAULT 'user', durum NVARCHAR(20) DEFAULT 'aktif',
        enlem DECIMAL(10, 8) NULL, boylam DECIMAL(11, 8) NULL,
        musaitlik_durumu NVARCHAR(20) DEFAULT 'musait', kapasite INT DEFAULT 5, olusturulma_tarihi DATETIME DEFAULT GETDATE(), guncellenme_tarihi DATETIME DEFAULT GETDATE()
      )
    `);
    // ... Diğer tablolar ensure-mssql-schema.js tarafından zaten var sayılabilir ama 
    // full-restore.js'in bağımsız çalışması için burada basit kontrolleri tutalım.
    
    // İl/İlçe Seed
    const locationsContent = fs.readFileSync(path.join(__dirname, 'public', 'js', 'iller-ilceler.js'), 'utf8');
    const match = locationsContent.match(/var iller = (\{[\s\S]+\});/);
    if (match) {
      const illerObj = eval('(' + match[1] + ')');
      for (const plate in illerObj) {
        const id = parseInt(plate);
        const ad = illerObj[plate].ad;
        await pool.request()
          .input('id', sql.Int, id)
          .input('ad', sql.NVarChar(100), ad)
          .query('SET IDENTITY_INSERT iller ON; INSERT INTO iller (id, ad) VALUES (@id, @ad); SET IDENTITY_INSERT iller OFF;');
        for (const ilce of illerObj[plate].ilceler) {
          await pool.request().input('il_id', sql.Int, id).input('ad', sql.NVarChar(100), ilce)
            .query('INSERT INTO ilceler (il_id, ad) VALUES (@il_id, @ad)');
        }
      }
      console.log('✅ Lokasyon verileri yüklendi.');
    }

    // 3. KULLANICI TOPLAMA VE DEDÜPLİKASYON
    console.log('👥 Kullanıcılar toplanıyor...');
    const usersMap = new Map(); // email -> userObject

    // A. JSON Kaynağı
    if (fs.existsSync('temp_users.json')) {
      const jsonUsers = JSON.parse(fs.readFileSync('temp_users.json', 'utf8'));
      jsonUsers.forEach(u => {
        usersMap.set(u.email.toLowerCase(), {
          ad: u.ad || u.email.split('@')[0],
          soyad: u.soyad || 'Kullanıcı',
          email: u.email.toLowerCase(),
          sifre: u.sifre,
          rol: u.rol,
          telefon: u.telefon || null
        });
      });
      console.log(`- JSON'dan ${jsonUsers.length} kullanıcı eklendi.`);
    }

    // B. Root SQLite (database.db)
    if (fs.existsSync('database.db')) {
      await new Promise((resolve) => {
        const db = new sqlite3.Database('database.db');
        db.all("SELECT * FROM users", (err, rows) => {
          if (!err) {
            rows.forEach(u => {
              usersMap.set(u.email.toLowerCase(), {
                ad: u.ad,
                soyad: u.soyad,
                email: u.email.toLowerCase(),
                sifre: u.sifre,
                rol: u.rol,
                telefon: u.telefon,
                enlem: u.enlem,
                boylam: u.boylam,
                kapasite: u.kapasite,
                uzmanlik: u.uzmanlik
              });
            });
            console.log(`- database.db'den ${rows.length} kullanıcı eklendi/güncellendi.`);
          }
          db.close();
          resolve();
        });
      });
    }

    // C. Subdir SQLite (database/database.db)
    if (fs.existsSync('database/database.db')) {
      await new Promise((resolve) => {
        const db = new sqlite3.Database('database/database.db');
        db.all("SELECT * FROM users", (err, rows) => {
          if (!err) {
            rows.forEach(u => {
              if (!usersMap.has(u.email.toLowerCase())) {
                usersMap.set(u.email.toLowerCase(), {
                  ad: u.name || u.email.split('@')[0],
                  soyad: 'Kullanıcı',
                  email: u.email.toLowerCase(),
                  sifre: u.password,
                  rol: u.role || 'user'
                });
              }
            });
            console.log(`- database/database.db'den ${rows.length} kullanıcı eklendi/güncellendi.`);
          }
          db.close();
          resolve();
        });
      });
    }

    // Kullanıcıları MSSQL'e Aktar
    for (const [email, u] of usersMap) {
      await pool.request()
        .input('ad', sql.NVarChar(100), u.ad)
        .input('soyad', sql.NVarChar(100), u.soyad)
        .input('email', sql.NVarChar(100), email)
        .input('sifre', sql.NVarChar(255), u.sifre)
        .input('rol', sql.NVarChar(20), u.rol)
        .input('telefon', sql.NVarChar(20), u.telefon)
        .input('enlem', sql.Decimal(10, 8), u.enlem)
        .input('boylam', sql.Decimal(11, 8), u.boylam)
        .query(`
          INSERT INTO users (ad, soyad, email, sifre, rol, telefon, enlem, boylam)
          VALUES (@ad, @soyad, @email, @sifre, @rol, @telefon, @enlem, @boylam)
        `);
    }
    console.log(`✅ Toplam ${usersMap.size} benzersiz kullanıcı aktarıldı.`);

    // 4. YARDIM TALEPLERİ TOPLAMA
    console.log('🆘 Yardım talepleri toplanıyor...');
    let totalRequests = 0;

    // A. Root SQLite (database.db)
    if (fs.existsSync('database.db')) {
      await new Promise((resolve) => {
        const db = new sqlite3.Database('database.db');
        db.all("SELECT * FROM yardim_talepleri", async (err, rows) => {
          if (!err) {
            for (const row of rows) {
              await pool.request()
                .input('baslik', sql.NVarChar(255), row.baslik)
                .input('aciklama', sql.NVarChar(sql.MAX), row.aciklama)
                .input('il_id', sql.Int, row.il_id)
                .input('ilce_id', sql.Int, row.ilce_id)
                .input('durum', sql.NVarChar(20), row.durum)
                .input('oncelik', sql.NVarChar(20), row.oncelik)
                .input('enlem', sql.Decimal(10, 8), row.enlem)
                .input('boylam', sql.Decimal(11, 8), row.boylam)
                .input('ad_soyad', sql.NVarChar(255), row.ad_soyad || 'Anonim')
                .input('takip_kodu', sql.NVarChar(20), row.takip_kodu || Math.random().toString(36).substring(2, 10).toUpperCase())
                .query(`
                  INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, durum, oncelik, enlem, boylam, ad_soyad, takip_kodu)
                  VALUES (@baslik, @aciklama, @il_id, @ilce_id, @durum, @oncelik, @enlem, @boylam, @ad_soyad, @takip_kodu)
                `);
              totalRequests++;
            }
          }
          db.close();
          resolve();
        });
      });
    }

    // B. Subdir SQLite (database/database.db -> help_requests)
    if (fs.existsSync('database/database.db')) {
      await new Promise((resolve) => {
        const db = new sqlite3.Database('database/database.db');
        db.all("SELECT * FROM help_requests", async (err, rows) => {
          if (!err) {
            for (const row of rows) {
              // Haritalama: urgency -> oncelik, lat/lng -> enlem/boylam, status -> durum
              const oncelikMap = { 1: 'dusuk', 2: 'orta', 3: 'yuksek', 4: 'acil' };
              await pool.request()
                .input('baslik', sql.NVarChar(255), 'Acil Yardım Talebi')
                .input('aciklama', sql.NVarChar(sql.MAX), 'Veritabanı transferinden gelen talep.')
                .input('il_id', sql.Int, 34) // Varsayılan İstanbul
                .input('ilce_id', sql.Int, 1)  // Varsayılan
                .input('durum', sql.NVarChar(20), row.status === 'waiting' ? 'yeni' : row.status)
                .input('oncelik', sql.NVarChar(20), oncelikMap[row.urgency] || 'orta')
                .input('enlem', sql.Decimal(10, 8), row.lat)
                .input('boylam', sql.Decimal(11, 8), row.lng)
                .input('ad_soyad', sql.NVarChar(255), 'Anonim (DB2)')
                .input('takip_kodu', sql.NVarChar(20), 'OLD-' + Math.random().toString(36).substring(2, 6).toUpperCase())
                .query(`
                  INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, durum, oncelik, enlem, boylam, ad_soyad, takip_kodu)
                  VALUES (@baslik, @aciklama, @il_id, @ilce_id, @durum, @oncelik, @enlem, @boylam, @ad_soyad, @takip_kodu)
                `);
              totalRequests++;
            }
          }
          db.close();
          resolve();
        });
      });
    }
    console.log(`✅ Toplam ${totalRequests} yardım talebi aktarıldı.`);

    console.log('\n✨ TÜM VERİLER BAŞARIYLA ENTEGRE EDİLDİ!');
    process.exit(0);
  } catch (err) {
    console.error('❌ KRİTİK HATASI:', err);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

restore();
