import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDUlCZgxYV-vfFhWop1jX_8VVvjJYAA2-M",
  authDomain:        "eg-studio-production-tracker.firebaseapp.com",
  databaseURL:       "https://eg-studio-production-tracker-default-rtdb.firebaseio.com",
  projectId:         "eg-studio-production-tracker",
  storageBucket:     "eg-studio-production-tracker.firebasestorage.app",
  messagingSenderId: "284937225937",
  appId:             "1:284937225937:web:2dcb59fe049e90d76967f0"
};

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);
const TEAM_EMAIL = "team@printtrack.internal";

// ── Login ──
function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app").style.display = "none";
}
function hideLogin() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
}

document.getElementById("login-btn").addEventListener("click", () => {
  const pass = document.getElementById("login-pass").value;
  document.getElementById("login-err").textContent = "";
  document.getElementById("login-btn").textContent = "Unlocking…";
  signInWithEmailAndPassword(auth, TEAM_EMAIL, pass).catch(() => {
    document.getElementById("login-err").textContent = "Incorrect passcode.";
    document.getElementById("login-btn").textContent = "Unlock";
    document.getElementById("login-pass").value = "";
    document.getElementById("login-pass").focus();
  });
});
document.getElementById("login-pass").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});
document.getElementById("lock-btn").addEventListener("click", () => signOut(auth));

// ── Auth state ──
onAuthStateChanged(auth, user => {
  if (user) { hideLogin(); startListeners(); }
  else       { showLogin(); }
});

// ── Data stores ──
let _sessions   = {};
let _maint      = [];
let _wait       = [];
let _targets    = {};
let _openOrders = null;
let _shiftLog   = {}; // { "YYYY-MM-DD": [ {op, event, time}, ... ] }
let _liveState  = {}; // { machine: { startWall, pausedMs, paused, pauseStartWall, mode, op, pieceType } }
let _liveStateReceived = false; // set true once Firebase liveState path responds

// ── Listeners ──
function startListeners() {
  // Tick live timers every second once authenticated
  setInterval(renderLiveTimers, 1000);
  onValue(ref(db, "sessions"),   snap => { _sessions   = parseSessionsSnap(snap.val() || {}); render(); });
  onValue(ref(db, "maintLog"),   snap => { _maint      = parseLog(snap.val() || {}); render(); });
  onValue(ref(db, "waitLog"),    snap => { _wait       = parseLog(snap.val() || {}); render(); });
  onValue(ref(db, "targets"),    snap => { _targets    = snap.val() || {}; render(); });
  onValue(ref(db, "openOrders"), snap => { _openOrders = snap.val() || null; render(); });
  onValue(ref(db, "shiftLog"),   snap => {
    const raw = snap.val() || {};
    _shiftLog = {};
    Object.entries(raw).forEach(([date, entries]) => {
      _shiftLog[date] = Object.values(entries)
        .filter(Boolean)
        .map(e => ({ ...e, time: e.time ? new Date(e.time) : new Date() }))
        .sort((a,b) => a.time - b.time);
    });
    renderLiveTimers();
  });
  onValue(ref(db, "liveState"),  snap => {
    _liveState = snap.val() || {};
    renderLiveTimers();
    renderSummaryBar();
    // Hide rules banner once we receive ANY liveState data (even empty — proves path is readable)
    _liveStateReceived = true;
    const banner = document.getElementById('live-rules-banner');
    if (banner) banner.style.display = 'none';
  });

  // Show diagnostic banner after 8s only if Firebase liveState path never responded
  // (empty liveState just means no machines are running right now — that's normal)
  setTimeout(() => {
    if (!_liveStateReceived) {
      const banner = document.getElementById('live-rules-banner');
      if (banner && window._mgTab === 'live') banner.style.display = 'block';
    }
  }, 8000);
  // Also show banner when switching to live tab if path never responded
  window._showBannerIfNeeded = () => {
    const banner = document.getElementById('live-rules-banner');
    if (!banner) return;
    banner.style.display = !_liveStateReceived ? 'block' : 'none';
  };
}

function parseSessionsSnap(raw) {
  const out = {};
  Object.entries(raw).forEach(([machine, sessions]) => {
    out[machine] = Object.values(sessions).map(s => ({
      ...s, time: s.time ? new Date(s.time) : new Date()
    })).sort((a,b) => b.time - a.time);
  });
  return out;
}
function parseLog(raw) {
  return Object.values(raw).map(e => ({
    ...e, time: e.time ? new Date(e.time) : new Date()
  })).sort((a,b) => b.time - a.time);
}

// ── Helpers ──
function localDateStr(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth()+1).padStart(2,"0") + "-" +
    String(d.getDate()).padStart(2,"0");
}
function fmt(s) {
  s = Math.floor(Math.max(0, s || 0));
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function fmtTime(d) { return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }
function fmtDateTime(d) {
  return d.toLocaleDateString([],{month:"short",day:"numeric"}) + " " + fmtTime(d);
}

// ── Date range ──
window._mgDateFrom = localDateStr(new Date());
window._mgDateTo   = localDateStr(new Date());

function inRange(d) {
  if (!d) return false;
  const ds = localDateStr(d instanceof Date ? d : new Date(d));
  return ds >= window._mgDateFrom && ds <= window._mgDateTo;
}

// ── Machine visibility (persisted to localStorage) ──
const LS_KEY = "printtrack_hidden_machines";
function loadHidden() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveHidden(set) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])); } catch {}
}
window.saveHidden = saveHidden;
window._hiddenMachines = loadHidden();

