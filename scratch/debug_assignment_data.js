const pool = require('../config/database');

async function debugData() {
    try {
        const [talepler] = await pool.query(
            "SELECT id, enlem, boylam, durum, oncelik FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi')"
        );
        console.log('Talepler:', JSON.stringify(talepler, null, 2));

        const [gonulluler] = await pool.query(
            "SELECT id, enlem, boylam, kapasite, musaitlik_durumu FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND kapasite > 0"
        );
        console.log('Gönüllüler:', JSON.stringify(gonulluler, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugData();
