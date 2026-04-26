const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
    // 1. List all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('Error listing tables:', err.message);
            return;
        }
        console.log('--- TABLES IN SQLITE ---');
        console.log(tables.map(t => t.name).join(', '));
        console.log('\n');

        tables.forEach(table => {
            db.all(`SELECT COUNT(*) as count FROM ${table.name}`, [], (err, rows) => {
                if (err) {
                    console.log(`Table ${table.name} count error:`, err.message);
                } else {
                    console.log(`[${table.name}] Row Count: ${rows[0].count}`);
                    
                    // Show a sample of 1 row for each major table
                    if (['users', 'yardim_talepleri', 'yardim_atamalari', 'requests'].includes(table.name)) {
                        db.all(`SELECT * FROM ${table.name} LIMIT 1`, [], (err, sample) => {
                           if (sample && sample.length > 0) {
                               console.log(`Sample from ${table.name}:`, JSON.stringify(sample[0], null, 2));
                           }
                        });
                    }
                }
            });
        });
    });
});

setTimeout(() => db.close(), 5000);
