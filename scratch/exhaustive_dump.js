const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const sources = ['database.db', 'database/database.db'];

async function dump() {
  console.log('--- EXHAUSTIVE SQLITE DUMP ---');
  for (const src of sources) {
    if (!fs.existsSync(src)) {
      console.log(`❌ ${src} found.`);
      continue;
    }
    
    console.log(`\n📄 Processing: ${src}`);
    const db = new sqlite3.Database(src);
    
    await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err || !tables) {
          console.error(`  Error reading tables in ${src}: ${err ? err.message : 'No tables'}`);
          resolve();
          return;
        }
        
        let pending = tables.length;
        if (pending === 0) resolve();
        
        tables.forEach(t => {
          db.all(`SELECT * FROM ${t.name}`, (err, rows) => {
            console.log(`\n  --- TABLE: ${t.name} (${rows ? rows.length : 0} rows) ---`);
            if (rows && rows.length > 0) {
              // Print all rows to see if any contain user data
              console.log(JSON.stringify(rows, null, 2));
            }
            pending--;
            if (pending === 0) {
              db.close();
              resolve();
            }
          });
        });
      });
    });
  }
}

dump();
