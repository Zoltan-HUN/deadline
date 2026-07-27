const bcrypt = require('bcrypt');
const db = require('../db');

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: npm run seed -- <username> <password>');
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);

try {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log(`User "${username}" created.`);
} catch (err) {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    console.error(`User "${username}" already exists.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
}
