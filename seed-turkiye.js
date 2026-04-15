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

const cityCenters = {
  1: { ad: 'Adana', lat: 37.0, lng: 35.32 },
  6: { ad: 'Ankara', lat: 39.93, lng: 32.85 },
  7: { ad: 'Antalya', lat: 36.88, lng: 30.70 },
  10: { ad: 'Balıkesir', lat: 39.64, lng: 27.88 },
  16: { ad: 'Bursa', lat: 40.18, lng: 29.06 },
  21: { ad: 'Diyarbakır', lat: 37.91, lng: 40.21 },
  25: { ad: 'Erzurum', lat: 39.90, lng: 41.27 },
  27: { ad: 'Gaziantep', lat: 37.06, lng: 37.38 },
  31: { ad: 'Hatay', lat: 36.20, lng: 36.16 },
  34: { ad: 'İstanbul', lat: 41.00, lng: 28.97 },
  35: { ad: 'İzmir', lat: 38.41, lng: 27.12 },
  38: { ad: 'Kayseri', lat: 38.72, lng: 35.48 },
  41: { ad: 'Kocaeli', lat: 40.76, lng: 29.91 },
  42: { ad: 'Konya', lat: 37.87, lng: 32.48 },
  44: { ad: 'Malatya', lat: 38.35, lng: 38.31 },
  46: { ad: 'Kahramanmaraş', lat: 37.57, lng: 36.92 },
  55: { ad: 'Samsun', lat: 41.28, lng: 36.33 },
  61: { ad: 'Trabzon', lat: 41.00, lng: 39.71 },
  63: { ad: 'Şanlıurfa', lat: 37.15, lng: 38.79 },
  67: { ad: 'Zonguldak', lat: 41.45, lng: 31.79 }
};

async function seed() {
  try {
    const pool = await sql.connect(config);
    console.log('🔄 Eski veriler ve atamalar temizleniyor...');
    await pool.request().query("DELETE FROM yardim_atamalari");
    await pool.request().query("DELETE FROM yardim_talepleri");
    await pool.request().query("DELETE FROM users WHERE rol IN ('gonullu', 'kazazede')");

    const hashedPassword = await bcrypt.hash('123456', 10);

    // 1. Create Victims (20 Kazazede)
    console.log('👤 Kazadede kullanıcıları oluşturuluyor...');
    const victimIds = [];
    for (let i = 1; i <= 20; i++) {
        const res = await pool.request()
            .input('ad', `Afetzede_${i}`).input('email', `user${i}@afad.tr`).input('sifre', hashedPassword)
            .query(`INSERT INTO users (ad, soyad, email, sifre, rol) OUTPUT INSERTED.id VALUES (@ad, 'Test', @email, @sifre, 'kazazede')`);
        victimIds.push(res.recordset[0].id);
    }

    // 2. Create Volunteers (50 Gönüllü)
    console.log('🚛 Gönüllüler 81 ile dağıtılıyor...');
    const volunteers = [];
    const cityIds = Object.keys(cityCenters);
    for (let i = 1; i <= 50; i++) {
      const city = cityCenters[cityIds[i % cityIds.length]];
      const lat = city.lat + (Math.random() - 0.5) * 0.3;
      const lng = city.lng + (Math.random() - 0.5) * 0.3;
      
      const email = `gonullu${i}@afad.tr`;
      const res = await pool.request()
        .input('ad', `Gönüllü_${i}`).input('email', email).input('sifre', hashedPassword)
        .input('lat', lat).input('lng', lng).input('cityAd', city.ad)
        .query(`INSERT INTO users (ad, soyad, email, sifre, rol, enlem, boylam, kapasite) 
                OUTPUT INSERTED.id VALUES (@ad, @cityAd, @email, @sifre, 'gonullu', @lat, @lng, 5)`);
      volunteers.push({ id: res.recordset[0].id, lat, lng });
    }

    // 3. Create Requests (100 Talep - Kullanıcılarla İlişkili)
    console.log('🆘 Yardım talepleri senkronize ediliyor...');
    const requests = [];
    const ilceResult = await pool.request().query("SELECT TOP 500 id, il_id FROM ilceler");
    const ilceler = ilceResult.recordset;

    for (let i = 0; i < 100; i++) {
        const ilce = ilceler[Math.floor(Math.random() * ilceler.length)];
        const city = cityCenters[ilce.il_id] || { lat: 39, lng: 35 };
        const victimId = victimIds[i % victimIds.length]; // Dengeleme: Her kazazedeye 5 talep düşer
        
        const lat = city.lat + (Math.random() - 0.5) * 0.5;
        const lng = city.lng + (Math.random() - 0.5) * 0.5;
        const takip_kodu = Math.random().toString(36).substring(2, 10).toUpperCase();

        const res = await pool.request()
            .input('k_id', victimId).input('il_id', ilce.il_id).input('ilce_id', ilce.id)
            .input('lat', lat).input('lng', lng).input('tk', takip_kodu)
            .query(`INSERT INTO yardim_talepleri (kullanici_id, il_id, ilce_id, baslik, aciklama, enlem, boylam, oncelik, durum, takip_kodu)
                    OUTPUT INSERTED.id 
                    VALUES (@k_id, @il_id, @ilce_id, N'Acil Talep #' + CAST(${i+1} as nvarchar), N'Sistem tarafından oluşturulmuş test talebi.', @lat, @lng, 'yuksek', 'yeni', @tk)`);
        requests.push({ id: res.recordset[0].id, lat, lng });
    }

    // 4. Force Every Volunteer to have 1-2 Tasks
    console.log('🤖 Akıllı atamalar yapılıyor...');
    for (let i = 0; i < volunteers.length; i++) {
        const volunteer = volunteers[i];
        // En yakın 2 talebi bul (basit dist)
        const sortedReqs = requests.sort((a, b) => {
            const da = Math.pow(a.lat - volunteer.lat, 2) + Math.pow(a.lng - volunteer.lng, 2);
            const db = Math.pow(b.lat - volunteer.lat, 2) + Math.pow(b.lng - volunteer.lng, 2);
            return da - db;
        });

        const taskCount = 1 + Math.floor(Math.random() * 2); // Herkese 1 veya 2 iş
        for (let j = 0; j < taskCount; j++) {
            const req = sortedReqs[j];
            await pool.request()
                .input('t_id', req.id).input('g_id', volunteer.id)
                .query(`INSERT INTO yardim_atamalari (talep_id, gonullu_id, durum, mesafe_km, oncelik_skoru) 
                        VALUES (@t_id, @g_id, 'atandi', 5.2, 85.0)`);
            
            await pool.request().query(`UPDATE yardim_talepleri SET durum = 'atandi' WHERE id = ${req.id}`);
        }
    }

    console.log('✨ VERİ SETİ TAMAMLANDI!');
    console.log('🔑 Afetzede Giriş: user1@afad.tr / 123456');
    console.log('🔑 Gönüllü Giriş: gonullu1@afad.tr / 123456');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  }
}

seed();
