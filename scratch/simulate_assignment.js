const pool = require('../config/database');
const { assignRequestsGreedy } = require('../utils/algorithm');

async function simulateAssignment() {
    try {
        console.log('--- Simülasyon Başlatılıyor ---');
        
        const [talepler] = await pool.query(
          "SELECT id, enlem, boylam, oncelik, olusturulma_tarihi FROM yardim_talepleri WHERE durum IN ('yeni', 'onaylandi')"
        );
        console.log(`Talepler: ${talepler.length} adet bulundu.`);

        const [gonulluler] = await pool.query(
          "SELECT id, enlem, boylam, kapasite, musaitlik_durumu FROM users WHERE rol = 'gonullu' AND musaitlik_durumu = 'musait' AND kapasite > 0 AND enlem IS NOT NULL"
        );
        console.log(`Gönüllüler: ${gonulluler.length} adet bulundu.`);

        if (talepler.length === 0 || gonulluler.length === 0) {
            console.log('Yeterli veri yok.');
            process.exit(0);
        }

        const atamalar = assignRequestsGreedy(talepler, gonulluler);
        console.log(`Algoritma sonucu: ${atamalar.length} atama yapıldı.`);

        for (let atama of atamalar) {
            console.log(`Atama Deneniyor: Talep ${atama.talep_id} -> Gönüllü ${atama.gonullu_id}`);
            try {
                await pool.query(
                  "INSERT INTO yardim_atamalari (talep_id, gonullu_id, mesafe_km, oncelik_skoru, durum) VALUES (?, ?, ?, ?, 'atandi')",
                  [atama.talep_id, atama.gonullu_id, atama.mesafe_km, atama.oncelik_skoru]
                );
                console.log('✅ INSERT Başarılı');

                await pool.query(
                  "UPDATE yardim_talepleri SET durum = 'atandi', hesaplanan_oncelik_skoru = ? WHERE id = ?",
                  [atama.oncelik_skoru, atama.talep_id]
                );
                console.log('✅ UPDATE Başarılı');
            } catch (innerErr) {
                console.error('❌ Hata:', innerErr.message);
                if (innerErr.originalError) console.error(innerErr.originalError);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('🔥 Kritik Hata:', err);
        process.exit(1);
    }
}

simulateAssignment();
