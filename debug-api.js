const pool = require('./config/database');

async function debug() {
    try {
        console.log('--- Kullanıcı Listesi (Gönüllüler) ---');
        const [users] = await pool.query("SELECT id, email, rol FROM users WHERE email LIKE 'gonullu%'");
        console.log(users.slice(0, 3));

        const testUser = users[0];
        if (!testUser) {
            console.log('Gönüllü bulunamadı!');
            process.exit(0);
        }

        console.log(`\n--- ${testUser.email} (ID: ${testUser.id}) için Görev Kontrolü ---`);
        
        const query = `
          SELECT 
            y.id as talep_id,
            ya.gonullu_id as atama_gonullu_id,
            ya.durum as atama_durumu,
            y.durum as talep_durumu
          FROM yardim_talepleri y
          LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id
          WHERE ya.gonullu_id = ?
        `;
        
        const [tasks] = await pool.query(query, [testUser.id]);
        console.log('Atanan Görev Sayısı:', tasks.length);
        console.log('Görev Örnekleri:', tasks.slice(0, 3));

        console.log('\n--- API list sorgusu simülasyonu ---');
        const apiQuery = `
          SELECT 
            y.*, 
            ya.gonullu_id
          FROM yardim_talepleri y
          LEFT JOIN yardim_atamalari ya ON y.id = ya.talep_id AND ya.durum != 'iptal'
          WHERE ya.gonullu_id = ?
        `;
        const [apiTasks] = await pool.query(apiQuery, [testUser.id]);
        console.log('API Sonuç Sayısı:', apiTasks.length);
        if (apiTasks.length > 0) {
            console.log('İlk Görevdeki gonullu_id değeri:', apiTasks[0].gonullu_id);
            console.log('Nesne Anahtarları:', Object.keys(apiTasks[0]));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
