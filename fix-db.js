const pool = require('./config/database');

async function fixDatabase() {
    console.log('🛠️ Veritabanı yapısı kontrol ediliyor...');
    
    try {
        const dbType = await pool.getDbType();
        console.log(`📡 Veritabanı tipi: ${dbType}`);

        // SQLite ise yapıyı kontrol et ve eksikleri tamamla
        if (dbType === 'sqlite' || dbType === 'none') {
            const columnsToAdd = [
                { name: 'fotograf_yolu', type: 'TEXT' },
                { name: 'ad_soyad', type: 'TEXT' },
                { name: 'telefon', type: 'TEXT' },
                { name: 'takip_kodu', type: 'TEXT' },
                { name: 'ses_kaydi_yolu', type: 'TEXT' }
            ];

            for (const col of columnsToAdd) {
                try {
                    await pool.query(`ALTER TABLE yardim_talepleri ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Sütun eklendi: ${col.name}`);
                } catch (e) {
                    // Muhtemelen sütun zaten var
                    console.log(`ℹ️ Sütun zaten mevcut veya atlandı: ${col.name}`);
                }
            }

            // kullanici_id sütununu nullable yapmak SQLite'da zordur (tabloyu yeniden oluşturmak gerekir).
            // Ancak genellikle SQLite'da her şey default olarak null olabilir eğer NOT NULL kısıtı yoksa.
        }

        console.log('✨ Veritabanı düzeltme işlemi tamamlandı!');
        process.exit(0);
    } catch (err) {
        console.error('❌ HATA:', err);
        process.exit(1);
    }
}

fixDatabase();
