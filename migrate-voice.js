const pool = require('./config/database');

async function runMigration() {
    console.log('🚀 Ses Kaydı göçü başlatılıyor...');
    
    try {
        const dbType = await pool.getDbType();
        console.log(`📡 Mevcut veritabanı tipi: ${dbType}`);

        if (dbType === 'mssql') {
            try {
                await pool.query('ALTER TABLE yardim_talepleri ADD ses_kaydi_yolu NVARCHAR(MAX) NULL');
                console.log('✅ ses_kaydi_yolu sütunu eklendi.');
            } catch (e) {
                console.warn('⚠️ Hata (muhtemelen zaten var):', e.message);
            }
        } else {
            try {
                await pool.query('ALTER TABLE yardim_talepleri ADD COLUMN ses_kaydi_yolu TEXT');
                console.log('✅ SQLite ses_kaydi_yolu sütunu eklendi.');
            } catch (e) {
                console.warn('⚠️ Hata (muhtemelen zaten var):', e.message);
            }
        }

        console.log('✨ Göç tamamlandı!');
        process.exit(0);
    } catch (err) {
        console.error('❌ GÖÇ HATASI:', err);
        process.exit(1);
    }
}

runMigration();
