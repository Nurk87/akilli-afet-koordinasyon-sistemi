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

const cityCoords = {
  'İstanbul': [41.0082, 28.9784], 'Ankara': [39.9334, 32.8597], 'İzmir': [38.4237, 27.1428],
  'Bursa': [40.1826, 29.0657], 'Antalya': [36.8841, 30.7056], 'Adana': [37.0017, 35.3289],
  'Konya': [37.8714, 32.4847], 'Gaziantep': [37.0662, 37.3833], 'Mersin': [36.8121, 34.6415],
  'Diyarbakır': [37.9144, 40.2106], 'Hatay': [36.2023, 36.1606], 'Kahramanmaraş': [37.5858, 36.9371],
  'Malatya': [38.3552, 38.3093], 'Adıyaman': [37.7648, 38.2786], 'Osmaniye': [37.0741, 36.2467],
  'Şanlıurfa': [37.1674, 38.7955], 'Kilis': [36.7184, 37.1212], 'Elazığ': [38.681, 39.2264],
  'Samsun': [41.2867, 36.33], 'Kayseri': [38.7205, 35.4826], 'Eskişehir': [39.7767, 30.5206],
  'Denizli': [37.7765, 29.0864], 'Manisa': [38.6191, 27.4289], 'Balıkesir': [39.6484, 27.8826],
  'Aydın': [37.8444, 27.8458], 'Tekirdağ': [40.9781, 27.511], 'Muğla': [37.2153, 28.3636],
  'Sakarya': [40.7533, 30.4], 'Erzurum': [39.9043, 41.2679], 'Mardin': [37.3129, 40.7339],
  'Trabzon': [41.0027, 39.7168], 'Afyonkarahisar': [38.7507, 30.5411], 'Sivas': [39.7477, 37.0179],
  'Zonguldak': [41.4511, 31.7944], 'Tokat': [40.3167, 36.55], 'Kütahya': [39.4167, 29.9833],
  'Çanakkale': [40.1553, 26.4142], 'Batman': [37.8812, 41.1351], 'Çorum': [40.5506, 34.9556],
  'Ağrı': [39.7225, 43.0544], 'Isparta': [37.7648, 30.5566], 'Aksaray': [38.3687, 34.0297],
  'Yozgat': [39.8181, 34.8147], 'Edirne': [41.6768, 26.557], 'Muş': [38.7432, 41.5064],
  'Giresun': [40.9128, 38.3895], 'Kastamonu': [41.3887, 33.7827], 'Uşak': [38.6823, 29.4082],
  'Kırklareli': [41.7333, 27.2167], 'Niğde': [37.9667, 34.6833], 'Bitlis': [38.4, 42.1167],
  'Rize': [41.0201, 40.5234], 'Amasya': [40.65, 35.8333], 'Siirt': [37.9333, 41.9333],
  'Bolu': [40.731, 31.608], 'Nevşehir': [38.6244, 34.7144], 'Kırıkkale': [39.8468, 33.5153],
  'Hakkari': [37.5744, 43.7408], 'Bingöl': [38.8847, 40.4939], 'Burdur': [37.7167, 30.2833],
  'Karaman': [37.1759, 33.2287], 'Karabük': [41.2, 32.6333], 'Kırşehir': [39.1425, 34.1709],
  'Erzincan': [39.75, 39.5], 'Bilecik': [40.1431, 29.9792], 'Sinop': [42.0231, 35.1531],
  'Iğdır': [39.9167, 44.0333], 'Bartın': [41.6358, 32.3375], 'Yalova': [40.6551, 29.2769],
  'Çankırı': [40.6, 33.6167], 'Gümüşhane': [40.46, 39.48], 'Artvin': [41.1833, 41.8167],
  'Kars': [40.6167, 43.1], 'Düzce': [40.8413, 31.1581], 'Şırnak': [37.5164, 42.4611],
  'Ardahan': [41.1105, 42.7022], 'Bayburt': [40.2552, 40.2249], 'Tunceli': [39.1079, 39.5401],
  'Kırıkkale': [39.8468, 33.5153], 'Osmaniye': [37.0741, 36.2467], 'Ardahan': [41.1105, 42.7022]
};

async function seed() {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Veritabanına bağlanıldı.');

    // Önce temizleyelim (Opsiyonel: Sadece simülasyon verilerini temizlemek isterseniz)
    // await pool.request().query("DELETE FROM yardim_talepleri WHERE baslik LIKE '%Simülasyon%'");

    const yardimTipleri = ['Gıda', 'Sağlık', 'Barınma', 'Kurtarma', 'Isınma'];
    const oncelikler = ['acil', 'yuksek', 'orta', 'dusuk'];

    console.log('🚀 81 il için yardım talepleri oluşturuluyor...');

    for (const city in cityCoords) {
      const [lat, lng] = cityCoords[city];
      
      // Her ile 1 veya 2 talep ekle
      const requestCount = Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < requestCount; i++) {
        const offsetLat = (Math.random() - 0.5) * 0.1; // ~10km dağılım
        const offsetLng = (Math.random() - 0.5) * 0.1;
        
        const tip = yardimTipleri[Math.floor(Math.random() * yardimTipleri.length)];
        const oncelik = oncelikler[Math.floor(Math.random() * oncelikler.length)];
        
        const query = `
          INSERT INTO yardim_talepleri 
          (baslik, aciklama, enlem, boylam, durum, oncelik, yardim_tipi, ad_soyad, telefon, olusturulma_tarihi)
          VALUES 
          (@baslik, @aciklama, @enlem, @boylam, @durum, @oncelik, @yardim_tipi, @ad_soyad, @telefon, GETDATE())
        `;

        await pool.request()
          .input('baslik', sql.NVarChar, `${city} - Acil ${tip} Talebi (#Simülasyon)`)
          .input('aciklama', sql.NVarChar, `${city} merkezinde ${tip.toLowerCase()} ihtiyacı bulunmaktadır. Lütfen en yakın ekibi sevk edin.`)
          .input('enlem', sql.Decimal(10, 8), lat + offsetLat)
          .input('boylam', sql.Decimal(11, 8), lng + offsetLng)
          .input('durum', sql.NVarChar, 'yeni')
          .input('oncelik', sql.NVarChar, oncelik)
          .input('yardim_tipi', sql.NVarChar, tip)
          .input('ad_soyad', sql.NVarChar, 'Saha Operatörü')
          .input('telefon', sql.NVarChar, '05550000000')
          .query(query);
      }
    }

    console.log('✅ 81 il için yardım talepleri başarıyla eklendi! Haritayı yenileyebilirsiniz.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

seed();
