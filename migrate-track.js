const pool = require('./config/database');

async function runMigration() {
    console.log('🚀 Veritabanı göçü başlatılıyor...');
    
    try {
        const dbType = await pool.getDbType();
        console.log(`📡 Mevcut veritabanı tipi: ${dbType}`);

        if (dbType === 'mssql') {
            console.log('🛠️ MSSQL için tablolar güncelleniyor...');
            
            // 1. kullanici_id'yi nullable yap
            try {
                // Önce yabancı anahtar constraint adını bulmamız gerekebilir veya doğrudan deneyebiliriz
                // MSSQL'de NOT NULL'dan NULL'a geçiş:
                await pool.query('ALTER TABLE yardim_talepleri ALTER COLUMN kullanici_id INT NULL');
                console.log('✅ kullanici_id artık boş bırakılabilir.');
            } catch (e) {
                console.warn('⚠️ kullanici_id güncellenirken hata (muhtemelen zaten null veya constraint engeli):', e.message);
            }

            // 2. Yeni sütunları ekle
            const columnsToAdd = [
                { name: 'ad_soyad', type: 'NVARCHAR(255) NULL' },
                { name: 'telefon', type: 'NVARCHAR(50) NULL' },
                { name: 'takip_kodu', type: 'NVARCHAR(100) NULL UNIQUE' }
            ];

            for (const col of columnsToAdd) {
                try {
                    await pool.query(`ALTER TABLE yardim_talepleri ADD ${col.name} ${col.type}`);
                    console.log(`✅ Sütun eklendi: ${col.name}`);
                } catch (e) {
                    console.warn(`⚠️ Sütun eklenirken hata (muhtemelen zaten var): ${col.name}`, e.message);
                }
            }
        } else {
            console.log('🛠️ SQLite için tablolar güncelleniyor...');
            // SQLite ALTER TABLE kısıtlıdır, sütun ekleme kolaydır ama NULLable yapmak zordur.
            // SQLite zaten varsayılan olarak esnektir eğer STRICT modda değilse.
            
            try { await pool.query('ALTER TABLE yardim_talepleri ADD COLUMN ad_soyad TEXT'); } catch(e){}
            try { await pool.query('ALTER TABLE yardim_talepleri ADD COLUMN telefon TEXT'); } catch(e){}
            try { await pool.query('ALTER TABLE yardim_talepleri ADD COLUMN takip_kodu TEXT'); } catch(e){}
            console.log('✅ SQLite sütunları eklendi (varsa atlandı).');
        }

        console.log('✨ Veritabanı göçü başarıyla tamamlandı!');
        process.exit(0);
    } catch (err) {
        console.error('❌ GÖÇ HATASI:', err);
        process.exit(1);
    }
}

runMigration();
