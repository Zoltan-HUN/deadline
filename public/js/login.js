const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.ok) {
      window.location.href = '/score.html';
    } else {
      errorEl.textContent = 'Hibás felhasználónév vagy jelszó.';
    }
  } catch (err) {
    errorEl.textContent = 'Nem sikerült kapcsolódni a szerverhez.';
  }
});
