const sqlite3 = require("sqlite3").verbose();
const path = require("path");

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
    email TEXT UNIQUE, 
    password TEXT,
    role TEXT DEFAULT 'user'
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
    specialty TEXT,
    capacity INTEGER DEFAULT 1,
    current_load INTEGER DEFAULT 0,
    lat REAL,
    lng REAL,
    active INTEGER DEFAULT 1,
    performance_score INTEGER DEFAULT 100
  )`);
});

module.exports = db;