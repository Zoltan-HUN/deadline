const welcomeEl = document.getElementById('welcome');
const idlePanel = document.getElementById('idle-panel');
const votingPanel = document.getElementById('voting-panel');
const resultPanel = document.getElementById('result-panel');

const startBtn = document.getElementById('start-btn');
const idleStatus = document.getElementById('idle-status');
const votingInfo = document.getElementById('voting-info');
const scoreGrid = document.getElementById('score-grid');
const votingStatus = document.getElementById('voting-status');
const countdownEl = document.getElementById('countdown');
const resultAverageEl = document.getElementById('result-average');
const resultMetaEl = document.getElementById('result-meta');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let currentRoundId = null;
let countdownTimer = null;
let resultRevertTimer = null;

function hideAllPanels() {
  idlePanel.style.display = 'none';
  votingPanel.style.display = 'none';
  resultPanel.style.display = 'none';
}

function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (resultRevertTimer) {
    clearTimeout(resultRevertTimer);
    resultRevertTimer = null;
  }
}

function showIdle(message) {
  clearTimers();
  hideAllPanels();
  idlePanel.style.display = '';
  idleStatus.textContent = message || '';
  startBtn.disabled = false;
}

function startCountdown(el, deadline, onExpire) {
  function tick() {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      if (onExpire) onExpire();
    }
  }
  tick();
  countdownTimer = setInterval(tick, 200);
}

function buildScoreGrid() {
  scoreGrid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const card = document.createElement('button');
    card.className = 'score-card';
    card.textContent = String(i);
    card.addEventListener('click', () => submitScore(i, card));
    scoreGrid.appendChild(card);
  }
}

function disableScoreGrid() {
  Array.from(scoreGrid.children).forEach((card) => (card.disabled = true));
}

async function submitScore(score, card) {
  disableScoreGrid();
  card.classList.add('selected');
  votingStatus.textContent = 'Küldés…';
  try {
    const res = await fetch(`/api/rounds/${currentRoundId}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    const data = await res.json();
    if (data.ok) {
      votingStatus.textContent = 'Pontod elküldve, köszönjük!';
    } else if (data.error === 'already_scored') {
      votingStatus.textContent = 'Már pontoztál ebben a körben.';
    } else if (data.error === 'time_expired') {
      votingStatus.textContent = 'Lejárt az idő.';
    } else {
      votingStatus.textContent = 'Nem sikerült elküldeni a pontszámot.';
    }
  } catch (err) {
    votingStatus.textContent = 'Kapcsolódási hiba.';
  }
}

function enterVotingState(data) {
  clearTimers();
  hideAllPanels();
  votingPanel.style.display = '';
  votingStatus.textContent = '';
  votingInfo.textContent =
    data.startedById === currentUser.id
      ? 'Te indítottad ezt a pontozást — válassz egy kártyát!'
      : `${data.startedByUsername} elindított egy pontozást — válassz egy kártyát!`;
  currentRoundId = data.roundId;
  buildScoreGrid();

  const deadline = data.startedAt + data.durationMs;
  startCountdown(countdownEl, deadline, () => {
    disableScoreGrid();
    votingStatus.textContent = votingStatus.textContent || 'Lejárt az idő.';
  });
}

function showResult(data) {
  clearTimers();
  hideAllPanels();
  resultPanel.style.display = '';
  resultAverageEl.textContent = data.average === null ? '—' : data.average.toFixed(1);
  resultMetaEl.textContent =
    typeof data.scoreCount === 'number' ? `${data.scoreCount} szavazat alapján` : '';

  resultRevertTimer = setTimeout(() => showIdle(''), 4000);
}

async function loadMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  if (!data.loggedIn) {
    window.location.href = '/login.html';
    return null;
  }
  return data;
}

async function loadActiveRound() {
  const res = await fetch('/api/rounds/active');
  const data = await res.json();
  return data;
}

async function init() {
  currentUser = await loadMe();
  if (!currentUser) return;

  welcomeEl.textContent = `Bejelentkezve mint ${currentUser.username}.`;

  const active = await loadActiveRound();
  if (active.active) {
    enterVotingState(active);
  } else {
    showIdle('');
  }

  const socket = io();

  socket.on('round:started', (data) => {
    enterVotingState(data);
  });

  socket.on('round:finished', (data) => {
    showResult(data);
  });
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  idleStatus.textContent = '';
  try {
    const res = await fetch('/api/rounds/start', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      enterVotingState(data);
    } else if (data.error === 'round_already_active') {
      idleStatus.textContent = 'Már fut egy pontozás.';
      startBtn.disabled = false;
    } else {
      idleStatus.textContent = 'Nem sikerült elindítani a pontozást.';
      startBtn.disabled = false;
    }
  } catch (err) {
    idleStatus.textContent = 'Kapcsolódási hiba.';
    startBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

init();
