// ── QUICK-START STATE ──
// (_qsMachine, _qsMode, _qsFunction, _runDetailsPanelReady, pendingRunData declared in state.js)
function qsPickMachine(btn) {
  document.querySelectorAll(".qs-machine-btn").forEach(b => b.classList.remove("qs-active"));
  btn.classList.add("qs-active");
  _qsMachine = btn.dataset.machine;
  // Also sync the global machine selector so reports work correctly
  document.querySelectorAll(".machine-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.machine === _qsMachine);
  });
}

// Two-step mode selection: function first, then color
function qsPickFunction(fn) {
  _qsFunction = fn;
  // Default to FC — color is determined by piece type chosen during the run
  _qsMode = fn + '-fc';

  // Highlight the selected function button
  const sgBtn  = document.getElementById("qs-fn-stopgo");
  const ctBtn  = document.getElementById("qs-fn-continuous");
  const isStopGo = fn === 'stopgo';
  const activeColor  = isStopGo ? '#e8457a' : '#3366cc';
  const activeBg     = isStopGo ? '#fff5f8' : '#f0f4ff';
  if (sgBtn) { sgBtn.style.borderColor = isStopGo ? activeColor : '#f0c8d8'; sgBtn.style.background = isStopGo ? activeBg : '#fff'; }
  if (ctBtn) { ctBtn.style.borderColor = !isStopGo ? activeColor : '#f0c8d8'; ctBtn.style.background = !isStopGo ? activeBg : '#fff'; }
}

function qsPickMode(btn) {
  document.querySelectorAll(".qs-mode-btn").forEach(b => b.classList.remove("qs-active"));
  btn.classList.add("qs-active");
  _qsMode = btn.dataset.mode;
  if (_qsMode) {
    _qsFunction = _qsMode.startsWith('continuous') ? 'continuous' : 'stopgo';
    qsPickFunction(_qsFunction);
  }
}

function qsStartRun() {
  // Require machine selection
  if (!_qsMachine) {
    // Highlight machine row as needed
    document.querySelectorAll(".qs-machine-btn").forEach(b => {
      b.style.borderColor = "#e8457a";
    });
    setTimeout(() => {
      document.querySelectorAll(".qs-machine-btn").forEach(b => { b.style.borderColor = ""; });
    }, 1200);
    return;
  }
  // Require function to be selected (color defaults to FC — set by piece type during run)
  if (!_qsFunction) {
    const sg = document.getElementById("qs-fn-stopgo");
    const ct = document.getElementById("qs-fn-continuous");
    [sg, ct].forEach(b => { if(b) { b.style.borderColor="#e8457a"; setTimeout(()=>{ b.style.borderColor=""; },1200); } });
    return;
  }
  selectPrintMode(_qsMode);
}

function pfSetRunControlsVisible(visible) {
  const catEl = document.getElementById("ctrl-category");
  const subEl = document.getElementById("ctrl-subtype");
  if (catEl) catEl.style.display = visible ? "" : "none";
  if (subEl) subEl.style.display = visible ? "" : "none";
}

