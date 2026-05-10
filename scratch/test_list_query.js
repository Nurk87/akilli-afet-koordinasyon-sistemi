const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

async function testQuery() {
    try {
        await sql.connect(config);
        
        // Exactly the query from routes/requests.js (admin/volunteer version)
        let query = `
          SELECT 
            y.*, 
            COALESCE(u.ad, y.ad_soyad) as ad, 
            COALESCE(u.soyad, '') as soyad, 
            COALESCE(y.telefon, u.telefon) as telefon,
            i.ad as il_adi, 
            ilc.ad as ilce_adi,
            ya.gonullu_id,
            ya.gonullu_id as assigned_volunteer_id,
            ya.durum as atama_durumu,
            gv.ad as gonullu_ad, 
            gv.soyad as gonullu_soyad,
            gv.telefon as gonullu_telefon
          FROM yardim_talepleri y WITH (NOLOCK)
          LEFT JOIN users u WITH (NOLOCK) ON y.kullanici_id = u.id
          LEFT JOIN iller i WITH (NOLOCK) ON y.il_id = i.id
          LEFT JOIN ilceler ilc WITH (NOLOCK) ON y.ilce_id = ilc.id
          LEFT JOIN yardim_atamalari ya WITH (NOLOCK) ON y.id = ya.talep_id AND ya.durum != 'iptal'
          LEFT JOIN users gv WITH (NOLOCK) ON ya.gonullu_id = gv.id
          ORDER BY y.olusturulma_tarihi DESC
        `;
        
        const res = await sql.query(query);
        console.log('Result count:', res.recordset.length);
        if (res.recordset.length > 0) {
            console.log('First record sample:', JSON.stringify(res.recordset[0], null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error('QUERY ERROR:', err.message);
        process.exit(1);
    }
}

testQuery();
