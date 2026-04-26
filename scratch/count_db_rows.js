const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const sources = [
  'database.db',
  'database/database.db',
  '../ödevler nisa/database.db',
  '../elif ödev/database.db' // Optional
];

async function countRows() {
  console.log('--- DATABASE ROW COUNTS ---');
  for (const src of sources) {
    const fullPath = path.resolve(src);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Not found: ${src}`);
      continue;
    }
    
    console.log(`\n📄 Inspecting: ${src}`);
    const db = new sqlite3.Database(fullPath);
    
    await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err || !tables) {
          console.error(`  Error reading tables: ${err ? err.message : 'No tables'}`);
          resolve();
          return;
        }
        
        let pending = tables.length;
        if (pending === 0) resolve();
        
        tables.forEach(t => {
          db.get(`SELECT COUNT(*) as c FROM ${t.name}`, (err, row) => {
            console.log(`  - ${t.name}: ${row ? row.c : 'err'} rows`);
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

countRows();
