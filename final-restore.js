const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
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

const newPassword = 'elif';

async function restore() {
  let pool;
  try {
    console.log('🚀 BAŞTAN SONA VERİ RESTORASYONU BAŞLATILIYOR...');
    pool = await sql.connect(config);
    console.log('✅ MSSQL Bağlantısı başarılı.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 1. Temizlik
    console.log('🧹 Eski veriler temizleniyor...');
    await pool.request().query('DELETE FROM yardim_atamalari');
    await pool.request().query('DELETE FROM yardim_talepleri');
    await pool.request().query('DELETE FROM users');
    console.log('✅ Veritabanı temizlendi.');

    const users = new Map(); // Email -> User object
    const requests = [];

    // 2. JSON'dan Kullanıcıları Oku (temp_users.json)
    if (fs.existsSync('temp_users.json')) {
      console.log('📂 temp_users.json okunuyor...');
      const jsonData = JSON.parse(fs.readFileSync('temp_users.json', 'utf8'));
      jsonData.forEach(u => {
        users.set(u.email.toLowerCase(), {
          ad: u.ad || 'Kullanıcı',
          soyad: u.soyad || 'Test',
          email: u.email.toLowerCase(),
          rol: u.rol || 'user'
        });
      });
    }

    // 3. SQLite'dan Verileri Oku (database.db)
    const sqliteFiles = ['database.db', 'database/database.db'];
    for (const src of sqliteFiles) {
      if (!fs.existsSync(src)) continue;
      console.log(`📂 SQLite [${src}] okunuyor...`);
      
      await new Promise((resolve) => {
        const db = new sqlite3.Database(src);
        db.all("SELECT * FROM users", (err, rows) => {
          if (!err && rows) {
            rows.forEach(r => {
              const email = (r.email || '').toLowerCase();
              if (email && !users.has(email)) {
                users.set(email, {
                  ad: r.ad || r.name || 'Kullanıcı',
                  soyad: r.soyad || 'SQLite',
                  email: email,
                  rol: r.rol || r.role || 'gonullu'
                });
              }
            });
          }
          
          const reqTable = src === 'database.db' ? 'yardim_talepleri' : 'help_requests';
          db.all(`SELECT * FROM ${reqTable}`, (err, rows) => {
            if (!err && rows) {
              rows.forEach(r => {
                requests.push({
                   baslik: r.baslik || r.title || 'Başlıksız Talep',
                   aciklama: r.aciklama || r.description || r.details || '',
                   il_id: r.il_id || 34, // Varsayılan İstanbul
                   ilce_id: r.ilce_id || 1,
                   enlem: r.enlem || r.lat || 41.0,
                   boylam: r.boylam || r.lng || 28.9,
                   oncelik: r.oncelik || r.priority || 'orta',
                   durum: 'yeni',
                   ad_soyad: r.ad_soyad || r.name || 'Anonim',
                   telefon: r.telefon || r.phone || ''
                });
              });
            }
            db.close();
            resolve();
          });
        });
      });
    }

    // 4. Kritik Kullanıcıları Garanti Altına Al
    const criticalUsers = [
      { email: 'nisa.7137k@gmail.com', rol: 'yetkili' },
      { email: 'efesari@gmail.com', rol: 'yetkili' }
    ];
    criticalUsers.forEach(cu => {
      if (!users.has(cu.email)) {
        users.set(cu.email, {
          ad: cu.email.split('@')[0],
          soyad: 'Sistem',
          email: cu.email,
          rol: cu.rol
        });
      } else {
        users.get(cu.email).rol = cu.rol; // Rolü yetkili yap
      }
    });

    // 5. MSSQL'e Aktar (Kullanıcılar)
    console.log(`👤 ${users.size} kullanıcı aktarılıyor... şifre: ${newPassword}`);
    for (const [email, u] of users) {
      await pool.request()
        .input('ad', sql.NVarChar(100), u.ad)
        .input('soyad', sql.NVarChar(100), u.soyad)
        .input('email', sql.NVarChar(100), email)
        .input('sifre', sql.NVarChar(255), hashedPassword)
        .input('rol', sql.NVarChar(20), u.rol)
        .query(`INSERT INTO users (ad, soyad, email, sifre, rol, durum) VALUES (@ad, @soyad, @email, @sifre, @rol, 'aktif')`);
    }

    // 6. MSSQL'e Aktar (Talepler)
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
        .query(`INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, enlem, boylam, oncelik, durum, ad_soyad, telefon) 
                VALUES (@baslik, @aciklama, @il_id, @ilce_id, @enlem, @boylam, @oncelik, @durum, @ad_soyad, @telefon)`);
    }

    console.log('\n✨ SİSTEM TAMAMEN RESTORE EDİLDİ!');
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

restore();
