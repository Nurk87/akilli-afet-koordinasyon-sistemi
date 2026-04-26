const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function inspect() {
    console.log('--- DATA SOURCE INSPECTION ---');

    // JSON Files
    const jsonFiles = ['temp_users.json']; // Can add more if found
    for (const f of jsonFiles) {
        if (fs.existsSync(f)) {
            const data = JSON.parse(fs.readFileSync(f, 'utf8'));
            console.log(`JSON [${f}]: ${data.length} records`);
        }
    }

    // SQLite Files
    const dbFiles = ['database.db', 'database/database.db'];
    for (const f of dbFiles) {
        if (fs.existsSync(f)) {
            console.log(`\nSQLite [${f}]:`);
            await new Promise((resolve) => {
                const db = new sqlite3.Database(f);
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                    if (err) {
                        console.error(err);
                        resolve();
                        return;
                    }
                    
                    let processed = 0;
                    if (tables.length === 0) resolve();
                    
                    tables.forEach(t => {
                        db.get(`SELECT COUNT(*) as c FROM ${t.name}`, (err, row) => {
                            console.log(`  - ${t.name}: ${row ? row.c : 'error'} records`);
                            processed++;
                            if (processed === tables.length) {
                                db.close();
                                resolve();
                            }
                        });
                    });
                });
            });
        }
    }
}

inspect();
