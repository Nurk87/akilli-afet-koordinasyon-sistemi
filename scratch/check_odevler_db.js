const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = 'C:/Users/Elif/OneDrive/Desktop/ödevler nisa/database.db';

async function check() {
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database not found at:', dbPath);
    return;
  }
  
  const db = new sqlite3.Database(dbPath);
  
  console.log('--- TABLES ---');
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(tables);
    
    tables.forEach(t => {
      db.all(`SELECT * FROM ${t.name}`, (err, rows) => {
        if (rows) {
          console.log(`\nTABLE [${t.name}] (${rows.length} records):`);
          const efeMatch = rows.filter(r => JSON.stringify(r).toLowerCase().includes('efe'));
          if (efeMatch.length > 0) {
            console.log('  ✅ MATCH FOUND:', efeMatch);
          }
          if (t.name === 'users') {
            rows.forEach(r => console.log(`  - ${r.email || r.name} (${r.rol || r.role})`));
          }
        }
      });
    });
  });
}

check();
