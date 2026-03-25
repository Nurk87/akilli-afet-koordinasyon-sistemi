const sql = require('mssql');
require('dotenv').config();

const testConfigs = [
    {
        name: 'Standart (localhost, 1433)',
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '1234',
        server: 'localhost',
        database: process.env.DB_NAME || 'afet_koordinasyon',
        port: 1433,
        options: { encrypt: false, trustServerCertificate: true }
    },
    {
        name: 'SQLEXPRESS (localhost\\SQLEXPRESS)',
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '1234',
        server: 'localhost\\SQLEXPRESS',
        database: process.env.DB_NAME || 'afet_koordinasyon',
        options: { encrypt: false, trustServerCertificate: true }
    }
];

async function runTests() {
    console.log('=== MSSQL BAĞLANTI TESTİ BAŞLATILIYOR ===\n');
    
    for (const config of testConfigs) {
        console.log(`[*] Deneniyor: ${config.name}...`);
        try {
            const pool = await sql.connect(config);
            console.log(`✅ BAŞARILI: ${config.name} ile bağlandık!`);
            await pool.close();
        } catch (err) {
            console.log(`❌ HATA (${config.name}): ${err.message}`);
            if (err.message.includes('TCP/IP')) {
                console.log('   💡 İPUCU: SQL Server Configuration Manager\'dan TCP/IP ayarını açmalısınız.');
            }
            if (err.message.includes('Login failed')) {
                console.log('   💡 İPUCU: "sa" kullanıcısı şifresi yanlış veya kullanıcı kapalı.');
            }
        }
        console.log('-----------------------------------');
    }
}

runTests();
