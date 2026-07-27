const averageEl = document.getElementById('average');
const titleEl = document.getElementById('score-title');
const tileEl = averageEl.closest('.tile-big');
const cardEl = titleEl.closest('.card');

function availableWidthOf(container, contentEl) {
  const style = getComputedStyle(container);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return container.clientWidth - paddingX;
}

function fitValueToTile() {
  averageEl.style.fontSize = '';

  const availableWidth = availableWidthOf(tileEl);
  const contentWidth = averageEl.scrollWidth;

  if (contentWidth > availableWidth) {
    const baseFontSize = parseFloat(getComputedStyle(averageEl).fontSize);
    const scaledFontSize = baseFontSize * (availableWidth / contentWidth) * 0.95;
    averageEl.style.fontSize = `${scaledFontSize}px`;
  }

  const valueFontSize = parseFloat(getComputedStyle(averageEl).fontSize);
  titleEl.style.fontSize = `${valueFontSize / 2}px`;

  const titleAvailableWidth = availableWidthOf(cardEl);
  const titleContentWidth = titleEl.scrollWidth;

  if (titleContentWidth > titleAvailableWidth) {
    const halvedFontSize = valueFontSize / 2;
    const scaledTitleFontSize = halvedFontSize * (titleAvailableWidth / titleContentWidth) * 0.95;
    titleEl.style.fontSize = `${scaledTitleFontSize}px`;
  }
}

function renderAverage(average) {
  averageEl.textContent = average === null || average === undefined ? '—' : average.toFixed(1);
  fitValueToTile();
}

async function loadInitialAverage() {
  try {
    const res = await fetch('/api/rounds/latest-average');
    const data = await res.json();
    renderAverage(data.average);
  } catch (err) {
    renderAverage(null);
  }
}

loadInitialAverage();

const socket = io();
socket.on('round:finished', (data) => {
  renderAverage(data.average);
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitValueToTile, 100);
});
