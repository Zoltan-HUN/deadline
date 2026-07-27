const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'missing_credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ ok: false });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, id: req.session.userId, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
