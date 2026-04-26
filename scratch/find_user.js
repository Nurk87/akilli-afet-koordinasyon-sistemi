const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const sources = ['database.db', 'database/database.db'];
const targetEmail = 'efesari@gmail.com';

async function find() {
  console.log(`🔍 Searching for ${targetEmail}...`);
  
  for (const src of sources) {
    if (!fs.existsSync(src)) {
      console.log(`❌ ${src} found.`);
      continue;
    }
    
    await new Promise((resolve) => {
      const db = new sqlite3.Database(src);
      // Try both possible table names/columns from previous scripts
      db.all("SELECT * FROM users", (err, rows) => {
        if (!err && rows) {
          const match = rows.find(r => (r.email && r.email.toLowerCase().includes('efe')) || (r.name && r.name.toLowerCase().includes('efe')));
          if (match) {
            console.log(`✅ FOUND in ${src} (users table):`, match);
          } else {
            console.log(`ℹ️ Not in ${src} users table.`);
          }
        } else {
           console.log(`⚠️ Error reading users table in ${src}: ${err ? err.message : 'No rows'}`);
        }
        
        // Some DBs have 'help_requests' or other tables where names might be
        db.all("SELECT * FROM help_requests", (err, rows) => {
           if (!err && rows) {
             const match = rows.find(r => r.name && r.name.toLowerCase().includes('efe'));
             if (match) console.log(`✅ FOUND in ${src} (help_requests table):`, match);
           }
           db.close();
           resolve();
        });
      });
    });
  }
}

find();
