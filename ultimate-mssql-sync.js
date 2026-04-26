const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mssqlConfig = {
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

const sqlitePaths = [
    'c:/Users/Elif/OneDrive/Desktop/nisa/database.db',
    'c:/Users/Elif/OneDrive/Desktop/nisa/database/database.db',
    'c:/Users/Elif/OneDrive/Desktop/ödevler nisa/database.db',
    'c:/Users/Elif/OneDrive/Desktop/elif ödev/database.db'
];

const newPassword = 'elif';

async function runSync() {
  let pool;
  try {
    console.log('🚀 ULTIMATE MSSQL SYNC BAŞLATILIYOR...');
    pool = await sql.connect(mssqlConfig);
    console.log('✅ MSSQL Bağlantısı başarılı.');

    // 1. Şema Doğrulama (ensure-mssql-schema mantığı)
    console.log('🛠️ Şema doğrulanıyor...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ad NVARCHAR(100) NOT NULL,
        soyad NVARCHAR(100) NOT NULL,
        email NVARCHAR(100) UNIQUE NOT NULL,
        telefon NVARCHAR(20),
        sifre NVARCHAR(255) NOT NULL,
        rol NVARCHAR(20) DEFAULT 'user',
        durum NVARCHAR(20) DEFAULT 'aktif',
        enlem DECIMAL(10, 8) NULL,
        boylam DECIMAL(11, 8) NULL,
        musaitlik_durumu NVARCHAR(20) DEFAULT 'musait',
        kapasite INT DEFAULT 5,
        olusturulma_tarihi DATETIME DEFAULT GETDATE(),
        guncellenme_tarihi DATETIME DEFAULT GETDATE()
      )
      
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'iller')
      CREATE TABLE iller (id INT IDENTITY(1,1) PRIMARY KEY, ad NVARCHAR(100) NOT NULL)
      
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ilceler')
      CREATE TABLE ilceler (id INT IDENTITY(1,1) PRIMARY KEY, il_id INT NOT NULL, ad NVARCHAR(100) NOT NULL)
      
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'yardim_talepleri')
      CREATE TABLE yardim_talepleri (
        id INT IDENTITY(1,1) PRIMARY KEY,
        kullanici_id INT NULL,
        il_id INT,
        ilce_id INT,
        mahalle NVARCHAR(255),
        baslik NVARCHAR(255) NOT NULL,
        aciklama NVARCHAR(MAX),
        enlem DECIMAL(10, 8),
        boylam DECIMAL(11, 8),
        durum NVARCHAR(20) DEFAULT 'yeni',
        oncelik NVARCHAR(20) DEFAULT 'orta',
        fotograf_yolu NVARCHAR(500),
        ses_kaydi_yolu NVARCHAR(500),
        ad_soyad NVARCHAR(255),
        telefon NVARCHAR(20),
        takip_kodu NVARCHAR(20),
        acik_adres NVARCHAR(MAX),
        hesaplanan_oncelik_skoru DECIMAL(8, 2),
        olusturulma_tarihi DATETIME DEFAULT GETDATE()
      )
      
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'yardim_atamalari')
      CREATE TABLE yardim_atamalari (
        id INT IDENTITY(1,1) PRIMARY KEY,
        talep_id INT NOT NULL,
        gonullu_id INT NOT NULL,
        atama_tarihi DATETIME DEFAULT GETDATE(),
        tamamlanma_tarihi DATETIME NULL,
        durum NVARCHAR(20) DEFAULT 'atandi',
        mesafe_km DECIMAL(8, 2) NULL,
        oncelik_skoru DECIMAL(8, 2) NULL,
        atayan_yetkili_id INT NULL
      )
    `);

    // Sütun güncellemeleri
    const cols = [
        { t: 'yardim_talepleri', c: 'acik_adres', p: 'NVARCHAR(MAX) NULL' },
        { t: 'yardim_talepleri', c: 'takip_kodu', p: 'NVARCHAR(20) NULL' },
        { t: 'yardim_talepleri', c: 'ad_soyad', p: 'NVARCHAR(255) NULL' },
        { t: 'yardim_talepleri', c: 'telefon', p: 'NVARCHAR(20) NULL' },
        { t: 'users', c: 'uzmanlik', p: 'NVARCHAR(MAX) NULL' }
    ];
    for (const col of cols) {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('${col.t}') AND name = '${col.c}')
            ALTER TABLE ${col.t} ADD ${col.c} ${col.p}
        `);
    }

    // 2. Temizlik
    console.log('🧹 Mevcut veriler temizleniyor...');
    await pool.request().query('DELETE FROM yardim_atamalari');
    await pool.request().query('DELETE FROM yardim_talepleri');
    await pool.request().query('DELETE FROM users');

    const users = new Map(); // email -> object
    const requests = [];

    // 3. SQLite Taraması
    for (const path of sqlitePaths) {
        if (!fs.existsSync(path)) {
            console.log(`⚠️ Dosya bulunamadı: ${path}`);
            continue;
        }
        console.log(`📂 SQLite okunuyor: ${path}`);
        await new Promise((resolve) => {
            const db = new sqlite3.Database(path);
            db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables) => {
                if (err || !tables) return resolve();
                
                const tableNames = tables.map(t => t.name);
                
                // Users / Volunteers
                if (tableNames.includes('users')) {
                    const rows = await new Promise(r => db.all("SELECT * FROM users", (e, d) => r(d || [])));
                    rows.forEach(u => {
                        const email = (u.email || u.username || '').toLowerCase();
                        if (email && !users.has(email)) {
                            users.set(email, {
                                ad: u.ad || u.name || 'Kullanıcı',
                                soyad: u.soyad || 'Sistem',
                                email: email,
                                rol: u.rol || u.role || 'user',
                                telefon: u.telefon || u.phone || ''
                            });
                        }
                    });
                }

                // Yardim Talepleri / Help Requests
                const reqTable = tableNames.includes('yardim_talepleri') ? 'yardim_talepleri' : (tableNames.includes('help_requests') ? 'help_requests' : null);
                if (reqTable) {
                    const rows = await new Promise(r => db.all(`SELECT * FROM ${reqTable}`, (e, d) => r(d || [])));
                    rows.forEach(r => {
                        requests.push({
                            baslik: r.baslik || r.title || 'Başlıksız Talep',
                            aciklama: r.aciklama || r.description || r.details || '',
                            il_id: r.il_id || 34,
                            ilce_id: r.ilce_id || 1,
                            enlem: r.enlem || r.lat || 41.0,
                            boylam: r.boylam || r.lng || 28.9,
                            oncelik: r.oncelik || r.priority || 'orta',
                            durum: 'yeni',
                            ad_soyad: r.ad_soyad || r.name || 'Anonim',
                            telefon: r.telefon || r.phone || '',
                            takip_kodu: r.takip_kodu || Math.random().toString(36).substring(2, 8).toUpperCase()
                        });
                    });
                }
                db.close();
                resolve();
            });
        });
    }

    // 4. JSON Taraması
    if (fs.existsSync('temp_users.json')) {
        console.log('📂 JSON okunuyor: temp_users.json');
        const jsonData = JSON.parse(fs.readFileSync('temp_users.json', 'utf8'));
        jsonData.forEach(u => {
            const email = (u.email || '').toLowerCase();
            if (email && !users.has(email)) {
                users.set(email, {
                    ad: u.ad || 'Kullanıcı',
                    soyad: u.soyad || 'JSON',
                    email: email,
                    rol: u.rol || 'user'
                });
            }
        });
    }

    // 5. Kritik Kullanıcılar
    const critical = [
        { email: 'nisa.7137k@gmail.com', rol: 'yetkili' },
        { email: 'efesari@gmail.com', rol: 'yetkili' }
    ];
    critical.forEach(c => {
        if (!users.has(c.email)) {
            users.set(c.email, { ad: c.email.split('@')[0], soyad: 'Sistem', email: c.email, rol: c.rol });
        } else {
            users.get(c.email).rol = c.rol;
        }
    });

    // 6. MSSQL Aktarım
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`👤 ${users.size} kullanıcı aktarılıyor...`);
    for (const [email, u] of users) {
        await pool.request()
            .input('ad', sql.NVarChar(100), u.ad)
            .input('soyad', sql.NVarChar(100), u.soyad)
            .input('email', sql.NVarChar(100), email)
            .input('telefon', sql.NVarChar(20), u.telefon || null)
            .input('sifre', sql.NVarChar(255), hashedPassword)
            .input('rol', sql.NVarChar(20), u.rol)
            .query(`INSERT INTO users (ad, soyad, email, telefon, sifre, rol, durum) VALUES (@ad, @soyad, @email, @telefon, @sifre, @rol, 'aktif')`);
    }

    console.log(`🆘 ${requests.length} yardım talebi aktarılıyor...`);
    for (const r of requests) {
        await pool.request()
            .input('baslik', sql.NVarChar(255), r.baslik)
            .input('aciklama', sql.NVarChar(sql.MAX), r.aciklama)
            .input('il_id', sql.Int, r.il_id)
            .input('ilce_id', sql.Int, r.ilce_id)
            .input('enlem', sql.Decimal(10, 8), r.enlem)
            .input('boylam', sql.Decimal(11, 8), r.boylam)
            .input('oncelik', sql.NVarChar(20), r.oncelik)
            .input('durum', sql.NVarChar(20), r.durum)
            .input('ad_soyad', sql.NVarChar(255), r.ad_soyad)
            .input('telefon', sql.NVarChar(20), r.telefon)
            .input('tk', sql.NVarChar(20), r.takip_kodu)
            .query(`INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, enlem, boylam, oncelik, durum, ad_soyad, telefon, takip_kodu) 
                    VALUES (@baslik, @aciklama, @il_id, @ilce_id, @enlem, @boylam, @oncelik, @durum, @ad_soyad, @telefon, @tk)`);
    }

    console.log('\n✨ SENKRONİZASYON TAMAMLANDI!');
    console.log(`🔑 Giriş: nisa.7137k@gmail.com / ${newPassword}`);
    console.log(`🔑 Giriş: efesari@gmail.com / ${newPassword}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

runSync();
