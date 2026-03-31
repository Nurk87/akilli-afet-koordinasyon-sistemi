const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    soyad TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefon TEXT,
    sifre TEXT NOT NULL,
    rol TEXT DEFAULT 'user',
    durum TEXT DEFAULT 'aktif',
    enlem REAL,
    boylam REAL,
    musaitlik_durumu TEXT DEFAULT 'musait',
    kapasite INTEGER DEFAULT 1,
    uzmanlik TEXT,
    olusturulma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    guncellenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS iller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    kod TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ilceler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    il_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT,
    FOREIGN KEY (il_id) REFERENCES iller(id)
  )`,
  `CREATE TABLE IF NOT EXISTS yardim_talepleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER NOT NULL,
    il_id INTEGER NOT NULL,
    ilce_id INTEGER NOT NULL,
    enlem REAL,
    boylam REAL,
    baslik TEXT NOT NULL,
    aciklama TEXT,
    durum TEXT DEFAULT 'yeni',
    oncelik TEXT DEFAULT 'orta',
    fotograf_yolu TEXT,
    olusturulma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    guncellenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kullanici_id) REFERENCES users(id),
    FOREIGN KEY (il_id) REFERENCES iller(id),
    FOREIGN KEY (ilce_id) REFERENCES ilceler(id)
  )`,
  `CREATE TABLE IF NOT EXISTS yardim_atamalari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_id INTEGER NOT NULL,
    gonullu_id INTEGER NOT NULL,
    mesafe_km REAL,
    oncelik_skoru REAL,
    durum TEXT DEFAULT 'atandi',
    olusturulma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (talep_id) REFERENCES yardim_talepleri(id),
    FOREIGN KEY (gonullu_id) REFERENCES users(id)
  )`
];

db.serialize(() => {
  tables.forEach(sql => {
    db.run(sql, (err) => {
      if (err) console.error('Tablo oluşturma hatası:', err.message);
    });
  });
  
  // Örnek iller ve ilçeler (eğer boşsa)
  db.get("SELECT COUNT(*) as count FROM iller", (err, row) => {
    if (err) {
      // Tablo henüz yoksa (hata durumunda) devam et
      return finishInit();
    }
    if (row && row.count === 0) {
      db.run("INSERT INTO iller (ad) VALUES ('İstanbul'), ('Ankara'), ('İzmir')");
      db.run("INSERT INTO ilceler (il_id, ad) VALUES (1, 'Kadıköy'), (1, 'Beşiktaş'), (2, 'Çankaya')");
      console.log('✅ Örnek yerleşim verileri eklendi.');
    }
    finishInit();
  });
});

function finishInit() {
  db.close((err) => {
    if (err) console.error('Veritabanı kapatma hatası:', err.message);
    else console.log('✅ SQLite şeması hazır.');
  });
}