function selectPrintMode(mode) {
  stopAllTransitions();
  printMode = mode;
  runSec = 0; runRunning = false; runPaused = false; runEntries = []; runChangeoverCount = 0;
  clearInterval(runInterval);

  const isStopGo = mode.startsWith('stopgo');
  const isFC     = mode.endsWith('-fc');
  const color      = isFC ? (isStopGo ? '#e8457a' : '#3366cc') : '#777777';
  const bg         = isFC ? (isStopGo ? '#fff5f8' : '#f0f4ff') : '#f4f4f4';
  const borderColor= isFC ? (isStopGo ? '#f0aac0' : '#aabbee') : '#aaaaaa';
  const modeLabel  = (isStopGo ? 'Stop / Go' : 'Continuous') + ' · ' + (isFC ? 'Full Color' : 'One Color');

  // Context strip — machine
  const machineVal = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "—";
  const machCtx = document.getElementById("run-ctx-machine");
  if (machCtx) machCtx.textContent = machineVal;

  // Mode badge
  const badge = document.getElementById("run-mode-badge");
  if (badge) {
    badge.textContent = modeLabel;
    badge.style.color = color;
    badge.style.borderColor = borderColor;
    badge.style.background = bg;
  }

  // Timer color — FC=pink, OC=gray so operators can visually distinguish
  const timerEl = document.getElementById("run-timer-display");
  timerEl.style.color = color;
  timerEl.style.textShadow = `0 0 40px ${color}22`;
  timerEl.textContent = "00:00:00";
  timerEl.classList.remove("paused");

  // Counters label
  const coLabelEl = document.getElementById("run-co-label");
  if (coLabelEl) coLabelEl.textContent = isStopGo ? "Changeovers" : "Laps";

  // Changeover button label
  const coBtnLabel = document.getElementById("changeover-btn-label");
  if (coBtnLabel) coBtnLabel.textContent = isStopGo ? "Changeover" : "Lap";

  // Changeover button color matches mode
  const coBtn = document.getElementById("run-btn-changeover");
  if (coBtn) coBtn.style.background = color;

  // Log title
  const logTitle = document.getElementById("run-log-title");
  if (logTitle) logTitle.textContent = isStopGo ? "Changeover Log" : "Lap Log";

  // Inline qty panel title
  const iqTitle = document.getElementById("run-inline-qty-title");
  if (iqTitle) iqTitle.textContent = isStopGo ? "Log qty — this table" : "Log qty — this lap";

  // Pieces counter reset
  const pcsEl = document.getElementById("run-pieces-count");
  if (pcsEl) pcsEl.textContent = "0";
  const coNumEl = document.getElementById("run-lap-count-num");
  if (coNumEl) coNumEl.textContent = "0";

  // Reset context strip piece/op
  runDetailsSyncCtx();

  // Reset inline qty panel
  const iqPanel = document.getElementById("run-inline-qty");
  if (iqPanel) { iqPanel.style.display = "none"; }
  inChangeover = false;

  // Populate run-details-panel category dropdown if not already done
  runDetailsPanelInit();

  // Pre-fill operator from global-operator if set
  const globalOp = document.getElementById("global-operator");
  const detailOp = document.getElementById("run-detail-operator");
  if (globalOp && detailOp && globalOp.value) {
    detailOp.value = globalOp.value;
  }

  // Pre-fill category/subtype from global selects if set
  const globalCat = document.getElementById("global-category");
  const globalSub = document.getElementById("global-subtype");
  const detailCat = document.getElementById("run-detail-category");
  const detailSub = document.getElementById("run-detail-subtype");
  if (globalCat && detailCat && globalCat.value) {
    detailCat.value = globalCat.value;
    runDetailRefreshSubtype();
    if (globalSub && detailSub && globalSub.value) {
      detailSub.value = globalSub.value;
    }
  }
  runDetailsUpdate();

  // Open details panel so operator sees it immediately
  const detailsBody = document.getElementById("run-details-body");
  const detailsChevron = document.getElementById("run-details-chevron");
  if (detailsBody) detailsBody.style.display = "flex";
  if (detailsChevron) detailsChevron.style.transform = "rotate(0deg)";

  // Reset pause button text
  const pauseLabel = document.getElementById("pause-btn-label");
  if (pauseLabel) pauseLabel.textContent = "Pause";

  // Reset log
  document.getElementById("run-log-list").innerHTML = '<div class="empty-log">No entries yet.</div>';

  // Show category + piece type controls now that a run is active
  pfSetRunControlsVisible(true);

  // Show run screen
  document.getElementById("print-mode-select").style.display = "none";
  document.getElementById("print-jobs-screen").style.display = "none";
  const rs = document.getElementById("print-run-screen");
  rs.style.display = "flex";

  // Start timer — wall-clock based
  runRunning = true;
  runStartWall = Date.now();
  runPausedMs = 0;
  runPauseStartWall = 0;
  runInterval = setInterval(() => {
    if (!runPaused) {
      runSec = Math.floor((Date.now() - runStartWall - runPausedMs) / 1000);
      document.getElementById("run-timer-display").textContent = fmt(runSec);
    }
  }, 500);

  // Broadcast live state so manager dashboard can show this timer
  const _lsMachine = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  if (window._fb) window._fb.saveLiveState(_lsMachine, {
    machine: _lsMachine, startWall: runStartWall, pausedMs: 0, paused: false,
    mode, op: document.getElementById("global-operator")?.value || "",
    pieceType: "", startedAt: new Date().toISOString(),
  });
}

// ── RUN DETAILS PANEL (fill in during run) ──
function runDetailsPanelInit() {
  if (_runDetailsPanelReady) return;
  const catSel = document.getElementById("run-detail-category");
  if (!catSel) return;
  catSel.innerHTML = '<option value="">— select —</option>';
  Object.keys(PIECE_TYPES).forEach(cat => {
    const o = document.createElement("option");
    o.value = cat; o.textContent = cat;
    catSel.appendChild(o);
  });
  const subSel = document.getElementById("run-detail-subtype");
  if (subSel) subSel.innerHTML = '<option value="">— select category —</option>';
  _runDetailsPanelReady = true;
}


