const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function seed() {
  try {
    // Read iller-ilceler.js
    const content = fs.readFileSync(path.join(__dirname, 'public', 'js', 'iller-ilceler.js'), 'utf8');
    // Extract the JSON-like object
    const match = content.match(/var iller = (\{[\s\S]+\});/);
    if (!match) throw new Error("Could not parse iller-ilceler.js");
    
    // Evaluate the object (it's safe since it's local code we control)
    const illerObj = eval('(' + match[1] + ')');

    // Trigger DB init
    await pool.query("SELECT 1");
    console.log("Database type:", pool.getDbType());

    // Because MSSQL and SQLite may have foreign keys or we want to start fresh:
    // We should be careful about existing yardim_talepleri, but if we assume dev state we can clean up
    // However, better is just to insert if they don't exist, but we need exact ID match for il_id!

    // Clear existing
    if (pool.getDbType() === 'mssql') {
      await pool.query("DELETE FROM ilceler");
      await pool.query("DELETE FROM iller");
      await pool.query("DBCC CHECKIDENT('ilceler', RESEED, 0)");
      
      // We must insert iller with explicit IDs
      await pool.query("SET IDENTITY_INSERT iller ON");
      for (const plate in illerObj) {
        const id = parseInt(plate);
        const ad = illerObj[plate].ad;
        await pool.query("INSERT INTO iller (id, ad) VALUES (?, ?)", [id, ad]);
      }
      await pool.query("SET IDENTITY_INSERT iller OFF");

      // Insert ilceler
      for (const plate in illerObj) {
        const il_id = parseInt(plate);
        const ilceler = illerObj[plate].ilceler;
        for (const ilce of ilceler) {
          await pool.query("INSERT INTO ilceler (il_id, ad) VALUES (?, ?)", [il_id, ilce]);
        }
      }
    } else {
      // SQLite
      await pool.query("DELETE FROM ilceler");
      await pool.query("DELETE FROM iller");
      
      for (const plate in illerObj) {
        const id = parseInt(plate);
        const ad = illerObj[plate].ad;
        await pool.query("INSERT INTO iller (id, ad) VALUES (?, ?)", [id, ad]);
      }
      for (const plate in illerObj) {
        const il_id = parseInt(plate);
        const ilceler = illerObj[plate].ilceler;
        for (const ilce of ilceler) {
          await pool.query("INSERT INTO ilceler (il_id, ad) VALUES (?, ?)", [il_id, ilce]);
        }
      }
    }

    console.log("Seeding complete!");
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
