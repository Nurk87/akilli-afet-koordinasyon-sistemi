const pool = require('../config/database');

async function check() {
    try {
        const [talepler] = await pool.query(
            "SELECT COUNT(*) as count FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi')"
        );
        console.log('Bekleyen Talepler:', talepler[0].count);

        const [gonulluler] = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND kapasite > 0 AND enlem IS NOT NULL"
        );
        console.log('Müsait Gönüllüler:', gonulluler[0].count);

        const [tumGonulluler] = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE rol = 'gonullu'"
        );
        console.log('Toplam Gönüllü Sayısı:', tumGonulluler[0].count);

        const [koordinatsizGonulluler] = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE rol = 'gonullu' AND (enlem IS NULL OR boylam IS NULL)"
        );
        console.log('Koordinatı Olmayan Gönüllüler:', koordinatsizGonulluler[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