function runDetailRefreshSubtype() {
  const cat = document.getElementById("run-detail-category")?.value || "";
  const subSel = document.getElementById("run-detail-subtype");
  if (!subSel) return;
  subSel.innerHTML = "";
  if (!cat) { subSel.innerHTML = '<option value="">— select category —</option>'; return; }
  (PIECE_TYPES[cat] || []).forEach(t => {
    const o = document.createElement("option"); o.value = t; o.textContent = t;
    subSel.appendChild(o);
  });
  // Sync global-subtype so save logic picks it up
  const globalSub = document.getElementById("global-subtype");
  if (globalSub) {
    globalSub.innerHTML = "";
    (PIECE_TYPES[cat] || []).forEach(t => {
      const o = document.createElement("option"); o.value = t; o.textContent = t;
      globalSub.appendChild(o);
    });
  }
  runDetailsUpdate();
}

function runDetailsUpdate() {
  const op  = document.getElementById("run-detail-operator")?.value.trim() || "";
  const cat = document.getElementById("run-detail-category")?.value || "";
  const sub = document.getElementById("run-detail-subtype")?.value || "";

  // Sync back to global controls so save functions pick them up
  const gOp  = document.getElementById("global-operator");
  const gCat = document.getElementById("global-category");
  const gSub = document.getElementById("global-subtype");
  if (gOp  && op)  gOp.value  = op;
  if (gCat && cat) gCat.value = cat;
  if (gSub && sub) gSub.value = sub;

  // Keep liveState in sync with operator/pieceType as they type
  if (runRunning && window._fb) {
    const _lsM = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
    window._fb.saveLiveState(_lsM, {
      machine: _lsM, startWall: runStartWall, pausedMs: runPausedMs,
      paused: runPaused, pauseStartWall: runPauseStartWall || 0,
      mode: printMode, op,
      pieceType: cat && sub ? cat + " · " + sub : "",
      startedAt: null,
    });
  }

  runDetailsSyncCtx();
}

function runDetailsSyncCtx() {
  const op  = document.getElementById("run-detail-operator")?.value.trim() || "";
  const cat = document.getElementById("run-detail-category")?.value || "";
  const sub = document.getElementById("run-detail-subtype")?.value || "";
  const complete = op && cat && sub;

  const opCtx    = document.getElementById("run-ctx-op");
  const pieceCtx = document.getElementById("run-ctx-piece");
  const statusEl = document.getElementById("run-details-status");

  if (opCtx) {
    opCtx.textContent  = op || "no operator";
    opCtx.style.fontStyle = op ? "normal" : "italic";
    opCtx.style.color     = op ? "#52a040" : "#c090a8";
    opCtx.style.borderColor = op ? "#b8e0b0" : "#f0c8d8";
    opCtx.style.background  = op ? "#eef8eb" : "#fff5f8";
  }
  if (pieceCtx) {
    pieceCtx.textContent = (cat && sub) ? cat + " · " + sub : "piece type not set";
    pieceCtx.style.fontStyle  = (cat && sub) ? "normal" : "italic";
    pieceCtx.style.color      = (cat && sub) ? "#52a040" : "#c090a8";
    pieceCtx.style.borderColor= (cat && sub) ? "#b8e0b0" : "#f0c8d8";
    pieceCtx.style.background = (cat && sub) ? "#eef8eb" : "#fff5f8";
  }
  if (statusEl) {
    statusEl.textContent = complete ? "✓ complete" : "⚠ fill in while printing";
    statusEl.style.color = complete ? "#228844" : "#e8457a";
  }
}

function toggleRunDetails() {
  const body = document.getElementById("run-details-body");
  const chevron = document.getElementById("run-details-chevron");
  if (!body) return;
  const open = body.style.display !== "none";
  body.style.display = open ? "none" : "flex";
  if (chevron) chevron.style.transform = open ? "rotate(-90deg)" : "rotate(0deg)";
}

// ── INLINE QTY (replaces changeover modal for stop/go) ──
function runInlineQtyConfirm() {
  const qtyGood = parseInt(document.getElementById("run-co-good").value) || 0;
  const qtyBad  = parseInt(document.getElementById("run-co-bad").value)  || 0;
  document.getElementById("run-inline-qty").style.display = "none";
  _doChangeover(qtyGood, qtyBad);
  // Restore changeover button
  _runResetCoBtn();
}

function runInlineQtySkip() {
  document.getElementById("run-inline-qty").style.display = "none";
  _doChangeover(0, 0);
  _runResetCoBtn();
}

