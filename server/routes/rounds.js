const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const ROUND_DURATION_MS = 10000;

function getActiveRound() {
  return db
    .prepare(
      `SELECT rounds.*, users.username AS started_by_username
       FROM rounds
       JOIN users ON users.id = rounds.started_by
       WHERE rounds.status = 'active'`
    )
    .get();
}

module.exports = function createRoundsRouter(io) {
  const router = express.Router();

  function finishRound(roundId) {
    const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
    if (!round || round.status !== 'active') return;

    const scores = db.prepare('SELECT score FROM scores WHERE round_id = ?').all(roundId);
    const average = scores.length
      ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      : null;

    db.prepare('UPDATE rounds SET status = ?, average = ? WHERE id = ?').run('finished', average, roundId);

    io.emit('round:finished', {
      roundId,
      average,
      scoreCount: scores.length,
    });
  }

  // Resume any round left active from before a server restart.
  const orphan = getActiveRound();
  if (orphan) {
    const remaining = orphan.started_at + ROUND_DURATION_MS - Date.now();
    if (remaining <= 0) {
      finishRound(orphan.id);
    } else {
      setTimeout(() => finishRound(orphan.id), remaining);
    }
  }

  router.get('/latest-average', (req, res) => {
    const row = db
      .prepare(
        `SELECT average FROM rounds
         WHERE status = 'finished' AND average IS NOT NULL
         ORDER BY id DESC LIMIT 1`
      )
      .get();
    res.json({ average: row ? row.average : null });
  });

  router.get('/active', requireAuth, (req, res) => {
    const round = getActiveRound();
    if (!round) return res.json({ active: false });
    res.json({
      active: true,
      roundId: round.id,
      startedById: round.started_by,
      startedByUsername: round.started_by_username,
      startedAt: round.started_at,
      durationMs: ROUND_DURATION_MS,
    });
  });

  router.post('/start', requireAuth, (req, res) => {
    if (getActiveRound()) {
      return res.status(409).json({ ok: false, error: 'round_already_active' });
    }

    const startedAt = Date.now();
    const info = db
      .prepare('INSERT INTO rounds (started_by, started_at, status) VALUES (?, ?, ?)')
      .run(req.session.userId, startedAt, 'active');
    const roundId = info.lastInsertRowid;

    io.emit('round:started', {
      roundId,
      startedById: req.session.userId,
      startedByUsername: req.session.username,
      startedAt,
      durationMs: ROUND_DURATION_MS,
    });

    setTimeout(() => finishRound(roundId), ROUND_DURATION_MS);

    res.json({
      ok: true,
      roundId,
      startedById: req.session.userId,
      startedByUsername: req.session.username,
      startedAt,
      durationMs: ROUND_DURATION_MS,
    });
  });

  router.post('/:id/score', requireAuth, (req, res) => {
    const roundId = Number(req.params.id);
    const score = Number(req.body && req.body.score);

    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return res.status(400).json({ ok: false, error: 'invalid_score' });
    }

    const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);

    if (!round || round.status !== 'active') {
      return res.status(409).json({ ok: false, error: 'round_not_active' });
    }

    if (Date.now() > round.started_at + ROUND_DURATION_MS) {
      return res.status(409).json({ ok: false, error: 'time_expired' });
    }

    try {
      db.prepare('INSERT INTO scores (round_id, user_id, score, submitted_at) VALUES (?, ?, ?, ?)').run(
        roundId,
        req.session.userId,
        score,
        Date.now()
      );
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ ok: false, error: 'already_scored' });
      }
      throw err;
    }

    res.json({ ok: true });
  });

  return router;
};
