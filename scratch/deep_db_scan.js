const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// List of all DB files found in previous steps or likely spots
const dbFiles = [
    'c:/Users/Elif/OneDrive/Desktop/nisa/database.db',
    'c:/Users/Elif/OneDrive/Desktop/nisa/database/database.db',
    'c:/Users/Elif/OneDrive/Desktop/ödevler nisa/database.db',
    'c:/Users/Elif/OneDrive/Desktop/elif ödev/database.db'
];

async function scanDb(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return new Promise((resolve) => {
        const db = new sqlite3.Database(filePath);
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                db.close();
                return resolve(null);
            }
            
            let results = { path: filePath, tables: {} };
            let pending = tables.length;
            if (pending === 0) {
                db.close();
                return resolve(results);
            }

            tables.forEach(table => {
                db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                    if (!err && rows) {
                        results.tables[table.name] = rows.length;
                        // Search for 'efesari' in this table
                        const found = rows.find(row => JSON.stringify(row).toLowerCase().includes('efesari'));
                        if (found) {
                            console.log(`!!! FOUND EFESARI in ${filePath} -> ${table.name}`);
                            console.log(JSON.stringify(found, null, 2));
                        }
                    }
                    pending--;
                    if (pending === 0) {
                        db.close();
                        resolve(results);
                    }
                });
            });
        });
    });
}

async function run() {
    console.log("Starting deep scan of discovered databases...");
    for (const file of dbFiles) {
        const info = await scanDb(file);
        if (info) {
            console.log(`Scan of ${file}:`, JSON.stringify(info.tables, null, 2));
        }
    }
}

run();
