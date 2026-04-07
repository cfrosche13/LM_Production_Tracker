// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function init() {
  // Top bar piece categories
  const gc = document.getElementById("global-category");
  Object.keys(PIECE_TYPES).forEach(cat => {
    gc.appendChild(makeOption(cat, cat));
  });
  gc.addEventListener("change", refreshTopSubtype);
  refreshTopSubtype();

  // Job modal piece categories
  const fc = document.getElementById("f-category");
  Object.keys(PIECE_TYPES).forEach(cat => { fc.appendChild(makeOption(cat, cat)); });
  fc.addEventListener("change", refreshModalSubtype);
  refreshModalSubtype();

  // Job modal statuses
  const fs = document.getElementById("f-status");
  STATUSES.forEach(s => { fs.appendChild(makeOption(s, s)); });

  // Sync operator top → job modal
  document.getElementById("global-operator").addEventListener("input", e => {
    document.getElementById("f-op").value = e.target.value;
  });

  // Wire Firebase listeners once SDK is ready
  const wireFirebase = () => {
    if (!window._fb) return;

    // Sessions → machineReports
    window._fb.listenSessions(data => {
      machineReports = {};
      window._sessionKeys = {};
      Object.entries(data).forEach(([machine, sessions]) => {
        machineReports[machine] = [];
        window._sessionKeys[machine] = [];
        Object.entries(sessions).forEach(([key, s]) => {
          machineReports[machine].push({ ...s, time: s.time ? new Date(s.time) : new Date() });
          window._sessionKeys[machine].push(key);
        });
      });
      renderReports();
    });

    // Maintenance log
    window._fb.listenMaint(data => {
      maintLog = Object.values(data).map(e => ({
        ...e, time: e.time ? new Date(e.time) : new Date()
      })).sort((a, b) => b.time - a.time);
      renderMaintLog();
    });

    // Wait log
    window._fb.listenWait(data => {
      waitLog = Object.values(data).map(e => ({
        ...e, time: e.time ? new Date(e.time) : new Date()
      })).sort((a, b) => b.time - a.time);
      renderWaitLog();
    });

    // Machine events
    window._fb.listenTargets(data => {
      window._targets = data;
      renderSettingsTargets();
    });

    window._fb.listenEvents(data => {
      machineEvents = {};
      Object.entries(data).forEach(([machine, events]) => {
        machineEvents[machine] = Object.values(events).map(e => ({
          ...e, time: e.time ? new Date(e.time) : new Date()
        })).sort((a, b) => b.time - a.time);
      });
      renderReports();
    });

    // Open Orders — sync across all devices when any device uploads a file
    window._fb.listenOrders(data => {
      if (!data) return;
      _openOrdersData = data;
      // Update the sync timestamp label
      const lastUpd = document.getElementById("orders-last-updated");
      if (lastUpd && data.fetchedAt) {
        const d = new Date(data.fetchedAt);
        lastUpd.textContent = "☁ Synced · " + d.toLocaleDateString([], {month:"short", day:"numeric"}) + " " + d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
      }
      // Re-render report cards so the vs-open-orders bars populate
      renderReports();
      // If currently on orders tab, render that view too
      const ordersView = document.getElementById("view-orders");
      if (ordersView && ordersView.classList.contains("active")) renderOpenOrders();
    });

    // Checklist partial progress — sync in-progress checklists across devices
    window._fb.listenChecklistProgress(data => {
      window._checklistProgress = data || {};
    });
  };

  // Set default date filter to today
  const _t = todayStr();
  const _df = document.getElementById("report-date-from");
  const _dt = document.getElementById("report-date-to");
  if (_df) _df.value = _t;
  if (_dt) _dt.value = _t;

  // Load local backup immediately (Firebase will overwrite/merge when ready)
  localLoadData();

  if (window._fbReady) {
    wireFirebase();
  } else {
    document.addEventListener("fbReady", wireFirebase);
  }

  // Quick-start: pre-select machine & default mode
  qsInitMachine();
  runDetailsPanelInit();
}

