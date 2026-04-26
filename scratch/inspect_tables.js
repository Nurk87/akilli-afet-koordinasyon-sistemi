const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function inspectTable(dbPath, tableName) {
    console.log(`\n--- TABLE: ${tableName} in ${dbPath} ---`);
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath);
        db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) {
                console.error(err);
            } else {
                console.log(JSON.stringify(rows, null, 2));
            }
            db.close();
            resolve();
        });
    });
}

async function run() {
    await inspectTable('database/database.db', 'help_requests');
    await inspectTable('database/database.db', 'users');
    await inspectTable('database.db', 'users');
}

run();