function _runResetCoBtn() {
  inChangeover = false;
  const isFC3 = printMode.endsWith('-fc');
  const isSG3 = printMode.startsWith('stopgo');
  const color  = isFC3 ? (isSG3 ? '#e8457a' : '#3366cc') : '#777777';
  const coBtn  = document.getElementById("run-btn-changeover");
  const coLbl  = document.getElementById("changeover-btn-label");
  if (coBtn) { coBtn.style.background = color; coBtn.style.color = "#fff"; coBtn.style.border = "none"; }
  if (coLbl) coLbl.textContent = isSG3 ? "Changeover" : "Lap";
}

// ── QS machine preselect on init ──
function qsInitMachine() {
  // Pre-select whichever machine-btn is already active
  const activeMachine = document.querySelector(".machine-btn.active");
  if (activeMachine) {
    _qsMachine = activeMachine.dataset.machine;
    document.querySelectorAll(".qs-machine-btn").forEach(b => {
      b.classList.toggle("qs-active", b.dataset.machine === _qsMachine);
    });
  } else {
    // Default to first
    const first = document.querySelector(".qs-machine-btn");
    if (first) { first.classList.add("qs-active"); _qsMachine = first.dataset.machine; }
  }
  // Default mode
  // Reset mode UI
  _qsFunction = null; _qsMode = null;
  const sgBtn = document.getElementById("qs-fn-stopgo");
  const ctBtn = document.getElementById("qs-fn-continuous");
  if (sgBtn) { sgBtn.style.borderColor = ""; sgBtn.style.background = "#fff"; }
  if (ctBtn) { ctBtn.style.borderColor = ""; ctBtn.style.background = "#fff"; }
}


function setChangeoverIcon(state) {
  const wrap = document.getElementById("changeover-icon-wrap");
  const label = document.getElementById("changeover-btn-label");
  const isFC2 = printMode.endsWith('-fc');
  const isSG2 = printMode.startsWith('stopgo');
  const isOC = !isFC2;
  const color = isFC2 ? (isSG2 ? '#e8457a' : '#4466ee') : '#ffffff';
  const bg    = isFC2 ? (isSG2 ? '#fff5f8' : '#f0f4ff') : '#111111';
  const stroke = isFC2 ? color : '#333333';
  if (state === 'printing') {
    wrap.innerHTML = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="${stroke}" stroke-width="1.5" fill="${bg}"/>
      <path d="M20 26 H48" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <polyline points="40,18 48,26 40,34" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M52 46 H24" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <polyline points="32,54 24,46 32,38" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
    label.innerHTML = printMode.startsWith('stopgo')
      ? `Changeover <span style="opacity:0.5;font-size:9px;">[Enter]</span>`
      : `Lap <span style="opacity:0.5;font-size:9px;">[Enter]</span>`;
  } else {
    wrap.innerHTML = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="${stroke}" stroke-width="1.5" fill="${bg}"/>
      <polygon points="27,20 27,52 56,36" fill="${color}" opacity="0.9" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    label.innerHTML = `Back to Print <span style="opacity:0.5;font-size:9px;">[Enter]</span>`;
  }
}

function runChangeover() {
  if (!runRunning) return;
  const isSG3 = printMode.startsWith('stopgo');
  const isFC3 = printMode.endsWith('-fc');
  const color  = isFC3 ? (isSG3 ? '#e8457a' : '#3366cc') : '#777777';
  const coBtn  = document.getElementById("run-btn-changeover");
  const coLbl  = document.getElementById("changeover-btn-label");

  if (!isSG3) {
    // Continuous mode: log a lap with no qty (qty entered at end)
    runChangeoverCount++;
    runEntries.unshift({ type: "Lap", elapsed: runSec, time: new Date() });
    const coNumEl = document.getElementById("run-lap-count-num");
    if (coNumEl) coNumEl.textContent = runChangeoverCount;
    renderRunLog();
    return;
  }

  if (!inChangeover) {
    // Show inline qty panel
    inChangeover = true;
    document.getElementById("run-co-good").value = "";
    document.getElementById("run-co-bad").value  = "";
    document.getElementById("run-inline-qty").style.display = "block";
    setTimeout(() => document.getElementById("run-co-good").focus(), 50);
    // Flip button to "Back to Print"
    if (coBtn) { coBtn.style.background = "#fff5f8"; coBtn.style.color = "#c03060"; coBtn.style.border = "2px solid #e8457a"; }
    if (coLbl) coLbl.textContent = "Back to Print";
  } else {
    // Already in changeover state — pressing again means "back to print", log whatever qty is entered
    const qtyGood = parseInt(document.getElementById("run-co-good").value) || 0;
    const qtyBad  = parseInt(document.getElementById("run-co-bad").value)  || 0;
    document.getElementById("run-inline-qty").style.display = "none";
    _doChangeover(qtyGood, qtyBad);
    _runResetCoBtn();
  }
}

