const pool = require('../config/database');

async function check() {
    try {
        const query = `
            SELECT 
                y.id, y.baslik, y.durum, 
                ya.gonullu_id as assigned_volunteer_id 
            FROM yardim_talepleri y 
            LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id 
            WHERE y.durum = 'tamamlandi'
        `;
        const [rows] = await pool.query(query);
        console.log('Sample Completed Task:');
        console.log(JSON.stringify(rows[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