function selectMachine(btn) {
  document.querySelectorAll(".machine-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function goToNewRun() {
  document.getElementById("print-jobs-screen").style.display = "none";
  document.getElementById("print-run-screen").style.display  = "none";
  document.getElementById("reports-section").style.display   = "none";
  switchView('printing');
  const modeSelect = document.getElementById("print-mode-select");
  modeSelect.style.display = "flex";
  qsInitMachine();
}

function goToReports() {
  // Switch to printing view
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-printing").classList.add("active");
  document.getElementById("nav-printing").classList.add("active");
  // Show reports screen
  document.getElementById("print-mode-select").style.display = "none";
  document.getElementById("print-run-screen").style.display  = "none";
  const js = document.getElementById("print-jobs-screen");
  js.style.display = "block";
  document.getElementById("back-to-mode-btn").style.display = "inline-block";
  document.getElementById("reports-section").style.display = "block";
  document.getElementById("quality-report-section").style.display = "none";

  // Hide controls strip on reports/home screen
  const strip = document.getElementById("view-controls-slot-printing");
  if (strip) strip.style.display = "none";
  renderReports();
}

// ═══════════════════════════════════════
// NAV
// ═══════════════════════════════════════

function switchView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.getElementById("nav-"+name).classList.add("active");

  // Transition bar only relevant for printing
  const tb = document.getElementById("transition-bar");
  if (tb) tb.style.display = name === 'printing' ? '' : 'none';
  if (name === 'settings') {
    renderSettingsTargets();
    const urlInput = document.getElementById("settings-orders-url");
    if (urlInput && window._targets) urlInput.value = window._targets["__orders_url"] || "";
  }
  if (name === 'orders') renderOpenOrders();

  // Move the master controls into this view's slot
  const slot = document.getElementById("view-controls-slot-" + name);
  const opEl  = document.getElementById("ctrl-operator");
  const catEl = document.getElementById("ctrl-category");
  const subEl = document.getElementById("ctrl-subtype");
  const machEl = document.getElementById("ctrl-machine");
  if (slot) {
    if (name === 'printing') {
      slot.appendChild(opEl);
      slot.appendChild(catEl);
      slot.appendChild(subEl);
      slot.appendChild(machEl);
    } else if (name === 'stamped') {
      slot.appendChild(opEl);
      slot.appendChild(catEl);
      slot.appendChild(subEl);
    } else if (name === 'maintenance') {
      slot.appendChild(opEl);
      slot.appendChild(machEl);
      document.querySelectorAll(".machine-btn").forEach(b => b.style.display = "");
    } else if (name === 'waiting') {
      slot.appendChild(machEl);
      document.querySelectorAll(".machine-btn").forEach(b => b.style.display = "");
    }
    // settings — no controls
  }

  // Stamped tab init — lock category/subtype to Wallets only
  if (name === 'stamped') {
    const gc = document.getElementById("global-category");
    const gs = document.getElementById("global-subtype");
    gc.dataset.prevValue = gc.value;
    gs.dataset.prevValue = gs.value;
    gc.innerHTML = '';
    gc.appendChild(makeOption("Wallets", "Wallets"));
    gc.value = "Wallets";
    gc.disabled = true;
    gs.innerHTML = '';
    (PIECE_TYPES["Wallets"] || []).forEach(t => gs.appendChild(makeOption(t, t)));
    if (gs.dataset.prevValue && PIECE_TYPES["Wallets"]?.includes(gs.dataset.prevValue)) {
      gs.value = gs.dataset.prevValue;
    }
    stUpdatePieceLabel();
    stPopulatePieceSelect();
    stPopulateMisprintSelect();
  }

  if (name !== 'stamped') {
    // Auto-save stamped tally when leaving tab
    if (typeof stSaveAndReset === 'function') stSaveAndReset();
    const gc = document.getElementById("global-category");
    if (gc.disabled) {
      gc.disabled = false;
      gc.innerHTML = '';
      Object.keys(PIECE_TYPES).forEach(cat => gc.appendChild(makeOption(cat, cat)));
      gc.value = gc.dataset.prevValue || Object.keys(PIECE_TYPES)[0];
      refreshTopSubtype();
    }
  }

  // When returning to printing, go to mode select unless a run is active
  if (name === 'printing') {
    // Always ensure the controls strip is visible when on printing tab
    const printStrip = document.getElementById("view-controls-slot-printing");
    if (printStrip) printStrip.style.display = "none"; // handled inline on quick-start + run screens
    // Hide Wallets from printing machine buttons
    document.querySelectorAll(".machine-btn").forEach(b => {
      b.style.display = b.dataset.machine === "Wallets" ? "none" : "";
    });
    if (runRunning) {
      document.getElementById("print-mode-select").style.display = "none";
      document.getElementById("print-jobs-screen").style.display = "none";
      document.getElementById("print-run-screen").style.display = "flex";
    } else {
      document.getElementById("print-run-screen").style.display = "none";
      document.getElementById("print-jobs-screen").style.display = "none";
      document.getElementById("print-mode-select").style.display = "flex";
      qsInitMachine();
    }
  }
}

