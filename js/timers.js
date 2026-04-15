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
  ['changeover','piecetype','waiting'].forEach(type => {
    const t = transState[type];
    if (t && t.active && t.startTime) {
      t.elapsed = Math.floor((now - t.startTime) / 1000);
      const timerEl = document.getElementById('trans-timer-' + type);
      if (timerEl) timerEl.textContent = fmtTrans(t.elapsed);
    }
  });
  _resyncPurge();
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
  piecetype:  { active: false, startTime: null, elapsed: 0, interval: null },
  waiting:    { active: false, startTime: null, elapsed: 0, interval: null },
};

const _TRANS_CONFIG = {
  changeover: { label: 'Changeover',    color: '#e8457a', detail: 'transition' },
  piecetype:  { label: 'New Piece Type', color: '#3355cc', detail: 'transition' },
  waiting:    { label: 'Waiting',        color: '#4466ee', detail: 'waiting'    },
};

function fmtTrans(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

const _TRANS_COLORS = {
  changeover: { bg: '#e8457a', border: '#c0305a' },
  piecetype:  { bg: '#3355cc', border: '#2244aa' },
  waiting:    { bg: '#4466ee', border: '#2244cc' },
};

function transitionToggle(type) {
  const t = transState[type];
  if (!t) return;
  const btn     = document.getElementById('trans-btn-' + type);
  const timerEl = document.getElementById('trans-timer-' + type);

  if (!t.active) {
    // Stop every other active transition and purge
    Object.keys(transState).forEach(k => {
      if (k !== type && transState[k].active) transitionStop(k, true);
    });
    if (purgeRunning) purgeCancel();

    // Start this one
    t.active    = true;
    t.startTime = Date.now();
    t.elapsed   = 0;

    // Apply active state — CSS class + inline style fallback
    if (btn) {
      btn.classList.add('active-' + type);
      const c = _TRANS_COLORS[type];
      if (c) {
        btn.style.background   = c.bg;
        btn.style.borderColor  = c.border;
        btn.style.color        = '#fff';
      }
    }

    t.interval  = setInterval(() => {
      t.elapsed = Math.floor((Date.now() - t.startTime) / 1000);
      if (timerEl) timerEl.textContent = fmtTrans(t.elapsed);
    }, 500);
  } else {
    transitionStop(type, false);
  }
}

function transitionStop(type, silent) {
  const t = transState[type];
  if (!t || !t.active) return;

  clearInterval(t.interval);
  t.active      = false;
  const elapsed = Math.floor((Date.now() - t.startTime) / 1000);
  t.elapsed     = elapsed;

  const btn     = document.getElementById('trans-btn-' + type);
  const timerEl = document.getElementById('trans-timer-' + type);
  if (btn) {
    btn.classList.remove('active-changeover', 'active-piecetype', 'active-waiting');
    btn.style.background  = '';
    btn.style.borderColor = '';
    btn.style.color       = '';
  }
  if (timerEl) timerEl.textContent = '00:00';

  if (!silent && elapsed >= 1) {
    const machine = document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
    const cfg     = _TRANS_CONFIG[type] || { label: type, color: '#999', detail: '' };
    const entry   = {
      type:   cfg.label,
      detail: fmtTrans(elapsed) + ' ' + cfg.detail,
      notes:  '',
      color:  cfg.color,
      time:   new Date().toISOString(),
    };
    if (!machineEvents[machine]) machineEvents[machine] = [];
    machineEvents[machine].unshift({ ...entry, time: new Date() });
    if (window._fb) window._fb.saveMachineEvent(machine, entry);
    if (type === 'waiting' && window._fb) {
      window._fb.saveWaitEntry({ ...entry, machine });
    }
    localSaveMachineEvent(machine, entry);
    renderReports();
  }
}

// Stop all active transitions when a run starts or view changes
function stopAllTransitions() {
  Object.keys(transState).forEach(k => {
    if (transState[k].active) transitionStop(k, true);
  });
  if (purgeRunning) purgeCancel();
}

// ── PURGE TIMER ──
const PURGE_DURATION = 60; // seconds
let purgeRunning   = false;
let purgeInterval  = null;
let purgeStartWall = 0;

function fmtPurge(sec) {
  const s = Math.max(0, sec);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function purgeToggle() {
  if (!purgeRunning) {
    purgeStart();
  } else {
    purgeCancel();
  }
}

function purgeStart() {
  purgeRunning   = true;
  purgeStartWall = Date.now();

  const btn     = document.getElementById("trans-btn-purge");
  const timerEl = document.getElementById("trans-timer-purge");
  if (btn) {
    btn.classList.add("active-purge");
    btn.style.background  = '#e87820';
    btn.style.borderColor = '#b85808';
    btn.style.color       = '#fff';
  }
  if (timerEl) timerEl.textContent = fmtPurge(PURGE_DURATION);

  purgeInterval = setInterval(() => {
    const elapsed    = Math.floor((Date.now() - purgeStartWall) / 1000);
    const remaining  = PURGE_DURATION - elapsed;
    const el         = document.getElementById("trans-timer-purge");
    if (el) el.textContent = fmtPurge(remaining);
    if (remaining <= 0) purgeComplete();
  }, 500);
}

function purgeComplete() {
  clearInterval(purgeInterval);
  purgeInterval = null;
  purgeRunning  = false;

  const btn     = document.getElementById("trans-btn-purge");
  const timerEl = document.getElementById("trans-timer-purge");
  if (btn) {
    btn.classList.remove("active-purge");
    btn.style.background  = '';
    btn.style.borderColor = '';
    btn.style.color       = '';
  }
  if (timerEl) timerEl.textContent = fmtPurge(PURGE_DURATION);

  // Flash green to signal done
  if (btn) {
    btn.style.background  = '#52a040';
    btn.style.borderColor = '#3a7a2c';
    btn.style.color       = '#fff';
    btn.classList.add("purge-done");
    setTimeout(() => {
      btn.classList.remove("purge-done");
      btn.style.background  = '';
      btn.style.borderColor = '';
      btn.style.color       = '';
    }, 2500);
  }

  _purgeLog("1:00 purge cycle completed", true);
}

function purgeCancel() {
  if (!purgeRunning) return;
  clearInterval(purgeInterval);
  purgeInterval = null;
  purgeRunning  = false;

  const elapsed = Math.floor((Date.now() - purgeStartWall) / 1000);
  const btn     = document.getElementById("trans-btn-purge");
  const timerEl = document.getElementById("trans-timer-purge");
  if (btn) {
    btn.classList.remove("active-purge");
    btn.style.background  = '';
    btn.style.borderColor = '';
    btn.style.color       = '';
  }
  if (timerEl) timerEl.textContent = fmtPurge(PURGE_DURATION);

  if (elapsed >= 2) _purgeLog(fmtPurge(elapsed) + " (cancelled early)", false);
}

function _purgeLog(detail, completed) {
  const machine = document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  const entry = {
    type:   "Purge",
    detail,
    notes:  "",
    color:  "#e87820",
    time:   new Date().toISOString(),
  };
  if (!machineEvents[machine]) machineEvents[machine] = [];
  machineEvents[machine].unshift({ ...entry, time: new Date() });
  if (window._fb) window._fb.saveMachineEvent(machine, entry);
  localSaveMachineEvent(machine, entry);
  renderReports();
}

// Resync purge on page visibility restore
function _resyncPurge() {
  if (!purgeRunning || !purgeStartWall) return;
  const elapsed   = Math.floor((Date.now() - purgeStartWall) / 1000);
  const remaining = PURGE_DURATION - elapsed;
  const el        = document.getElementById("trans-timer-purge");
  if (el) el.textContent = fmtPurge(remaining);
  if (remaining <= 0) purgeComplete();
}
