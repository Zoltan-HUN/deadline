const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_by INTEGER NOT NULL REFERENCES users(id),
    started_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'finished')),
    average REAL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
    submitted_at INTEGER NOT NULL,
    UNIQUE(round_id, user_id)
  );
`);

module.exports = db;
