const pool = require('./config/database');

async function fixNullable() {
    console.log('🛠️ kullanici_id sütunu nullable yapılıyor (SQLite)...');
    
    try {
        const dbType = await pool.getDbType();
        
        if (dbType === 'sqlite' || dbType === 'none') {
            // 1. Mevcut tabloyu yedekle
            try {
                // SQLite'da bir sütunu nullable yapmak için tabloyu yeniden oluşturmak gerekir.
                
                // Önce tablo yapısını kontrol edip gerekli tüm sütunları içerecek şekilde yeni bir tablo oluşturuyoruz.
                await pool.query('BEGIN TRANSACTION');

                // Geçici tablo oluştur
                await pool.query(`
                    CREATE TABLE yardim_talepleri_yeni (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        kullanici_id INTEGER NULL,
                        il_id INTEGER NOT NULL,
                        ilce_id INTEGER NOT NULL,
                        enlem DECIMAL(10, 8),
                        boylam DECIMAL(11, 8),
                        baslik VARCHAR(255) NOT NULL,
                        aciklama TEXT,
                        durum VARCHAR(20) DEFAULT 'yeni',
                        oncelik VARCHAR(20) DEFAULT 'orta',
                        olusturulma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                        guncellenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                        fotograf_yolu TEXT,
                        ad_soyad TEXT,
                        telefon TEXT,
                        takip_kodu TEXT,
                        ses_kaydi_yolu TEXT
                    )
                `);

                // Verileri taşı (Eski tabloda olanları al)
                // Mevcut sütunları dinamik olarak belirlemek yerine, en temel olanları garantili taşıyoruz
                await pool.query(`
                    INSERT INTO yardim_talepleri_yeni (
                        id, kullanici_id, il_id, ilce_id, enlem, boylam, baslik, aciklama, durum, oncelik, olusturulma_tarihi, guncellenme_tarihi
                    )
                    SELECT id, kullanici_id, il_id, ilce_id, enlem, boylam, baslik, aciklama, durum, oncelik, olusturulma_tarihi, guncellenme_tarihi
                    FROM yardim_talepleri
                `);

                // Diğer sütunları (varsa) güncelle
                const optCols = ['fotograf_yolu', 'ad_soyad', 'telefon', 'takip_kodu', 'ses_kaydi_yolu'];
                for(const col of optCols) {
                    try {
                        await pool.query(`UPDATE yardim_talepleri_yeni SET ${col} = (SELECT ${col} FROM yardim_talepleri WHERE yardim_talepleri.id = yardim_talepleri_yeni.id)`);
                    } catch(e) { console.log(`ℹ️ ${col} verisi taşınamadı (muhtemelen eski tabloda yoktu)`); }
                }

                // Eski tabloyu sil ve yenisini isimlendir
                await pool.query('DROP TABLE yardim_talepleri');
                await pool.query('ALTER TABLE yardim_talepleri_yeni RENAME TO yardim_talepleri');

                await pool.query('COMMIT');
                console.log('✅ Tablo başarıyla yeniden yapılandırıldı. kullanici_id artık nullable.');
            } catch (e) {
                await pool.query('ROLLBACK');
                console.error('❌ İşlem sırasında hata:', e.message);
            }
        } else {
            // MSSQL için ALTER TABLE yeterli
            await pool.query('ALTER TABLE yardim_talepleri ALTER COLUMN kullanici_id INT NULL');
            console.log('✅ MSSQL kullanici_id nullable yapıldı.');
        }

        console.log('✨ Tamamlandı!');
        process.exit(0);
    } catch (err) {
        console.error('❌ KRİTİK HATA:', err);
        process.exit(1);
    }
}

fixNullable();
