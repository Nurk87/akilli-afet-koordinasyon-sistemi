const pool = require('../config/database');

async function createRequest() {
    try {
        await pool.query(
            "INSERT INTO yardim_talepleri (baslik, aciklama, enlem, boylam, oncelik, durum) VALUES ('Otomatik Atama Test', 'Test açıklaması', 41.0, 29.0, 'acil', 'yeni')"
        );
        console.log('✅ Test talebi oluşturuldu.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createRequest();
