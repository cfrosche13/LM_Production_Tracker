let inChangeover = false;

function resyncAllTimers() {
  const now = Date.now();
  if (runRunning && !runPaused && runStartWall) {
    runSec = Math.floor((now - runStartWall - runPausedMs) / 1000);
    const el = document.getElementById("run-timer-display");
    if (el) el.textContent = fmt(runSec);
  }
  if (waitRunning && waitStartWall) {
    waitSec = Math.floor((now - waitStartWall) / 1000);
    const el = document.getElementById("wait-display");
    if (el) el.textContent = fmt(waitSec);
  }
  if (mechFixRunning && mechFixStartWall) {
    mechFixSec = Math.floor((now - mechFixStartWall) / 1000);
    const el = document.getElementById("mech-fix-timer");
    if (el) el.textContent = fmt(mechFixSec);
  }
  if (cleanRunning && cleanStartWall) {
    cleanSec = Math.floor((now - cleanStartWall) / 1000);
    const el = document.getElementById("clean-timer-display");
    if (el) el.textContent = fmt(cleanSec);
  }
  if (stRunning && stStartWall) {
    stSec = Math.floor((now - stStartWall) / 1000);
    const m = String(Math.floor(stSec / 60)).padStart(2, '0');
    const s = String(stSec % 60).padStart(2, '0');
    const el = document.getElementById('st-timer-display');
    if (el) el.textContent = m + ':' + s;
  }
  ['changeover','piecetype'].forEach(type => {
    const t = transState[type];
    if (t && t.active && t.startTime) {
      t.elapsed = Math.floor((now - t.startTime) / 1000);
      const timerEl = document.getElementById('trans-timer-' + type);
      if (timerEl) timerEl.textContent = fmtTrans(t.elapsed);
    }
  });
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) resyncAllTimers(); });

document.addEventListener("DOMContentLoaded", () => {
  const scrollEl = document.getElementById("reports-grid-scroll");
  const wrapEl   = document.getElementById("reports-grid-scroll-wrap");
  if (scrollEl && wrapEl) {
    scrollEl.addEventListener("scroll", () => {
      const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 8;
      wrapEl.classList.toggle("at-bottom", atBottom);
    });
  }
});

window.addEventListener("focus", resyncAllTimers);
window.addEventListener("pageshow", resyncAllTimers);

let transState = {
  changeover: { active: false, startTime: null, elapsed: 0, interval: null },
  piecetype:  { active: false, startTime: null, elapsed: 0, interval: null }
};

function fmtTrans(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function transitionToggle(type) {
  const other = type === 'changeover' ? 'piecetype' : 'changeover';
  const t = transState[type];
  const btn = document.getElementById('trans-btn-' + type);
  const timerEl = document.getElementById('trans-timer-' + type);

  if (!t.active) {
    // Stop the other if running
    if (transState[other].active) transitionStop(other, true);

    // Start this one
    t.active = true;
    t.startTime = Date.now();
    t.elapsed = 0;
    btn.classList.add(type === 'changeover' ? 'active-changeover' : 'active-piecetype');
    t.interval = setInterval(() => {
      t.elapsed = Math.floor((Date.now() - t.startTime) / 1000);
      timerEl.textContent = fmtTrans(t.elapsed);
    }, 500);
  } else {
    transitionStop(type, false);
  }
}

function transitionStop(type, silent) {
  const t = transState[type];
  if (!t.active) return;

  clearInterval(t.interval);
  t.active = false;
  const elapsed = Math.floor((Date.now() - t.startTime) / 1000);
  t.elapsed = elapsed;

  const btn = document.getElementById('trans-btn-' + type);
  const timerEl = document.getElementById('trans-timer-' + type);
  btn.classList.remove('active-changeover', 'active-piecetype');
  timerEl.textContent = '00:00';

  if (!silent && elapsed >= 1) {
    // Log to the active machine's events
    const machine = document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
    const label = type === 'changeover' ? 'Changeover' : 'New Piece Type';
    const color = type === 'changeover' ? '#e8457a' : '#3355cc';
    const entry = {
      type: label,
      detail: fmtTrans(elapsed) + ' transition',
      notes: '',
      color,
      time: new Date().toISOString()
    };
    if (!machineEvents[machine]) machineEvents[machine] = [];
    machineEvents[machine].unshift({ ...entry, time: new Date() });
    if (window._fb) window._fb.saveMachineEvent(machine, entry);
    localSaveMachineEvent(machine, entry);
    renderReports();
  }
}

// Stop active transition timers when a run starts or a view changes
function stopAllTransitions() {
  if (transState.changeover.active) transitionStop('changeover', true);
  if (transState.piecetype.active)  transitionStop('piecetype', true);
}