function changeoverQtyConfirm() {
  const qtyGood = parseInt(document.getElementById("co-qty-good").value) || 0;
  const qtyBad  = parseInt(document.getElementById("co-qty-bad").value)  || 0;
  closeModal("changeover-qty-modal");
  _doChangeover(qtyGood, qtyBad);
}

function changeoverQtySkip() {
  closeModal("changeover-qty-modal");
  _doChangeover(0, 0);
}

function _doChangeover(qtyGood, qtyBad) {
  runChangeoverCount++;
  runEntries.unshift({ type: "Changeover", elapsed: runSec, qtyGood, qtyBad, time: new Date() });
  const coNumEl = document.getElementById("run-lap-count-num");
  if (coNumEl) coNumEl.textContent = runChangeoverCount;
  // Update live pieces count
  const pcsEl = document.getElementById("run-pieces-count");
  if (pcsEl) {
    const totalGood = runEntries.filter(e => e.type === "Changeover").reduce((s, e) => s + (e.qtyGood || 0), 0);
    pcsEl.textContent = totalGood;
  }
  renderRunLog();
}

function runPause() {
  if (!runRunning) return;
  if (!runPaused) {
    // Pausing — open reason modal first
    document.getElementById("pause-reason-text").value = "";
    openModal("pause-reason-modal");
    setTimeout(() => document.getElementById("pause-reason-text").focus(), 50);
  } else {
    // Resuming — no modal needed
    if (runPauseStartWall) runPausedMs += Date.now() - runPauseStartWall;
    runPauseStartWall = 0;
    runPaused = false;
    const timerEl = document.getElementById("run-timer-display");
    timerEl.classList.remove("paused");
    const pauseLabel = document.getElementById("pause-btn-label");
    if (pauseLabel) pauseLabel.textContent = "Pause";
    const pauseBtn = document.getElementById("run-btn-pause");
    if (pauseBtn) { pauseBtn.style.color = "#cc8800"; pauseBtn.style.borderColor = "#cc8800"; }
    runEntries.unshift({ type: "Returned to Printing", elapsed: runSec, time: new Date() });
    renderRunLog();
    // Update live state — resumed
    const _lsMr = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
    if (window._fb) window._fb.saveLiveState(_lsMr, {
      machine: _lsMr, startWall: runStartWall, pausedMs: runPausedMs,
      paused: false, pauseStartWall: 0,
      mode: printMode, op: document.getElementById("global-operator")?.value || "",
      pieceType: document.getElementById("global-category")?.value && document.getElementById("global-subtype")?.value
        ? document.getElementById("global-category").value + " · " + document.getElementById("global-subtype").value : "",
      startedAt: null,
    });
  }
}

function pauseReasonConfirm() {
  const reason = document.getElementById("pause-reason-text").value.trim();
  closeModal("pause-reason-modal");
  runPaused = true;
  runPauseStartWall = Date.now();
  const timerEl = document.getElementById("run-timer-display");
  timerEl.classList.add("paused");
  const pauseLabel = document.getElementById("pause-btn-label");
  if (pauseLabel) pauseLabel.textContent = "Resume";
  const pauseBtn = document.getElementById("run-btn-pause");
  if (pauseBtn) { pauseBtn.style.color = "#228844"; pauseBtn.style.borderColor = "#228844"; }
  runEntries.unshift({ type: "Paused", elapsed: runSec, notes: reason, time: new Date() });
  renderRunLog();
  // Update live state — paused
  const _lsMp = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  if (window._fb) window._fb.saveLiveState(_lsMp, {
    machine: _lsMp, startWall: runStartWall, pausedMs: runPausedMs,
    paused: true, pauseStartWall: runPauseStartWall,
    mode: printMode, op: document.getElementById("global-operator")?.value || "",
    pieceType: document.getElementById("global-category")?.value && document.getElementById("global-subtype")?.value
      ? document.getElementById("global-category").value + " · " + document.getElementById("global-subtype").value : "",
    startedAt: null,
  });
}

// Holds pending run data until summary modal is confirmed
// (pendingRunData declared in state.js)

function runUpdatePieceLabel() {
  const cat = document.getElementById("global-category").value;
  const sub = document.getElementById("global-subtype").value;
  const lbl = document.getElementById("run-piece-label");
  if (lbl) lbl.textContent = cat + " · " + sub;
}

