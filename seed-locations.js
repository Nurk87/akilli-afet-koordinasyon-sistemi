const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function seed() {
  try {
    // Read iller-ilceler.js
    const content = fs.readFileSync(path.join(__dirname, 'public', 'js', 'iller-ilceler.js'), 'utf8');
    // Extract the JSON-like object
    const match = content.match(/var iller = (\{[\s\S]+\});/);
    if (!match) throw new Error("Could not parse iller-ilceler.js");
    
    // Evaluate the object (it's safe since it's local code we control)
    const illerObj = eval('(' + match[1] + ')');

    // Trigger DB init
    await pool.query("SELECT 1");
    console.log("Database type:", pool.getDbType());

    // Because MSSQL and SQLite may have foreign keys or we want to start fresh:
    // We should be careful about existing yardim_talepleri, but if we assume dev state we can clean up
    // However, better is just to insert if they don't exist, but we need exact ID match for il_id!

    // Clear existing
    if (pool.getDbType() === 'mssql') {
      await pool.query("DELETE FROM ilceler");
      await pool.query("DELETE FROM iller");
      await pool.query("DBCC CHECKIDENT('ilceler', RESEED, 0)");
      
      // We must insert iller with explicit IDs
      for (const plate in illerObj) {
        const id = parseInt(plate);
        const ad = illerObj[plate].ad;
        await pool.query("SET IDENTITY_INSERT iller ON; INSERT INTO iller (id, ad) VALUES (?, ?); SET IDENTITY_INSERT iller OFF;", [id, ad]);
      }

      // Insert ilceler
      for (const plate in illerObj) {
        const il_id = parseInt(plate);
        const ilceler = illerObj[plate].ilceler;
        for (const ilce of ilceler) {
          await pool.query("INSERT INTO ilceler (il_id, ad) VALUES (?, ?)", [il_id, ilce]);
        }
      }
    } else {
      // SQLite
      await pool.query("DELETE FROM ilceler");
      await pool.query("DELETE FROM iller");
      
      for (const plate in illerObj) {
        const id = parseInt(plate);
        const ad = illerObj[plate].ad;
        await pool.query("INSERT INTO iller (id, ad) VALUES (?, ?)", [id, ad]);
      }
      for (const plate in illerObj) {
        const il_id = parseInt(plate);
        const ilceler = illerObj[plate].ilceler;
        for (const ilce of ilceler) {
          await pool.query("INSERT INTO ilceler (il_id, ad) VALUES (?, ?)", [il_id, ilce]);
        }
      }
    }
    
    // Seed Safe Zones (Güvenli Alanlar) - 81 İLİN TAMAMI
    console.log('🏗️ 81 il için güvenli alanlar veritabanına işleniyor...');
    await pool.query("DELETE FROM guvenli_alanlar");
    
    const cityCoords = {
      "Adana": [36.9944, 35.3289], "Adıyaman": [37.7648, 38.2786], "Afyonkarahisar": [38.7507, 30.5567], "Ağrı": [39.7217, 43.0567], "Amasya": [40.6499, 35.8353], 
      "Ankara": [39.9334, 32.8597], "Antalya": [36.8841, 30.7056], "Artvin": [41.1828, 41.8183], "Aydın": [37.8560, 27.8416], "Balıkesir": [39.6484, 27.8826],
      "Bilecik": [40.1426, 29.9795], "Bingöl": [38.8847, 40.4939], "Bitlis": [38.4006, 42.1095], "Bolu": [40.7310, 31.6080], "Burdur": [37.7203, 30.2908],
      "Bursa": [40.1825, 29.0610], "Çanakkale": [40.1553, 26.4142], "Çankırı": [40.6013, 33.6134], "Çorum": [40.5506, 34.9556], "Denizli": [37.7765, 29.0864],
      "Diyarbakır": [37.9144, 40.2110], "Edirne": [41.6818, 26.5623], "Elazığ": [38.6810, 39.2264], "Erzincan": [39.7500, 39.5000], "Erzurum": [39.9000, 41.2700],
      "Eskişehir": [39.7767, 30.5206], "Gaziantep": [37.0662, 37.3833], "Giresun": [40.9128, 38.3895], "Gümüşhane": [40.4608, 39.4814], "Hakkari": [37.5744, 43.7408],
      "Hatay": [36.2023, 36.1613], "Isparta": [37.7648, 30.5566], "Mersin": [36.8121, 34.6415], "İstanbul": [41.0082, 28.9784], "İzmir": [38.4192, 27.1287],
      "Kars": [40.6163, 43.1022], "Kastamonu": [41.3811, 33.7753], "Kayseri": [38.7215, 35.4847], "Kırklareli": [41.7333, 27.2167], "Kırşehir": [39.1425, 34.1709],
      "Kocaeli": [40.8533, 29.8815], "Konya": [37.8714, 32.4846], "Kütahya": [39.4167, 29.9833], "Malatya": [38.3552, 38.3095], "Manisa": [38.6191, 27.4289],
      "Kahramanmaraş": [37.5858, 36.9371], "Mardin": [37.3212, 40.7245], "Muğla": [37.2153, 28.3636], "Muş": [38.7432, 41.5064], "Nevşehir": [38.6247, 34.7144],
      "Niğde": [37.9667, 34.6833], "Ordu": [40.9839, 37.8764], "Rize": [41.0201, 40.5234], "Sakarya": [40.7569, 30.3783], "Samsun": [41.2867, 36.3300],
      "Siirt": [37.9333, 41.9419], "Sinop": [42.0231, 35.1531], "Sivas": [39.7477, 37.0179], "Tekirdağ": [40.9833, 27.5167], "Tokat": [40.3167, 36.5500],
      "Trabzon": [41.0027, 39.7168], "Tunceli": [39.1079, 39.5401], "Şanlıurfa": [37.1591, 38.7969], "Uşak": [38.6823, 29.4082], "Van": [38.4891, 43.4011],
      "Yozgat": [39.8181, 34.8147], "Zonguldak": [41.4564, 31.7987], "Aksaray": [38.3687, 34.0370], "Bayburt": [40.2552, 40.2249], "Karaman": [37.1759, 33.2287],
      "Kırıkkale": [39.8468, 33.5153], "Batman": [37.8812, 41.1351], "Şırnak": [37.5164, 42.4611], "Bartın": [41.6344, 32.3375], "Ardahan": [41.1105, 42.7022],
      "Iğdır": [39.9167, 44.0333], "Yalova": [40.6551, 29.2769], "Karabük": [41.2061, 32.6204], "Kilis": [36.7184, 37.1212], "Osmaniye": [37.0742, 36.2472],
      "Düzce": [40.8438, 31.1565]
    };

    const types = ['Toplanma Alanı', 'Çadır Kent', 'Aşevi', 'Sahra Hastanesi'];
    
    for (const city in cityCoords) {
      const [lat, lng] = cityCoords[city];
      
      // 1. Ana Toplanma Alanı
      const safeType = city === 'İstanbul' || city === 'Ankara' || city === 'Hatay' ? 'Çadır Kent' : 'Toplanma Alanı';
      await pool.query(
        "INSERT INTO guvenli_alanlar (ad, tip, enlem, boylam, kapasite, aciklama) VALUES (?, ?, ?, ?, ?, ?)",
        [`${city} Merkez Güvenli Bölge`, safeType, lat, lng, 2000 + Math.floor(Math.random() * 3000), `${city} ili ana toplanma ve barınma merkezi.`]
      );

      // 2. Aşevi (Her il için bir adet)
      await pool.query(
        "INSERT INTO guvenli_alanlar (ad, tip, enlem, boylam, kapasite, aciklama) VALUES (?, ?, ?, ?, ?, ?)",
        [`${city} AFAD Mobil Aşevi`, 'Aşevi', lat + 0.005, lng + 0.005, 1000, 'Sıcak yemek, temiz su ve temel gıda malzemeleri dağıtım noktası.']
      );

      // 3. Bazı büyük illere Sahra Hastanesi de ekleyelim
      if (['İstanbul', 'Ankara', 'İzmir', 'Hatay', 'Gaziantep', 'Adana'].includes(city)) {
          await pool.query(
            "INSERT INTO guvenli_alanlar (ad, tip, enlem, boylam, kapasite, aciklama) VALUES (?, ?, ?, ?, ?, ?)",
            [`${city} Sahra Hastanesi`, 'Sahra Hastanesi', lat - 0.005, lng - 0.005, 500, 'Acil tıbbi müdahale ve ilk yardım sahra ünitesi.']
          );
      }
    }

    console.log('✅ 81 il için Toplanma Alanları ve Aşevleri başarıyla yüklendi.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Tohumlama Hatası:', err);
    process.exit(1);
  }
}

seed();
