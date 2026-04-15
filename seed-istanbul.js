const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true }
};

const istanbulData = {
  districts: {
    'Kadıköy': { lat: 40.9819, lon: 29.0571 },
    'Beşiktaş': { lat: 41.0417, lon: 29.0083 },
    'Üsküdar': { lat: 41.0329, lon: 29.0327 },
    'Zeytinburnu': { lat: 41.0000, lon: 28.9000 },
    'Fatih': { lat: 41.0130, lon: 28.9748 }
  },
  volunteers: [
    { ad: 'Ahmet', soyad: 'İstanbul1', email: 'v1@afad.gov.tr', ilce: 'Kadıköy' },
    { ad: 'Mehmet', soyad: 'İstanbul2', email: 'v2@afad.gov.tr', ilce: 'Beşiktaş' },
    { ad: 'Can', soyad: 'İstanbul3', email: 'v3@afad.gov.tr', ilce: 'Fatih' }
  ],
  requests: [
    { baslik: 'Zeytinburnu Acil Gıda', oncelik: 'acil', ilce: 'Zeytinburnu' },
    { baslik: 'Üsküdar İlaç İhtiyacı', oncelik: 'yuksek', ilce: 'Üsküdar' },
    { baslik: 'Kadıköy Barınma', oncelik: 'orta', ilce: 'Kadıköy' },
    { baslik: 'Kadıköy Bilgi Talebi', oncelik: 'dusuk', ilce: 'Kadıköy' }
  ]
};

async function seedIstanbul() {
  try {
    console.log('🔄 İstanbul Senaryosu Hazırlanıyor...');
    const pool = await sql.connect(config);
    
    // 1. İstanbul ID Bul
    const [ilRow] = (await pool.query("SELECT id FROM iller WHERE ad = N'İstanbul'")).recordset;
    if (!ilRow) throw new Error('İstanbul ili bulunamadı!');
    const ilId = ilRow.id;

    // 2. Mevcut İstanbul Senaryosu Verilerini Temizle
    await pool.query("DELETE FROM users WHERE email LIKE '%@afad.gov.tr'");
    await pool.query("DELETE FROM yardim_talepleri WHERE baslik LIKE '%İstanbul%' OR baslik LIKE '%Üsküdar%' OR baslik LIKE '%Kadıköy%'");

    console.log('📍 Gönüllüler ekleniyor...');
    for (const v of istanbulData.volunteers) {
      const coords = istanbulData.districts[v.ilce];
      await pool.request()
        .input('ad', v.ad).input('soyad', v.soyad).input('email', v.email)
        .input('lat', coords.lat).input('lon', coords.lon)
        .query(`INSERT INTO users (ad, soyad, email, sifre, rol, enlem, boylam, kapasite, musaitlik_durumu) 
                VALUES (@ad, @soyad, @email, '123456', 'gonullu', @lat, @lon, 5, 'musait')`);
    }

    console.log('🆘 Talepler ekleniyor...');
    for (const r of istanbulData.requests) {
      const coords = istanbulData.districts[r.ilce];
      // İlçe ID bul
      const ilceRes = await pool.query(`SELECT id FROM ilceler WHERE il_id = ${ilId} AND ad = N'${r.ilce}'`);
      const ilceId = ilceRes.recordset[0].id;
      
      await pool.request()
        .input('baslik', r.baslik).input('oncelik', r.oncelik)
        .input('lat', coords.lat).input('lon', coords.lon)
        .input('il_id', ilId).input('ilce_id', ilceId)
        .query(`INSERT INTO yardim_talepleri (baslik, aciklama, il_id, ilce_id, durum, oncelik, enlem, boylam, takip_kodu) 
                VALUES (@baslik, 'İstanbul Demo Senaryosu', @il_id, @ilce_id, 'yeni', @oncelik, @lat, @lon, UPPER(LEFT(NEWID(), 8)))`);
    }

    console.log('✨ İstanbul Senaryosu BAŞARIYLA yüklendi!');
    process.exit(0);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    process.exit(1);
  }
}

seedIstanbul();