function runCancel() {
  clearInterval(runInterval);
  runRunning = false; runPaused = false; inChangeover = false;
  // Clear live state
  const _lsCan = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  if (window._fb) window._fb.clearLiveState(_lsCan);
  // Hide inline qty if open
  const iqPanel = document.getElementById("run-inline-qty");
  if (iqPanel) iqPanel.style.display = "none";
  runSec = 0; runStartWall = 0; runPausedMs = 0; runPauseStartWall = 0; runChangeoverCount = 0; runEntries = [];
  stopAllTransitions();
  document.getElementById("run-timer-display").textContent = "00:00:00";
  document.getElementById("run-log-list").innerHTML = '<div class="empty-log">No entries yet.</div>';
  document.getElementById("print-run-screen").style.display = "none";
  pfSetRunControlsVisible(false); // back to Quick Start — hide until next run
  const modeSelect = document.getElementById("print-mode-select");
  modeSelect.style.display = "flex";
  qsInitMachine();
}

function runStop() {
  stopAllTransitions();
  clearInterval(runInterval);
  runRunning = false; runPaused = false; inChangeover = false;
  // Hide inline qty if open
  const iqPanel = document.getElementById("run-inline-qty");
  if (iqPanel) iqPanel.style.display = "none";

  // Clear live state — run is ending
  const _lsSt = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  if (window._fb) window._fb.clearLiveState(_lsSt);

  if (runSec > 0) {
    runEntries.unshift({ type: "Session End", elapsed: runSec, time: new Date() });
  }

  // Capture run data — read from run-details panel (synced back to global controls)
  const machine = _qsMachine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  const cat = document.getElementById("global-category")?.value || "";
  const sub = document.getElementById("global-subtype")?.value || "";
  const op  = document.getElementById("global-operator")?.value || "—";

  pendingRunData = {
    mode: printMode,
    totalSec: runSec,
    changeovers: runChangeoverCount,
    pieceType: cat && sub ? `${cat} · ${sub}` : "Unspecified",
    machine, op,
    time: new Date(),
  };

  // For stop/go: roll up changeover qty tallies into the session
  if (printMode.startsWith('stopgo')) {
    const coGood = runEntries.filter(e => e.type === "Changeover").reduce((s, e) => s + (e.qtyGood || 0), 0);
    const coBad  = runEntries.filter(e => e.type === "Changeover").reduce((s, e) => s + (e.qtyBad  || 0), 0);
    pendingRunData.changeoverQtyGood = coGood;
    pendingRunData.changeoverQtyBad  = coBad;
  }

  // Populate modal meta info
  const meta = document.getElementById("run-summary-meta");
  meta.innerHTML = [
    `<span style="font-family:'Josefin Slab',serif;font-size:11px;background:#fff5f8;border:1px solid #f0c8d8;border-radius:4px;padding:3px 10px;color:#e8457a;">${machine}</span>`,
    `<span style="font-family:'Josefin Slab',serif;font-size:11px;background:#fdf6f8;border:1px solid #f0d0dc;border-radius:4px;padding:3px 10px;color:#b090a0;">${fmt(runSec)}</span>`,
    `<span style="font-family:'Josefin Slab',serif;font-size:11px;background:#fdf6f8;border:1px solid #f0d0dc;border-radius:4px;padding:3px 10px;color:#b090a0;">${printMode} · ${runChangeoverCount} ${printMode.startsWith('stopgo') ? 'changeovers' : 'laps'}</span>`,
  ].join("");

  // Pre-fill notes with any pause reasons from this run
  const pauseNotes = runEntries
    .filter(e => e.type === "Paused" && e.notes)
    .map(e => `⏸ ${e.notes}`)
    .reverse()
    .join("\n");
  document.getElementById("summary-notes").value = pauseNotes;
  document.getElementById("summary-qty-good").value = "";
  document.getElementById("summary-qty-bad").value  = "";

  // Show qty fields only for continuous mode
  const isContinuous = !printMode.startsWith('stopgo');
  document.getElementById("summary-qty-good-wrap").style.display = isContinuous ? "" : "none";
  document.getElementById("summary-qty-bad-wrap").style.display  = isContinuous ? "" : "none";

  // For stop/go: show final qty modal before summary
  if (printMode.startsWith('stopgo')) {
    document.getElementById("stop-qty-good").value = "";
    document.getElementById("stop-qty-bad").value  = "";
    document.getElementById("print-run-screen").style.display = "none";
    openModal("stop-qty-modal");
    setTimeout(() => document.getElementById("stop-qty-good").focus(), 50);
    return;
  }

  // Continuous: go straight to summary
  document.getElementById("print-run-screen").style.display = "none";
  openModal("run-summary-modal");
  setTimeout(() => document.getElementById("summary-qty-good").focus(), 50);
}