// ═══════════════════════════════════════
// PRINTING
// ═══════════════════════════════════════
function renderGrid() {
  // Job grid replaced by production reports — no-op
}

function buildCard(job) {
  const c = STATUS_COLORS[job.status];
  const isOverdue = job.due && new Date(job.due) < new Date() && job.status !== "Delivered";
  const idx = STATUSES.indexOf(job.status);
  const pct = Math.round(((idx+1)/STATUSES.length)*100);

  const card = document.createElement("div");
  card.className = "job-card";
  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-badges">
          <span class="badge badge-id">${job.id}</span>
          <span class="badge badge-type">${job.type}</span>
          ${job.pieceCategory ? `<span class="badge badge-piece">${job.pieceCategory} · ${job.pieceType}</span>` : ""}
          ${isOverdue ? `<span class="badge badge-overdue">Overdue</span>` : ""}
        </div>
        <div class="card-title">${job.title}</div>
        <div class="card-client">${job.client}</div>
      </div>
      <span class="status-pill" style="background:${c.bg};color:${c.text};border-color:${c.accent}">${job.status}</span>
    </div>
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${c.text}"></div></div>
      <span class="progress-pct">${pct}%</span>
    </div>
    <div class="card-meta">
      <span class="meta-item">Due: <span class="meta-val${isOverdue?" overdue":""}">${job.due||"—"}</span></span>
      <span class="meta-item">Qty: <span class="meta-val">${job.qty||"—"}</span></span>
      ${job.operator?`<span class="meta-item">Op: <span class="meta-val op">${job.operator}</span></span>`:""}
      ${job.notes?`<span class="card-notes">${job.notes}</span>`:""}
    </div>
    <div class="status-btns" id="sb-${job.id}"></div>
    <div class="card-actions">
      <button class="edit-btn" onclick="openJobModal('${job.id}')">Edit</button>
      <button class="del-btn"  onclick="deleteJob('${job.id}')">Delete</button>
    </div>
  `;

  const sb = card.querySelector(`#sb-${job.id}`);
  STATUSES.forEach((s, i) => {
    const sc = STATUS_COLORS[s], isActive = s===job.status, isPast = i<idx;
    const btn = document.createElement("button");
    btn.className = "status-btn";
    btn.textContent = s;
    btn.style.cssText = `border:1px solid ${isActive?sc.accent:"#1a1a1a"};background:${isActive?sc.bg:"transparent"};color:${isActive?sc.text:isPast?"#333":"#2a2a2a"};`;
    btn.onclick = () => { jobs = jobs.map(j => j.id===job.id ? {...j,status:s} : j); renderGrid(); };
    sb.appendChild(btn);
  });

  return card;
}

function deleteJob(id) { jobs = jobs.filter(j => j.id !== id); renderGrid(); }

function openJobModal(id) {
  editingJobId = id;
  document.getElementById("job-modal-title").textContent = id ? `Edit ${id}` : "New Job";
  const op = document.getElementById("global-operator").value;
  if (id) {
    const j = jobs.find(x => x.id===id);
    document.getElementById("f-title").value    = j.title;
    document.getElementById("f-client").value   = j.client;
    document.getElementById("f-op").value       = j.operator||"";
    document.getElementById("f-category").value = j.pieceCategory;
    refreshModalSubtype();
    document.getElementById("f-piecetype").value = j.pieceType;
    document.getElementById("f-type").value     = j.type;
    document.getElementById("f-status").value   = j.status;
    document.getElementById("f-due").value      = j.due||"";
    document.getElementById("f-qty").value      = j.qty||"";
    document.getElementById("f-notes").value    = j.notes||"";
  } else {
    ["f-title","f-client","f-due","f-qty","f-notes"].forEach(id => document.getElementById(id).value="");
    document.getElementById("f-op").value = op;
    document.getElementById("f-category").value = Object.keys(PIECE_TYPES)[0];
    refreshModalSubtype();
    document.getElementById("f-type").value   = "Digital";
    document.getElementById("f-status").value = "Queued";
  }
  openModal("job-modal");
}

