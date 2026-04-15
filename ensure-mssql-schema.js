const sql = require('mssql');
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

async function sync() {
  try {
    console.log('🔄 MSSQL Bağlantısı kuruluyor...');
    const pool = await sql.connect(config);
    console.log('✅ Bağlantı başarılı.');

    // 1. Tablo Kontrolleri ve Oluşturma
    console.log('🛠️ Tablo yapıları kontrol ediliyor...');

    // Users
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
    `);

    // Iller
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'iller')
      CREATE TABLE iller (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ad NVARCHAR(100) NOT NULL
      )
    `);

    // Ilceler
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ilceler')
      CREATE TABLE ilceler (
        id INT IDENTITY(1,1) PRIMARY KEY,
        il_id INT NOT NULL,
        ad NVARCHAR(100) NOT NULL
      )
    `);

    // Yardim Talepleri
    await pool.request().query(`
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
        olusturulma_tarihi DATETIME DEFAULT GETDATE()
      )
    `);

    // Yardim Atamalari
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'yardim_atamalari')
      CREATE TABLE yardim_atamalari (
        id INT IDENTITY(1,1) PRIMARY KEY,
        talep_id INT NOT NULL,
        gonullu_id INT NOT NULL,
        atama_tarihi DATETIME DEFAULT GETDATE(),
        tamamlanma_tarihi DATETIME NULL,
        durum NVARCHAR(20) DEFAULT 'atandi',
        mesafe_km DECIMAL(8, 2) NULL,
        oncelik_skoru DECIMAL(8, 2) NULL
      )
    `);

    // 2. Eksik Sütun Kontrolleri (Migration)
    console.log('📝 Eksik sütunlar kontrol ediliyor...');
    
    const migrations = [
      { table: 'yardim_talepleri', column: 'takip_kodu', type: 'NVARCHAR(20) NULL' },
      { table: 'yardim_talepleri', column: 'ad_soyad', type: 'NVARCHAR(255) NULL' },
      { table: 'yardim_talepleri', column: 'telefon', type: 'NVARCHAR(20) NULL' },
      { table: 'yardim_talepleri', column: 'fotograf_yolu', type: 'NVARCHAR(MAX) NULL' },
      { table: 'yardim_talepleri', column: 'ses_kaydi_yolu', type: 'NVARCHAR(MAX) NULL' },
      { table: 'yardim_talepleri', column: 'acik_adres', type: 'NVARCHAR(MAX) NULL' },
      { table: 'yardim_talepleri', column: 'hesaplanan_oncelik_skoru', type: 'DECIMAL(8, 2) NULL' },
      { table: 'yardim_atamalari', column: 'tamamlanma_tarihi', type: 'DATETIME NULL' },
      { table: 'yardim_atamalari', column: 'atayan_yetkili_id', type: 'INT NULL' },
      { table: 'yardim_atamalari', column: 'mesafe_km', type: 'DECIMAL(8, 2) NULL' },
      { table: 'yardim_atamalari', column: 'oncelik_skoru', type: 'DECIMAL(8, 2) NULL' },
      { table: 'users', column: 'enlem', type: 'DECIMAL(10, 8) NULL' },
      { table: 'users', column: 'boylam', type: 'DECIMAL(11, 8) NULL' },
      { table: 'users', column: 'musaitlik_durumu', type: "NVARCHAR(20) DEFAULT 'musait'" },
      { table: 'users', column: 'kapasite', type: 'INT DEFAULT 5' },
      { table: 'users', column: 'uzmanlik', type: 'NVARCHAR(MAX) NULL' }
    ];

    for (const m of migrations) {
      const checkCol = await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('${m.table}') AND name = '${m.column}')
        ALTER TABLE ${m.table} ADD ${m.column} ${m.type}
      `);
    }

    // 2.2 Bonus: Ensure kullanici_id is NULLABLE (important for anonymous requests)
    console.log('🔓 kullanici_id nullability ayarlanıyor...');
    try {
      // Find and drop FK constraint if it exists and column is NOT NULL
      await pool.request().query(`
        DECLARE @ConstraintName nvarchar(200)
        SELECT @ConstraintName = OBJECT_NAME(f.object_id)
        FROM sys.foreign_keys AS f
        INNER JOIN sys.foreign_key_columns AS fc ON f.object_id = fc.constraint_object_id
        WHERE OBJECT_NAME(f.parent_object_id) = 'yardim_talepleri' 
        AND COL_NAME(fc.parent_object_id, fc.parent_column_id) = 'kullanici_id'

        IF @ConstraintName IS NOT NULL
        BEGIN
            EXEC('ALTER TABLE yardim_talepleri DROP CONSTRAINT ' + @ConstraintName)
            PRINT 'Dropped constraint ' + @ConstraintName
        END
        
        ALTER TABLE yardim_talepleri ALTER COLUMN kullanici_id INT NULL
      `);
      console.log('✅ kullanici_id artık boş bırakılabilir.');
    } catch (e) {
      console.warn('⚠️ kullanici_id güncellenirken uyarı:', e.message);
    }

    // 3. Veri Kontrolü (Seeding)
    const ilCount = await pool.request().query('SELECT COUNT(*) as count FROM iller');
    if (ilCount.recordset[0].count === 0) {
      console.log('📍 Şehir verileri eksik, seed işlemi başlatılıyor...');
      // Bu noktada mevcut seed-mssql.js'i çağırmak veya logic'i buraya taşımak mantıklı.
      // Şimdilik sadece uyarı verelim veya basit bir insert yapalım.
      await pool.request().query("INSERT INTO iller (ad) VALUES (N'İstanbul'), (N'Ankara'), (N'İzmir')");
    }

    console.log('✨ VERİTABANI SENKRONİZASYONU BAŞARIYLA TAMAMLANDI!');
    process.exit(0);
  } catch (err) {
    console.error('❌ SENKRONİZASYON HATASI:', err.message);
    process.exit(1);
  }
}

sync();