function stopQtyConfirm() {
  const qtyGood = parseInt(document.getElementById("stop-qty-good").value) || 0;
  const qtyBad  = parseInt(document.getElementById("stop-qty-bad").value)  || 0;
  closeModal("stop-qty-modal");
  _finishStop(qtyGood, qtyBad);
}

function stopQtySkip() {
  closeModal("stop-qty-modal");
  _finishStop(0, 0);
}

function _finishStop(finalPieceGood, finalPieceBad) {
  // Add final piece qty on top of changeover totals
  // Also count the final table (the one you stopped on) as a table
  if (pendingRunData) {
    pendingRunData.changeoverQtyGood = (pendingRunData.changeoverQtyGood || 0) + finalPieceGood;
    pendingRunData.changeoverQtyBad  = (pendingRunData.changeoverQtyBad  || 0) + finalPieceBad;
    if (finalPieceGood > 0 || finalPieceBad > 0) {
      pendingRunData.changeovers = (pendingRunData.changeovers || 0) + 1;
    }
  }
  // Write final table qty directly into the Session End entry in runEntries
  // so the tableLog accurately reflects per-table qty rather than needing
  // to back-calculate it at export time
  const sessionEndEntry = runEntries.find(e => e.type === "Session End");
  if (sessionEndEntry) {
    sessionEndEntry.qtyGood = finalPieceGood;
    sessionEndEntry.qtyBad  = finalPieceBad;
  }
  openModal("run-summary-modal");
}

function runSummaryFinish(qtyGood, qtyBad, notes) {
  closeModal("run-summary-modal");
  if (!pendingRunData) return;

  const d = pendingRunData;
  // For stop/go, qty comes from changeover tallies; for continuous, from the modal inputs
  const finalGood = d.changeoverQtyGood !== undefined ? d.changeoverQtyGood : (qtyGood || 0);
  const finalBad  = d.changeoverQtyBad  !== undefined ? d.changeoverQtyBad  : (qtyBad  || 0);

  if (!machineReports[d.machine]) machineReports[d.machine] = [];
  machineReports[d.machine].push({
    mode: d.mode,
    totalSec: d.totalSec,
    changeovers: d.changeovers,
    qtyGood: finalGood,
    qtyBad:  finalBad,
    notes:   notes   || "",
    pieceType: d.pieceType,
    op: d.op,
    time: d.time.toISOString(),
  });
  // Save to Firebase
  const sessionPayload = {
    mode: d.mode, totalSec: d.totalSec, changeovers: d.changeovers,
    qtyGood: finalGood, qtyBad: finalBad, notes: notes||"",
    pieceType: d.pieceType, op: d.op, time: d.time.toISOString(),
    tableLog: runEntries.filter(e => e.type === "Changeover" || e.type === "Lap" || e.type === "Session End")
      .map(e => ({ type: e.type, elapsed: e.elapsed, qtyGood: e.qtyGood||0, qtyBad: e.qtyBad||0, time: e.time ? new Date(e.time).toISOString() : null }))
      .reverse()
  };
  if (window._fb) window._fb.saveSession(d.machine, sessionPayload);
  // Also persist locally as backup
  localSaveSession(d.machine, sessionPayload);
  pendingRunData = null;

  // Show reports screen, hide others
  pfSetRunControlsVisible(false); // run complete — hide until next run
  document.getElementById("print-mode-select").style.display = "none";
  document.getElementById("print-run-screen").style.display = "none";
  const js = document.getElementById("print-jobs-screen");
  js.style.display = "block";
  const backBtn = document.getElementById("back-to-mode-btn");
  backBtn.style.display = "inline-block";
  backBtn.onclick = () => {
    js.style.display = "none";
    document.getElementById("print-mode-select").style.display = "flex";
  };
  renderReports();
}

function runSummaryConfirm() {
  const isContinuous = !printMode.startsWith('stopgo');
  const qtyGood = isContinuous ? (parseInt(document.getElementById("summary-qty-good").value) || 0) : 0;
  const qtyBad  = isContinuous ? (parseInt(document.getElementById("summary-qty-bad").value)  || 0) : 0;
  const notes = document.getElementById("summary-notes").value.trim();
  runSummaryFinish(qtyGood, qtyBad, notes);
}

function runSummarySkip() {
  runSummaryFinish(0, 0, "");
}