function saveJob() {
  const title = document.getElementById("f-title").value.trim();
  if (!title) { document.getElementById("f-title").focus(); return; }
  const job = {
    title, client: document.getElementById("f-client").value.trim(),
    operator: document.getElementById("f-op").value.trim(),
    pieceCategory: document.getElementById("f-category").value,
    pieceType: document.getElementById("f-piecetype").value,
    type: document.getElementById("f-type").value,
    status: document.getElementById("f-status").value,
    due: document.getElementById("f-due").value,
    qty: document.getElementById("f-qty").value,
    notes: document.getElementById("f-notes").value.trim(),
  };
  if (editingJobId) {
    jobs = jobs.map(j => j.id===editingJobId ? {...j,...job} : j);
  } else {
    job.id = `PJ-${String(nextId).padStart(3,"0")}`; nextId++;
    jobs.push(job);
  }
  closeModal("job-modal");
  renderGrid();
}

// ── ENTER KEY → confirm active modal ──
document.addEventListener("keydown", e => {
  // Mode select hotkeys: 1-4 (only when mode select screen is visible)
  const modeSelect = document.getElementById("print-mode-select");
  if (modeSelect && modeSelect.style.display !== "none") {
    // [1] Stop/Go, [2] Continuous — color determined by piece type during run
    if (e.key === "1") { e.preventDefault(); qsPickFunction("stopgo");     selectPrintMode("stopgo-fc");     return; }
    if (e.key === "2") { e.preventDefault(); qsPickFunction("continuous"); selectPrintMode("continuous-fc"); return; }
  }

  // Run screen keyboard shortcuts (only when run screen is visible)
  const runScreen = document.getElementById("print-run-screen");
  const tag = document.activeElement.tagName;
  const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement.isContentEditable;

  // Stamped hotkeys: + to tally, Escape to stop timer
  const stView = document.getElementById("view-stamped");
  if (stView && stView.classList.contains("active")) {
    if (!isTyping && (e.key === "+" || e.key === "=")) { e.preventDefault(); stTallyInc(); return; }
    if (!isTyping && e.key === "Escape" && stRunning)  { e.preventDefault(); stStop(); return; }
  }

  if (runScreen && runScreen.style.display !== "none") {
    if (!isTyping && e.key === "Enter") {
      e.preventDefault(); runChangeover(); return;
    }
    if (!isTyping && e.key === " ") {
      e.preventDefault(); runPause(); return;
    }
    if (e.key === "Escape") {
      e.preventDefault(); runStop(); return;
    }
  }

  if (e.key !== "Tab") return;
  // Don't fire if focus is on a textarea (allow newlines)
  if (document.activeElement.tagName === "TEXTAREA") return;

  if (document.getElementById("run-summary-modal").classList.contains("open")) {
    e.preventDefault(); runSummaryConfirm(); return;
  }
  if (document.getElementById("job-modal").classList.contains("open")) {
    e.preventDefault(); saveJob(); return;
  }
  if (document.getElementById("mech-modal").classList.contains("open")) {
    // Only confirm if on step 2 (step 1 has no confirm action)
    if (document.getElementById("mech-s2").style.display !== "none") {
      e.preventDefault(); mechConfirm(); return;
    }
  }
  if (document.getElementById("clean-modal").classList.contains("open")) {
    e.preventDefault(); cleanStop(); return;
  }
  if (document.getElementById("defective-modal").classList.contains("open")) {
    e.preventDefault(); logDefective(); return;
  }
});

init();

window.addEventListener("DOMContentLoaded", () => {
  const slot = document.getElementById("view-controls-slot-printing");
  if (slot) {
    slot.appendChild(document.getElementById("ctrl-operator"));
    slot.appendChild(document.getElementById("ctrl-category"));
    slot.appendChild(document.getElementById("ctrl-subtype"));
    slot.appendChild(document.getElementById("ctrl-machine"));
    // Hide category + piece type on Quick Start — only shown once a run is active
    pfSetRunControlsVisible(false);
    // Reports is the home screen — hide controls until user goes to a run
    slot.style.display = "none";
  }
});

window.addEventListener("resize", () => { if (document.getElementById("hourly-chart-wrap").style.display !== "none") renderReports(); });
