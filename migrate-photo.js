const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function migrate() {
    try {
        await sql.connect(config);
        console.log('✅ MSSQL Bağlantısı Başarılı.');
        
        const query = `
            IF NOT EXISTS (SELECT * FROM sys.columns 
                           WHERE object_id = OBJECT_ID('yardim_talepleri') 
                           AND name = 'fotograf_yolu')
            BEGIN
                ALTER TABLE yardim_talepleri ADD fotograf_yolu NVARCHAR(MAX);
                PRINT '✅ fotograf_yolu sütunu eklendi.';
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ fotograf_yolu sütunu zaten mevcut.';
            END
        `;
        
        await sql.query(query);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migrasyon Hatası:', err);
        process.exit(1);
    }
}

migrate();
