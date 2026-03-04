const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// database.db dosyasının kesin yolu
const dbPath = path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Veritabanı açılamadı:", err.message);
  } else {
    console.log("Database oluşturuldu/bağlandı:", dbPath);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS help_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    urgency INTEGER,
    lat REAL,
    lng REAL,
    status TEXT DEFAULT 'waiting'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    capacity INTEGER,
    lat REAL,
    lng REAL,
    active INTEGER DEFAULT 1
  )`);
});

module.exports = db;