window.toggleMachineVisibility = function(machine) {
  if (window._hiddenMachines.has(machine)) window._hiddenMachines.delete(machine);
  else window._hiddenMachines.add(machine);
  saveHidden(window._hiddenMachines);
  renderMachineManagerModal();
  renderMachineGrid();
  renderDrilldown();
};

window.openMachineManager = function() {
  document.getElementById("machine-manager-overlay").style.display = "flex";
  renderMachineManagerModal();
};
window.closeMachineManager = function() {
  document.getElementById("machine-manager-overlay").style.display = "none";
};

function renderMachineManagerModal() {
  const MACHINES = ["30","30+","H5","Colex","Wallets","Drinkware"];
  const allMachines = [...new Set([...MACHINES, ...Object.keys(_sessions)])];
  const list = document.getElementById("machine-manager-list");
  if (!list) return;
  list.innerHTML = "";
  allMachines.forEach(m => {
    const hidden = window._hiddenMachines.has(m);
    const item = document.createElement("div");
    item.className = "mm-item" + (hidden ? " mm-hidden" : "");
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="mm-toggle ${hidden ? '' : 'mm-toggle-on'}" onclick="toggleMachineVisibility('${m}')">
          <div class="mm-toggle-knob"></div>
        </div>
        <span class="mm-label" style="color:${hidden ? '#b0c8a8' : '#1a2a18'};">${m}</span>
      </div>
      <span class="mm-state-lbl" style="color:${hidden ? '#cc3333' : '#52a040'};">${hidden ? 'Hidden' : 'Visible'}</span>
    `;
    list.appendChild(item);
  });
  // Update hidden count badge on the button
  updateManageBtnBadge();
}

function updateManageBtnBadge() {
  const badge = document.getElementById("manage-machines-badge");
  const n = window._hiddenMachines.size;
  if (badge) {
    badge.textContent = n;
    badge.style.display = n > 0 ? "inline-flex" : "none";
  }
}

// ── Drilldown state ──
window._drillMachine = null;
window._ddTab = "sessions";

// ── Active top-level tab ──
window._mgTab = "overview"; // "overview" | "live"

// ── Main render ──
function render() {
  renderSummaryBar();
  if (window._mgTab === "overview") {
    renderMachineGrid();
    renderActivityFeed();
    renderDrilldown();
  }
  updateLastSync();
}

function updateLastSync() {
  const el = document.getElementById("last-sync");
  if (el) el.textContent = "Live · " + new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

// ─────────────────────────────────────────
// SUMMARY BAR
// ─────────────────────────────────────────
function renderSummaryBar() {
  let totalGood=0, totalBad=0, totalSec=0, activeMachines=new Set();
  Object.entries(_sessions).forEach(([m, sessions]) => {
    sessions.filter(s=>inRange(s.time)).forEach(s => {
      totalGood += s.qtyGood||0;
      totalBad  += s.qtyBad||0;
      totalSec  += s.totalSec||0;
      activeMachines.add(m);
    });
  });
  const maintToday   = _maint.filter(e=>inRange(e.time));
  const downNow      = _maint.some(e=>e.type==="Machine Down" && inRange(e.time));
  const totalWaitSec = _wait.filter(e=>inRange(e.time)).reduce((s,e)=>s+(e.duration||0),0);
  const liveCount    = Object.keys(_liveState).length;

  document.getElementById("sum-good").textContent    = totalGood.toLocaleString();
  document.getElementById("sum-bad").textContent     = totalBad.toLocaleString();
  document.getElementById("sum-runtime").textContent = fmt(totalSec);
  document.getElementById("sum-machines").textContent= activeMachines.size;
  document.getElementById("sum-maint").textContent   = maintToday.length;
  document.getElementById("sum-wait").textContent    = fmt(totalWaitSec);

  const downBadge = document.getElementById("sum-down-badge");
  if (downBadge) downBadge.style.display = downNow ? "inline-block" : "none";

  // Live running pill on the Live tab button
  const livePill = document.getElementById("live-tab-pill");
  if (livePill) {
    const idleCount = getMachinesTodaySet ? [...getMachinesTodaySet()].filter(m => !_liveState[m]).length : 0;
    const total = liveCount + idleCount;
    livePill.textContent = total;
    livePill.style.display = total > 0 ? "inline-flex" : "none";
    livePill.style.background = liveCount > 0 ? "#e8457a" : "#cc8800";
  }
}

// ─────────────────────────────────────────
// MACHINE GRID
// ─────────────────────────────────────────
function renderMachineGrid() {
  const MACHINES = ["30","30+","H5","Colex","Wallets","Drinkware"];
  const grid = document.getElementById("machine-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const allMachines = [...new Set([...MACHINES, ...Object.keys(_sessions)])];
  updateManageBtnBadge();

  allMachines.forEach(machine => {
    // Skip hidden machines
    if (window._hiddenMachines.has(machine)) return;

    const sessions = (_sessions[machine]||[]).filter(s=>inRange(s.time));
    const hasMaint  = _maint.some(e=>(e.machine||"")==machine && inRange(e.time));
    if (!sessions.length && !hasMaint) return;

    const qtyGood    = sessions.reduce((s,r)=>s+(r.qtyGood||0),0);
    const qtyBad     = sessions.reduce((s,r)=>s+(r.qtyBad||0),0);
    const totalSec   = sessions.reduce((s,r)=>s+(r.totalSec||0),0);
    const changeovers= sessions.reduce((s,r)=>s+(r.changeovers||0),0);

    const maintEntries = _maint.filter(e=>(e.machine||"Unassigned")===machine && inRange(e.time));
    const isDown = maintEntries.some(e=>e.type==="Machine Down");
    const hasFix = maintEntries.some(e=>e.type==="Operator Fix");
    const isLive = !!_liveState[machine];

    const operators  = [...new Set(sessions.map(s=>s.op).filter(Boolean))];
    const pieceTypes = [...new Set(sessions.map(s=>s.pieceType).filter(Boolean))];
    const isSelected = window._drillMachine === machine;

    const card = document.createElement("div");
    card.className = "machine-card" + (isSelected ? " selected" : "");

    let statusBadge = "";
    if (isLive)      statusBadge += `<span class="badge badge-live">▶ LIVE</span> `;
    if (isDown)      statusBadge += `<span class="badge badge-down">⬇ DOWN</span>`;
    else if (hasFix) statusBadge += `<span class="badge badge-fix">⚙ Fix</span>`;

    card.innerHTML = `
      <div class="mc-header">
        <div class="mc-name">${machine}</div>
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">${statusBadge}<span class="mc-sessions">${sessions.length} run${sessions.length!==1?"s":""}</span></div>
      </div>
      <div class="mc-stats">
        <div class="mc-stat"><div class="mc-stat-val" style="color:#e8457a;">${qtyGood.toLocaleString()}</div><div class="mc-stat-lbl">Good</div></div>
        <div class="mc-stat"><div class="mc-stat-val" style="color:#cc3333;">${qtyBad.toLocaleString()}</div><div class="mc-stat-lbl">Bad</div></div>
        <div class="mc-stat"><div class="mc-stat-val" style="color:#336688;font-size:14px;">${fmt(totalSec)}</div><div class="mc-stat-lbl">Run Time</div></div>
        <div class="mc-stat"><div class="mc-stat-val" style="color:#888;">${changeovers}</div><div class="mc-stat-lbl">C/O</div></div>
      </div>
      ${operators.length  ? `<div class="mc-tags">${operators.map(o=>`<span class="mc-tag op-tag">${o}</span>`).join("")}</div>` : ""}
      ${pieceTypes.length ? `<div class="mc-tags">${pieceTypes.map(p=>`<span class="mc-tag">${p}</span>`).join("")}</div>` : ""}
      <div class="mc-footer">Tap for detail ▸</div>
    `;
    card.onclick = () => {
      window._drillMachine = (window._drillMachine === machine) ? null : machine;
      renderMachineGrid();
      renderDrilldown();
    };
    grid.appendChild(card);
  });

  if (!grid.children.length) {
    grid.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:13px;color:#90b888;padding:32px;text-align:center;">No production data for this date range.</div>`;
  }
}

// ─────────────────────────────────────────
// LIVE TIMERS VIEW
// ─────────────────────────────────────────

// Returns the most recent activity timestamp (ms) for a machine today,
// considering sessions, maintenance, and waiting entries.
function getLastActivityMs(machine) {
  const todayStr = localDateStr(new Date());
  let latest = 0;

  // Sessions
  (_sessions[machine] || []).forEach(s => {
    if (localDateStr(s.time) === todayStr) {
      const t = s.time instanceof Date ? s.time.getTime() : new Date(s.time).getTime();
      if (t > latest) latest = t;
    }
  });
  // Maintenance
  _maint.forEach(e => {
    if ((e.machine || "Unassigned") !== machine) return;
    if (!e.time) return;
    const d = e.time instanceof Date ? e.time : new Date(e.time);
    if (localDateStr(d) === todayStr) {
      const t = d.getTime();
      if (t > latest) latest = t;
    }
  });
  // Waiting
  _wait.forEach(e => {
    if ((e.machine || "") !== machine) return;
    if (!e.time) return;
    const d = e.time instanceof Date ? e.time : new Date(e.time);
    if (localDateStr(d) === todayStr) {
      const t = d.getTime();
      if (t > latest) latest = t;
    }
  });

  return latest; // 0 means no activity today
}

// A machine's day is "open" (idle card should show) unless:
//   - There is an "end" entry for this machine in today's shiftLog, AND
//   - That end entry is newer than the most recent activity on this machine.
// If new activity arrives after an end entry, the machine reopens automatically.
// If shiftLog has no entries at all today, all machines are treated as open
// (backwards-compatible — works even if nobody taps End Day).
function isMachineShiftOpen(machine) {
  const todayStr     = localDateStr(new Date());
  const todayEntries = (_shiftLog[todayStr] || []).filter(e => e.machine === machine && e.event === "end");

  // No end entry for this machine today → shift is open
  if (todayEntries.length === 0) return true;

  // Most recent end entry for this machine
  const lastEnd = todayEntries.reduce((latest, e) => {
    const t = e.time instanceof Date ? e.time : new Date(e.time);
    return t > latest ? t : latest;
  }, new Date(0));

  // Most recent activity on this machine today (sessions + maint + wait)
  const lastActivity = getLastActivityMs(machine);

  // If any activity is newer than the end entry → reopen
  if (lastActivity > lastEnd.getTime()) return true;

  // End entry is the most recent event → shift is closed
  return false;
}

// Collect all machines that have had any activity today
function getMachinesTodaySet() {
  const todayStr = localDateStr(new Date());
  const machines = new Set();
  Object.entries(_sessions).forEach(([m, sessions]) => {
    if (sessions.some(s => localDateStr(s.time) === todayStr)) machines.add(m);
  });
  _maint.forEach(e => {
    if (!e.time) return;
    const d = e.time instanceof Date ? e.time : new Date(e.time);
    if (localDateStr(d) === todayStr && e.machine) machines.add(e.machine);
  });
  _wait.forEach(e => {
    if (!e.time) return;
    const d = e.time instanceof Date ? e.time : new Date(e.time);
    if (localDateStr(d) === todayStr && e.machine) machines.add(e.machine);
  });
  return machines;
}

function renderLiveTimers() {
  const wrap = document.getElementById("live-timers-wrap");
  if (!wrap) return;

  const liveEntries    = Object.entries(_liveState);
  const liveMachines   = new Set(liveEntries.map(([m]) => m));
  const todayMachines  = getMachinesTodaySet();
  // Machines active today but NOT currently running → candidates for idle cards
  const idleMachines   = [...todayMachines].filter(m => !liveMachines.has(m) && isMachineShiftOpen(m));

  const hasAnything = liveEntries.length > 0 || idleMachines.length > 0;

  if (!hasAnything) {
    if (!wrap.querySelector('.live-card, .idle-card')) {
      wrap.innerHTML = `
        <div id="live-empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;">
          <div style="font-size:48px;">⏱</div>
          <div style="font-family:'Abril Fatface',serif;font-size:22px;color:#b8d0b8;">No machines running</div>
          <div style="font-family:'Josefin Slab',serif;font-size:12px;color:#90b888;text-align:center;">
            When an operator starts a print run, their live timer will appear here.<br>
            Make sure you are using the updated app and that Firebase rules allow writes to <strong>liveState</strong>.
          </div>
        </div>`;
    }
    return;
  }

  // Remove empty state if it exists
  const emptyEl = document.getElementById('live-empty-state');
  if (emptyEl) emptyEl.remove();

  // Index existing cards to allow in-place updates
  const existingLive = {};
  wrap.querySelectorAll(".live-card").forEach(c => { existingLive[c.dataset.machine] = c; });
  const existingIdle = {};
  wrap.querySelectorAll(".idle-card").forEach(c => { existingIdle[c.dataset.machine] = c; });

  const now = Date.now();

  // ── Active / paused run cards ──
  liveEntries.forEach(([machine, state]) => {
    const startWall = Number(state.startWall) || 0;
    if (startWall < 1577836800000 || startWall > now + 60000) return;

    let elapsedSec;
    if (state.paused) {
      const pauseStart = Number(state.pauseStartWall) || now;
      elapsedSec = Math.floor((pauseStart - startWall - (state.pausedMs||0)) / 1000);
    } else {
      elapsedSec = Math.floor((now - startWall - (state.pausedMs||0)) / 1000);
    }
    if (elapsedSec < 0) elapsedSec = 0;

    const modeLabel = formatMode(state.mode || "");
    const modeColor = modeColorFor(state.mode || "");

    if (existingLive[machine]) {
      const card = existingLive[machine];
      const runColor    = state.paused ? "#cc8800" : "#228844";
      const runBorder   = state.paused ? "#f0d080" : "#a8e8c0";
      const runBg       = state.paused ? "#fffbf0" : "#f0fbf5";
      const timerEl = card.querySelector(".lt-timer");
      if (timerEl) {
        timerEl.textContent = fmt(elapsedSec);
        timerEl.style.color = runColor;
        timerEl.style.opacity = "1";
      }
      const statusEl = card.querySelector(".lt-status");
      if (statusEl) {
        statusEl.textContent = state.paused ? "⏸ PAUSED" : "▶ RUNNING";
        statusEl.style.color = runColor;
        statusEl.style.background = runBg;
        statusEl.style.borderColor = runBorder;
      }
      const pulseEl = card.querySelector(".lt-pulse-fill");
      if (pulseEl) pulseEl.style.background = runColor;
      card.style.borderColor = runBorder;
      const ptEl = card.querySelector(".lt-piecetype");
      if (ptEl) ptEl.textContent = state.pieceType || "Piece type not set";
      const opEl = card.querySelector(".lt-op");
      if (opEl) opEl.textContent = state.op || "No operator";
    } else {
      const card = document.createElement("div");
      card.className = "live-card";
      card.dataset.machine = machine;
      const startedAt = startWall ? new Date(startWall) : null;
      const runColor  = "#228844";
      const runBorder = "#a8e8c0";
      const runBg     = "#f0fbf5";
      card.style.borderColor = runBorder;
      card.innerHTML = `
        <div class="lt-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="lt-machine">${machine}</div>
            <div class="lt-mode" style="color:${modeColor};border-color:${modeColor}40;background:${modeColor}10;">${modeLabel}</div>
          </div>
          <div class="lt-status" style="color:${runColor};background:${runBg};border:1px solid ${runBorder};">▶ RUNNING</div>
        </div>
        <div class="lt-timer" style="color:${runColor};">${fmt(elapsedSec)}</div>
        <div class="lt-timer-label">Elapsed time</div>
        <div class="lt-meta-row">
          <div class="lt-meta-block">
            <div class="lt-meta-lbl">Operator</div>
            <div class="lt-op lt-meta-val">${state.op || "No operator"}</div>
          </div>
          <div class="lt-meta-block">
            <div class="lt-meta-lbl">Piece Type</div>
            <div class="lt-piecetype lt-meta-val">${state.pieceType || "Not set yet"}</div>
          </div>
          <div class="lt-meta-block">
            <div class="lt-meta-lbl">Started At</div>
            <div class="lt-meta-val">${startedAt ? fmtTime(startedAt) : "—"}</div>
          </div>
        </div>
        <div class="lt-pulse-bar">
          <div class="lt-pulse-fill" style="background:${runColor};"></div>
        </div>
      `;
      // Insert live cards before any idle cards so they always appear first
      const firstIdle = wrap.querySelector(".idle-card");
      wrap.insertBefore(card, firstIdle || null);
    }
  });

  // Remove live cards for machines no longer in liveState
  Object.entries(existingLive).forEach(([machine, card]) => {
    if (!_liveState[machine]) card.remove();
  });

  // ── Idle cards ──
  idleMachines.forEach(machine => {
    const lastMs   = getLastActivityMs(machine);
    const idleSec  = lastMs > 0 ? Math.floor((now - lastMs) / 1000) : 0;

    // Describe what the most recent activity was
    function getLastActivityLabel(machine) {
      const todayStr = localDateStr(new Date());
      let latest = 0, label = "—";

      (_sessions[machine] || []).forEach(s => {
        if (localDateStr(s.time) !== todayStr) return;
        const t = s.time instanceof Date ? s.time.getTime() : new Date(s.time).getTime();
        if (t > latest) { latest = t; label = "Print run · " + (s.pieceType || ""); }
      });
      _maint.forEach(e => {
        if ((e.machine || "Unassigned") !== machine || !e.time) return;
        const d = e.time instanceof Date ? e.time : new Date(e.time);
        if (localDateStr(d) !== todayStr) return;
        const t = d.getTime();
        if (t > latest) { latest = t; label = e.type || "Maintenance"; }
      });
      _wait.forEach(e => {
        if ((e.machine || "") !== machine || !e.time) return;
        const d = e.time instanceof Date ? e.time : new Date(e.time);
        if (localDateStr(d) !== todayStr) return;
        const t = d.getTime();
        if (t > latest) { latest = t; label = "Waiting"; }
      });
      return label;
    }

    const idleText   = "#cc3333";
    const idleBorder = "#f0b8b8";
    const idleBg     = "#fff5f5";
    const col = { text: idleText, border: idleBorder, bg: idleBg, status: idleText, statusBg: idleBg, statusBorder: idleBorder };
    const lastLabel = getLastActivityLabel(machine);

    if (existingIdle[machine]) {
      const card    = existingIdle[machine];
      const timerEl = card.querySelector(".idle-timer");
      if (timerEl) { timerEl.textContent = fmt(idleSec); timerEl.style.color = col.text; }
      const statusEl = card.querySelector(".idle-status");
      if (statusEl) { statusEl.style.color = col.status; statusEl.style.background = col.statusBg; statusEl.style.borderColor = col.statusBorder; }
      // Update border color to reflect severity
      card.style.borderColor = col.border;
    } else {
      const card = document.createElement("div");
      card.className = "idle-card";
      card.dataset.machine = machine;
      card.style.cssText = `background:#fff;border:1.5px solid ${col.border};border-radius:16px;padding:22px 24px;box-shadow:0 2px 16px rgba(0,0,0,0.04);position:relative;overflow:hidden;`;
      card.innerHTML = `
        <div class="lt-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="lt-machine" style="color:#888;">${machine}</div>
          </div>
          <div class="idle-status lt-status" style="color:${col.status};background:${col.statusBg};border:1px solid ${col.statusBorder};">⏸ IDLE</div>
        </div>
        <div class="idle-timer lt-timer" style="color:${col.text};">${fmt(idleSec)}</div>
        <div class="lt-timer-label">Time since last activity</div>
        <div class="lt-meta-row" style="grid-template-columns:1fr 1fr;">
          <div class="lt-meta-block">
            <div class="lt-meta-lbl">Last Activity</div>
            <div class="lt-meta-val" style="color:#888;">${lastLabel}</div>
          </div>
          <div class="lt-meta-block">
            <div class="lt-meta-lbl">At</div>
            <div class="lt-meta-val" style="color:#888;">${lastMs ? fmtTime(new Date(lastMs)) : "—"}</div>
          </div>
        </div>
        <div class="lt-pulse-bar" style="background:#f0f0f0;">
          <div style="height:100%;width:100%;background:repeating-linear-gradient(90deg,#e0e0e0 0px,#e0e0e0 8px,transparent 8px,transparent 16px);opacity:0.6;"></div>
        </div>
      `;
      wrap.appendChild(card);
    }
  });

  // Remove idle cards for machines that started a run or had no activity today
  Object.entries(existingIdle).forEach(([machine, card]) => {
    if (liveMachines.has(machine) || !todayMachines.has(machine)) card.remove();
  });
}

function formatMode(mode) {
  if (!mode) return "—";
  const sg   = mode.startsWith("stopgo");
  const fc   = mode.endsWith("-fc");
  return (sg ? "Stop/Go" : "Continuous") + " · " + (fc ? "Full Color" : "One Color");
}
function modeColorFor(mode) {
  if (!mode) return "#888";
  if (mode === "stopgo-fc")     return "#e8457a";
  if (mode === "continuous-fc") return "#3366cc";
  return "#777777";
}

// ─────────────────────────────────────────
// DRILLDOWN
// ─────────────────────────────────────────
function renderDrilldown() {
  const panel   = document.getElementById("drilldown-panel");
  const machine = window._drillMachine;
  if (!machine) { panel.style.display = "none"; return; }
  panel.style.display = "block";
  document.getElementById("dd-title").textContent = machine;

  const tab = window._ddTab || "sessions";
  ["sessions","maint","wait","hourly"].forEach(t => {
    const btn = document.getElementById("dd-tab-"+t);
    const pnl = document.getElementById("dd-pnl-"+t);
    if (btn) btn.classList.toggle("active", t===tab);
    if (pnl) pnl.style.display = t===tab ? "" : "none";
  });

  if (tab==="sessions")   renderDDSessions(machine);
  if (tab==="maint")      renderDDMaint(machine);
  if (tab==="wait")       renderDDWait(machine);
  if (tab==="hourly")     renderDDHourly(machine);
}

function renderDDSessions(machine) {
  const el = document.getElementById("dd-pnl-sessions");
  const sessions = (_sessions[machine]||[]).filter(s=>inRange(s.time));
  if (!sessions.length) { el.innerHTML = `<div class="dd-empty">No sessions in this date range.</div>`; return; }
  el.innerHTML = "";
  sessions.forEach(s => {
    const eff = calcEfficiency(s);
    const row = document.createElement("div");
    row.className = "dd-row";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#1a2a18;margin-bottom:3px;">${s.pieceType||"—"}</div>
          <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#72a868;">${s.mode||""} · ${fmt(s.totalSec)}</div>
          ${s.op ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#90b888;">Op: <strong>${s.op}</strong></div>` : ""}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#888;">${fmtDateTime(s.time)}</div>
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:4px;">
            <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#e8457a;">✓ ${s.qtyGood||0}</span>
            ${s.qtyBad ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#cc3333;">✗ ${s.qtyBad}</span>` : ""}
            ${eff!==null ? `<span style="font-family:'Abril Fatface',serif;font-size:16px;color:${effColor(eff)};">${eff}%</span>` : ""}
          </div>
        </div>
      </div>
      ${s.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#90b888;margin-top:5px;font-style:italic;">${s.notes}</div>` : ""}
    `;
    el.appendChild(row);
  });
}

function renderDDMaint(machine) {
  const el = document.getElementById("dd-pnl-maint");
  const entries = _maint.filter(e=>(e.machine||"Unassigned")===machine && inRange(e.time));
  if (!entries.length) { el.innerHTML = `<div class="dd-empty">No maintenance entries in this date range.</div>`; return; }
  el.innerHTML = "";
  entries.forEach(e => {
    const row = document.createElement("div");
    row.className = "dd-row";
    const dotColor = e.color || "#888";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div style="width:10px;height:10px;border-radius:50%;background:${dotColor};margin-top:3px;flex-shrink:0;"></div>
          <div>
            <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:${dotColor};">${e.type}</div>
            ${e.detail ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#555;margin-top:2px;">${e.detail}</div>` : ""}
            ${e.notes  ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#999;font-style:italic;margin-top:2px;">${e.notes}</div>` : ""}
            ${e.op     ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;margin-top:2px;">Op: ${e.op}</div>` : ""}
          </div>
        </div>
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#888;white-space:nowrap;">${fmtDateTime(e.time)}</div>
      </div>`;
    el.appendChild(row);
  });
}

function renderDDWait(machine) {
  const el = document.getElementById("dd-pnl-wait");
  const entries = _wait.filter(e=>(e.machine||"")===machine && inRange(e.time));
  if (!entries.length) { el.innerHTML = `<div class="dd-empty">No waiting entries in this date range.</div>`; return; }
  el.innerHTML = "";
  const totalSec = entries.reduce((s,e)=>s+(e.duration||0),0);
  const summary = document.createElement("div");
  summary.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;color:#4466ee;background:#f0f4ff;border:1px solid #c8d4ff;border-radius:6px;padding:8px 12px;margin-bottom:10px;";
  summary.textContent = `Total: ${fmt(totalSec)} across ${entries.length} entr${entries.length===1?"y":"ies"}`;
  el.appendChild(summary);
  entries.forEach(e => {
    const row = document.createElement("div");
    row.className = "dd-row";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-family:'Abril Fatface',serif;font-size:18px;color:#4466ee;">${fmt(e.duration||0)}</div>
          ${e.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#999;margin-top:2px;font-style:italic;">${e.notes}</div>` : ""}
          ${e.op ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">Op: ${e.op}</div>` : ""}
        </div>
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#888;">${fmtDateTime(e.time)}</div>
      </div>`;
    el.appendChild(row);
  });
}



// ─────────────────────────────────────────
// HOURLY PRODUCTION CHART
// ─────────────────────────────────────────
let _hourlyChart = null;

function renderDDHourly(machine) {
  const el = document.getElementById("dd-pnl-hourly");
  if (!el) return;

  const sessions = (_sessions[machine]||[]).filter(s=>inRange(s.time));
  const maintEntries = _maint.filter(e=>(e.machine||"Unassigned")===machine && inRange(e.time));
  const waitEntries  = _wait.filter(e=>(e.machine||"")===machine && inRange(e.time));

  if (!sessions.length && !maintEntries.length && !waitEntries.length) {
    el.innerHTML = `<div class="dd-empty">No data in this date range.</div>`;
    return;
  }

  // ── Collect all hours that appear across sessions/maint/wait ──
  const allHourSet = new Set();
  const pieceTypeSet = new Set();
  const hourPieceMap = {}; // { "08": { "Coir 28x16": 12 } }
  const hourMaintMap = {}; // { "08": minutes }
  const hourWaitMap  = {}; // { "08": minutes }

  sessions.forEach(s => {
    const h = String(s.time.getHours()).padStart(2,"0");
    const pt = s.pieceType || "Unknown";
    allHourSet.add(h);
    pieceTypeSet.add(pt);
    if (!hourPieceMap[h]) hourPieceMap[h] = {};
    hourPieceMap[h][pt] = (hourPieceMap[h][pt]||0) + (s.qtyGood||0);
  });

  // Maint events — bucket by hour, accumulate minutes
  // We use a fixed 30-min block per event as a visual indicator (duration not stored on maint)
  maintEntries.forEach(e => {
    const h = String(e.time.getHours()).padStart(2,"0");
    allHourSet.add(h);
    hourMaintMap[h] = (hourMaintMap[h]||0) + 30;
  });

  // Wait entries — duration stored in seconds, convert to minutes
  waitEntries.forEach(e => {
    const h = String(e.time.getHours()).padStart(2,"0");
    allHourSet.add(h);
    const mins = Math.round((e.duration||0) / 60) || 5;
    hourWaitMap[h] = (hourWaitMap[h]||0) + mins;
  });

  const hours     = [...allHourSet].sort();
  const pieceTypes = [...pieceTypeSet];

  const fmtHour = h => {
    const n = parseInt(h);
    return n === 0 ? "12am" : n < 12 ? n+"am" : n === 12 ? "12pm" : (n-12)+"pm";
  };
  const labels = hours.map(fmtHour);

  // ── Color palette for piece types ──
  const PALETTE = [
    "#e8457a","#52a040","#3366cc","#e87820","#7733aa",
    "#228844","#4466ee","#888800","#0099aa","#aa5500"
  ];

  // Piece type datasets
  const datasets = pieceTypes.map((pt, i) => ({
    label: pt,
    data: hours.map(h => hourPieceMap[h]?.[pt] || 0),
    backgroundColor: PALETTE[i % PALETTE.length] + "d0",
    borderColor:     PALETTE[i % PALETTE.length],
    borderWidth: 1,
    borderRadius: 3,
    stack: "production",
  }));

  // Maintenance dataset — bold red-orange hatched feel
  const hasMaint = Object.keys(hourMaintMap).length > 0;
  if (hasMaint) {
    datasets.push({
      label: "⬇ Maintenance",
      data: hours.map(h => hourMaintMap[h] || 0),
      backgroundColor: "#ff440088",
      borderColor: "#ff2200",
      borderWidth: 2,
      borderDash: [4,2],
      borderRadius: 3,
      stack: "events",
      yAxisID: "yEvents",
    });
  }

  // Waiting dataset — distinct blue-purple
  const hasWait = Object.keys(hourWaitMap).length > 0;
  if (hasWait) {
    datasets.push({
      label: "⏳ Waiting",
      data: hours.map(h => hourWaitMap[h] || 0),
      backgroundColor: "#4466ee88",
      borderColor: "#2244cc",
      borderWidth: 2,
      borderRadius: 3,
      stack: "events",
      yAxisID: "yEvents",
    });
  }

  // Destroy old chart if any
  if (_hourlyChart) { _hourlyChart.destroy(); _hourlyChart = null; }

  el.innerHTML = `
    <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#90b888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
      <span>Pieces per hour (left axis)</span>
      ${hasMaint||hasWait ? '<span style="color:#b0b0b0;">·</span><span style="color:#aaa;">Maint / Wait = minutes (right axis)</span>' : ""}
    </div>
    <div style="position:relative;height:260px;">
      <canvas id="dd-hourly-canvas"></canvas>
    </div>
  `;

  const ctx = document.getElementById("dd-hourly-canvas").getContext("2d");
  _hourlyChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "'Josefin Slab', serif", size: 10 },
            color: "#555",
            boxWidth: 12,
            padding: 10,
          }
        },
        tooltip: {
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => {
              const isEvent = item.dataset.yAxisID === "yEvents";
              const val = item.raw;
              if (val === 0) return null;
              return isEvent
                ? ` ${item.dataset.label}: ${val} min`
                : ` ${item.dataset.label}: ${val} pcs`;
            },
          },
          bodyFont: { family: "'Josefin Slab', serif", size: 11 },
          titleFont: { family: "'Josefin Slab', serif", size: 12, weight: "bold" },
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { family: "'Josefin Slab', serif", size: 10 }, color: "#90b888" }
        },
        y: {
          stacked: true,
          position: "left",
          grid: { color: "#e8f5e4" },
          ticks: { font: { family: "'Josefin Slab', serif", size: 10 }, color: "#90b888" },
          title: {
            display: true,
            text: "Pieces (good)",
            font: { family: "'Josefin Slab', serif", size: 9 },
            color: "#90b888",
          }
        },
        yEvents: {
          stacked: true,
          position: "right",
          display: hasMaint || hasWait,
          grid: { drawOnChartArea: false },
          ticks: { font: { family: "'Josefin Slab', serif", size: 10 }, color: "#aaa" },
          title: {
            display: hasMaint || hasWait,
            text: "Minutes",
            font: { family: "'Josefin Slab', serif", size: 9 },
            color: "#aaa",
          }
        }
      }
    }
  });
}

// ─────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────
function renderActivityFeed() {
  const el = document.getElementById("activity-feed");
  if (!el) return;
  const events = [];
  Object.entries(_sessions).forEach(([machine, sessions]) => {
    sessions.filter(s=>inRange(s.time)).forEach(s => events.push({ type:"session", machine, time:s.time, data:s }));
  });
  _maint.filter(e=>inRange(e.time)).forEach(e => events.push({ type:"maint", machine:e.machine||"?", time:e.time, data:e }));
  _wait.filter(e=>inRange(e.time)).forEach(e  => events.push({ type:"wait",  machine:e.machine||"?", time:e.time, data:e }));
  events.sort((a,b)=>b.time-a.time);

  el.innerHTML = "";
  if (!events.length) {
    el.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#90b888;text-align:center;padding:24px;">No activity in this date range.</div>`;
    return;
  }
  events.slice(0,80).forEach(ev => {
    const row = document.createElement("div");
    row.className = "feed-row";
    if (ev.type==="session") {
      const s = ev.data;
      row.innerHTML = `
        <div class="feed-dot" style="background:#e8457a;"></div>
        <div class="feed-body">
          <div class="feed-line1">
            <span class="feed-machine">${ev.machine}</span>
            <span style="color:#1a2a18;">${s.pieceType||"—"}</span>
            <span style="color:#e8457a;font-weight:700;">✓ ${s.qtyGood||0}</span>
            ${s.qtyBad ? `<span style="color:#cc3333;">✗ ${s.qtyBad}</span>` : ""}
            <span style="color:#888;">${fmt(s.totalSec)}</span>
          </div>
          <div class="feed-meta">${s.op||""} · ${fmtDateTime(ev.time)}</div>
        </div>`;
    } else if (ev.type==="maint") {
      const e = ev.data, col = e.color||"#888";
      row.innerHTML = `
        <div class="feed-dot" style="background:${col};"></div>
        <div class="feed-body">
          <div class="feed-line1">
            <span class="feed-machine">${ev.machine}</span>
            <span style="color:${col};font-weight:700;">${e.type}</span>
            ${e.detail ? `<span style="color:#555;">${e.detail}</span>` : ""}
          </div>
          <div class="feed-meta">${e.op||""} · ${fmtDateTime(ev.time)}${e.notes?" · "+e.notes:""}</div>
        </div>`;
    } else {
      const e = ev.data;
      row.innerHTML = `
        <div class="feed-dot" style="background:#4466ee;"></div>
        <div class="feed-body">
          <div class="feed-line1">
            <span class="feed-machine">${ev.machine}</span>
            <span style="color:#4466ee;font-weight:700;">Waiting</span>
            <span style="color:#4466ee;">${fmt(e.duration||0)}</span>
          </div>
          <div class="feed-meta">${e.op||""} · ${fmtDateTime(ev.time)}${e.notes?" · "+e.notes:""}</div>
        </div>`;
    }
    el.appendChild(row);
  });
}

// ─────────────────────────────────────────
// EFFICIENCY HELPERS
// ─────────────────────────────────────────
const TABLE_CAP = {
  "Coir · 28x16 OC":16,"Coir · 28x16 FC":16,"Coir · 30x18 OC":12,"Coir · 30x18 FC":12,
  "Coir · 36x24 OC":9,"Coir · 36x24 FC":9,"Coir · 60x24 OC":6,"Coir · 60x24 FC":6,
  "Coir · Flocked":20,"Non-Coir Mats · AF Large":5,"Non-Coir Mats · AF Small":6,
  "Non-Coir Mats · PVC":8,"Non-Coir Mats · Drying Mat":8,"Signs · 16x24":3,"Signs · 12x12":6,
  "Signs · 12x8 Plock":27,"Signs · 11x6 Plock":12,"Signs · 6x6 Plock":48,"Signs · Leaner":2,
  "Signs · Mantle Sign":24,'Signs · 18" Circle':8,"Signs · Yard Sign":10,
};
function calcEfficiency(s) {
  const cap = (_targets[s.pieceType]&&_targets[s.pieceType].ppt)||TABLE_CAP[s.pieceType];
  if (!cap) return null;
  const isCont  = s.mode&&s.mode.startsWith("continuous");
  const tables  = isCont ? (s.changeovers||1) : (s.changeovers||0)+1;
  if (!tables) return null;
  return Math.min(100,Math.round((s.qtyGood||0)/(cap*tables)*100));
}
function effColor(pct) {
  if (pct>=90) return "#228844";
  if (pct>=70) return "#668800";
  if (pct>=50) return "#aa7700";
  return "#cc3333";
}

// ─────────────────────────────────────────
// WINDOW-EXPOSED FUNCTIONS
// ─────────────────────────────────────────
window.ddSwitchTab = t => { window._ddTab = t; renderDrilldown(); };

window.switchMgTab = function(tab) {
  window._mgTab = tab;
  ["overview","live"].forEach(t => {
    const btn = document.getElementById("mgtab-"+t);
    const pnl = document.getElementById("mgpnl-"+t);
    if (btn) btn.classList.toggle("active", t===tab);
    if (pnl) pnl.style.display = t===tab ? "" : "none";
  });
  if (tab==="overview") render();
  if (tab==="live") {
    renderLiveTimers();
    if (window._showBannerIfNeeded && _liveStateReceived) window._showBannerIfNeeded();
  }
};

window.setDatePreset = function(preset) {
  const today = new Date();
  const pad = n => String(n).padStart(2,"0");
  const fmtD = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  if (preset==="today") {
    window._mgDateFrom = window._mgDateTo = fmtD(today);
  } else if (preset==="week") {
    const mon = new Date(today); mon.setDate(today.getDate()-today.getDay()+1);
    window._mgDateFrom = fmtD(mon); window._mgDateTo = fmtD(today);
  } else if (preset==="month") {
    window._mgDateFrom = fmtD(new Date(today.getFullYear(),today.getMonth(),1));
    window._mgDateTo   = fmtD(today);
  }
  document.getElementById("date-from").value = window._mgDateFrom;
  document.getElementById("date-to").value   = window._mgDateTo;
  document.querySelectorAll(".preset-btn").forEach(b=>b.classList.remove("active"));
  const ab = document.getElementById("preset-"+preset);
  if (ab) ab.classList.add("active");
  render();
};

window.applyCustomDates = function() {
  window._mgDateFrom = document.getElementById("date-from").value || window._mgDateFrom;
  window._mgDateTo   = document.getElementById("date-to").value   || window._mgDateTo;
  document.querySelectorAll(".preset-btn").forEach(b=>b.classList.remove("active"));
  render();
};

document.addEventListener("DOMContentLoaded", () => {
  const today = localDateStr(new Date());
  document.getElementById("date-from").value = today;
  document.getElementById("date-to").value   = today;
  document.getElementById("preset-today").classList.add("active");
});