function renderRunLog() {
  const list = document.getElementById("run-log-list");
  if (!runEntries.length) { list.innerHTML = '<div class="empty-log">No entries yet.</div>'; return; }
  list.innerHTML = "";
  runEntries.forEach((e, i) => {
    const isEnd = e.type === "Session End";
    const isPause = e.type === "Paused";
    const isResume = e.type === "Returned to Printing";
    const color = isEnd ? "#cc3333" : isPause ? "#cc8800" : isResume ? "#228844" : (printMode.startsWith('stopgo') ? (printMode.endsWith('-fc') ? '#e8457a' : '#777777') : (printMode.endsWith('-fc') ? '#3366cc' : '#777777'));
    const div = document.createElement("div"); div.className = "log-entry";
    div.innerHTML = `
      <div class="log-dot" style="background:${color}"></div>
      <div style="flex:1;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span style="display:flex;flex-direction:column;gap:2px;">
          <span class="log-type" style="color:${color}">${e.type}${(!isEnd && !isPause && !isResume) ? " #"+(runEntries.length - i) : ""}</span>
          ${e.type === "Changeover" && (e.qtyGood || e.qtyBad) ? `<span style="font-family:'Josefin Slab',serif;font-size:10px;color:#888;">✓ ${e.qtyGood||0} good &nbsp;✗ ${e.qtyBad||0} bad</span>` : ""}
          ${isPause && e.notes ? `<span style="font-family:'Josefin Slab',serif;font-size:10px;color:#cc8800;font-style:italic;">${e.notes}</span>` : ""}
        </span>
        <span style="display:flex;gap:16px;align-items:center;">
          <span class="log-duration" style="color:${color}">${fmt(e.elapsed)}</span>
          <span class="log-time">${fmtDate(e.time)}</span>
        </span>
      </div>
    `;
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════
// WAITING
// ═══════════════════════════════════════
function waitStart() {
  if (waitRunning) return;
  waitRunning = true;
  document.getElementById("wait-start").style.display = "none";
  document.getElementById("wait-stop").style.display  = "inline-block";
  document.getElementById("wait-display").classList.add("running");
  waitStartWall = Date.now();
  waitInterval = setInterval(() => { waitSec = Math.floor((Date.now() - waitStartWall) / 1000); document.getElementById("wait-display").textContent = fmt(waitSec); }, 500);
}
function waitStop() {
  if (!waitRunning) return;
  clearInterval(waitInterval); waitRunning = false;
  document.getElementById("wait-start").style.display = "inline-block";
  document.getElementById("wait-stop").style.display  = "none";
  document.getElementById("wait-display").classList.remove("running");
  const op = document.getElementById("global-operator").value || "—";
  const machine = document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  const notes = document.getElementById("wait-notes").value.trim();
  const waitEntry = {duration:waitSec, op, machine, notes, time:new Date().toISOString()};
  waitLog.unshift({...waitEntry, time: new Date()});
  if (!machineEvents[machine]) machineEvents[machine] = [];
  machineEvents[machine].unshift({ category: "waiting", type: "Waiting", detail: fmt(waitSec), notes, color: "#3355cc", time: waitEntry.time });
  if (window._fb) {
    window._fb.saveWaitEntry(waitEntry);
    window._fb.saveMachineEvent(machine, { category:"waiting", type:"Waiting", detail:fmt(waitSec), notes, color:"#3355cc", time:waitEntry.time });
  }
  document.getElementById("wait-notes").value = "";
  renderWaitLog();
}
function waitReset() {
  clearInterval(waitInterval); waitRunning = false; waitSec = 0; waitStartWall = 0;
  document.getElementById("wait-display").textContent = "00:00:00";
  document.getElementById("wait-display").classList.remove("running");
  document.getElementById("wait-start").style.display = "inline-block";
  document.getElementById("wait-stop").style.display  = "none";
}
function renderWaitLog() {
  const list = document.getElementById("wait-log-list");
  if (!waitLog.length) { list.innerHTML = '<div class="empty-log">No sessions yet.</div>'; return; }
  list.innerHTML = "";
  waitLog.forEach(e => {
    const div = document.createElement("div"); div.className = "wait-entry";
    div.innerHTML = `
      <div><div class="wait-dur">${fmt(e.duration)}</div><div class="wait-entry-op">Op: ${e.op}</div>
      ${e.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#6677bb;font-style:italic;margin-top:2px;">${e.notes}</div>` : ""}</div>
      <div class="wait-entry-time">${fmtDate(e.time)}</div>
    `;
    list.appendChild(div);
  });
}
