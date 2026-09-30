function parts(target) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return { done: diff <= 0, days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60, seconds: Math.floor(diff / 1000) % 60 };
}

const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Min'], ['seconds', 'Sec']];
const digitsOf = (value) => UNITS.map(([key]) => String(value[key]).padStart(2, '0'));

function reelHTML() {
  const strip = Array.from({ length: 10 }, (_, d) => `<span class="cd-d">${d}</span>`).join('');
  return `<div class="cd-window"><div class="cd-reel">${strip}</div></div>`;
}

export function startCountdown(root, target) {
  if (!root) return () => {};
  let reels = [];
  let finished = false;

  function paint(value, instant = false) {
    const all = digitsOf(value);
    for (let i = 0; i < reels.length; i++) {
      const chars = all[i].split('');
      if (reels[i].length !== chars.length) { build(value); return; }
      reels[i].forEach((reel, j) => {
        if (instant) reel.style.transition = 'none';
        reel.style.transform = `translateY(${-Number(chars[j]) * 10}%)`;
        if (instant) { void reel.offsetHeight; reel.style.transition = ''; }
      });
    }
  }

  function build(value) {
    root.innerHTML = `<div class="cd-grid" aria-hidden="true">${UNITS.map(([key, label]) => `<div class="cd-cell${key === 'seconds' ? ' cd-sec' : ''}"><div class="cd-digits">${String(value[key]).padStart(2, '0').split('').map(reelHTML).join('')}</div><span class="cd-label">${label}</span></div>`).join('')}</div>`;
    reels = [...root.querySelectorAll('.cd-cell')].map((cell) => [...cell.querySelectorAll('.cd-reel')]);
    paint(value, true);
  }

  function tick() {
    const value = parts(target);
    root.setAttribute('aria-label', value.done ? 'Promotion terminée' : `${value.days} jours, ${value.hours} heures, ${value.minutes} minutes et ${value.seconds} secondes restantes`);
    if (value.done) {
      if (!finished) { finished = true; root.innerHTML = '<span class="text-promo">PROMOTION TERMINÉE</span><span class="text-sm font-semibold text-white/70">Prochaine offre bientôt</span>'; }
      window.clearInterval(timer);
      return;
    }
    paint(value);
  }

  build(parts(target));
  tick();
  const timer = window.setInterval(tick, 1000);
  return () => window.clearInterval(timer);
}
