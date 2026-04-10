// ═══════════════════════════════════════
// MAINTENANCE — MECHANICAL
// ═══════════════════════════════════════
function openMechModal() {
  mechBack();
  openModal("mech-modal");
}
function mechBack() {
  clearInterval(mechFixInterval); mechFixRunning = false; mechFixSec = 0;
  document.getElementById("mech-s1").style.display = "block";
  document.getElementById("mech-s2").style.display = "none";
  mechPendingChoice = null;
}
function mechChoose(choice) {
  mechPendingChoice = choice;
  document.getElementById("mech-s1").style.display = "none";
  document.getElementById("mech-s2").style.display = "block";
  const body = document.getElementById("mech-s2-body");
  const logBtn = document.getElementById("mech-log-btn");

  if (choice === "fix") {
    mechFixCount++;
    mechFixSec = 0; mechFixRunning = false; clearInterval(mechFixInterval);
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#336633;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Fix #${mechFixCount} — Time to Repair</div>
        <div id="mech-fix-timer" style="font-family:'Abril Fatface',serif;font-size:52px;color:#228833;line-height:1;">00:00:00</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
          <button onclick="mechFixStart()" id="mech-fix-start-btn" style="padding:8px 18px;background:#f0fff4;border:1px solid #88dd99;border-radius:6px;color:#228833;font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;cursor:pointer;display:none;">▶ Start</button>
          <button onclick="mechFixStop()"  id="mech-fix-stop-btn"  style="padding:8px 18px;background:#fff0f0;border:1px solid #ffaaaa;border-radius:6px;color:#cc3333;font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;cursor:pointer;">■ Stop</button>
          <button onclick="mechFixReset()" style="padding:8px 18px;background:#fff;border:1px solid #f0d0dc;border-radius:6px;color:#c090a8;font-family:'Josefin Slab',serif;font-size:12px;cursor:pointer;">↺ Reset</button>
        </div>
      </div>
      <div class="mf full"><label>Notes</label><textarea id="mech-fix-notes" placeholder="Describe what was fixed..."></textarea></div>
    `;
    logBtn.textContent = "Log Operator Fix";
    logBtn.className = "btn-save";
    // Auto-start timer
    mechFixRunning = true;
    mechFixStartWall = Date.now();
    mechFixInterval = setInterval(() => {
      mechFixSec = Math.floor((Date.now() - mechFixStartWall) / 1000);
      const el = document.getElementById("mech-fix-timer");
      if (el) el.textContent = fmt(mechFixSec);
    }, 500);
  } else {
    // Stop any running timers
    if (waitRunning) waitStop();
    if (cleanRunning) cleanStop();
    body.innerHTML = `
      <div style="background:#1a0808;border:1px solid #5a1a1a;border-radius:6px;padding:11px 14px;margin-bottom:14px;font-family:'Josefin Slab',serif;font-size:12px;color:#ff5555;">
        ⚠ Machine is going DOWN — all timers stopped.
      </div>
      <div class="mf full"><label>Notes</label><textarea id="mech-down-notes" placeholder="Describe the issue..."></textarea></div>
      <div class="mf full" style="margin-top:8px;"><label>Service Call Number</label><input id="mech-svc" placeholder="e.g. SVC-20260304" /></div>
    `;
    logBtn.textContent = "Log Down";
    logBtn.className = "btn-danger";
  }
}
function mechFixStart() {
  if (mechFixRunning) return;
  mechFixRunning = true;
  mechFixStartWall = Date.now() - (mechFixSec * 1000); // preserve any existing secs
  document.getElementById("mech-fix-start-btn").style.display = "none";
  document.getElementById("mech-fix-stop-btn").style.display  = "inline-block";
  mechFixInterval = setInterval(() => {
    mechFixSec = Math.floor((Date.now() - mechFixStartWall) / 1000);
    const el = document.getElementById("mech-fix-timer");
    if (el) el.textContent = fmt(mechFixSec);
  }, 500);
}
function mechFixStop() {
  if (!mechFixRunning) return;
  clearInterval(mechFixInterval); mechFixRunning = false;
  const startBtn = document.getElementById("mech-fix-start-btn");
  const stopBtn  = document.getElementById("mech-fix-stop-btn");
  if (startBtn) startBtn.style.display = "inline-block";
  if (stopBtn)  stopBtn.style.display  = "none";
}
function mechFixReset() {
  clearInterval(mechFixInterval); mechFixRunning = false; mechFixSec = 0; mechFixStartWall = 0;
  const el = document.getElementById("mech-fix-timer");
  if (el) el.textContent = "00:00:00";
  const startBtn = document.getElementById("mech-fix-start-btn");
  const stopBtn  = document.getElementById("mech-fix-stop-btn");
  if (startBtn) startBtn.style.display = "inline-block";
  if (stopBtn)  stopBtn.style.display  = "none";
}
function mechConfirm() {
  clearInterval(mechFixInterval); mechFixRunning = false;
  const op = document.getElementById("global-operator").value || "—";
  const now = new Date();
  if (mechPendingChoice === "fix") {
    const notes = document.getElementById("mech-fix-notes").value.trim();
    const duration = mechFixSec > 0 ? fmt(mechFixSec) : "—";
    addMaintEntry({type:"Operator Fix", color:"#228833", detail:`Fix #${mechFixCount} · ${duration}`, notes, op, time:now});
    setBanner("fix", mechFixCount, null);
  } else {
    const notes = document.getElementById("mech-down-notes").value.trim();
    const svc   = document.getElementById("mech-svc").value.trim();
    addMaintEntry({type:"Machine Down", color:"#ff5555", detail: svc ? `SVC: ${svc}` : "No service # entered", notes, op, time:now});
    setBanner("down", 0, svc);
  }
  closeModal("mech-modal");
}
function setBanner(state, fixCount, svc) {
  const b = document.getElementById("mech-banner");
  b.style.display = "block";
  if (state === "fix") {
    Object.assign(b.style, {background:"#0a1a0a",border:"1px solid #2a5a2a",color:"#55cc55",fontFamily:"'Josefin Slab',serif",fontSize:"13px",borderRadius:"8px",padding:"13px 18px"});
    b.textContent = `✓ Machine running — ${fixCount} fix(es) logged this session`;
  } else {
    Object.assign(b.style, {background:"#1a0808",border:"1px solid #5a1a1a",color:"#ff5555",fontFamily:"'Josefin Slab',serif",fontSize:"13px",borderRadius:"8px",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"});
    b.innerHTML = `<span>✗ MACHINE DOWN${svc?" — Service Call: "+svc:""}</span><button onclick="openMechUpModal()" style="padding:7px 14px;background:#0a1a0a;border:1px solid #2a5a2a;border-radius:6px;color:#55cc55;font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">✓ Machine Back Up</button>`;
  }
}
function openMechUpModal() {
  document.getElementById("mech-up-notes").value = "";
  openModal("mech-up-modal");
}
function mechUpConfirm() {
  const op    = document.getElementById("global-operator").value || "—";
  const notes = document.getElementById("mech-up-notes").value.trim();
  const now   = new Date();
  addMaintEntry({type:"Machine Back Up", color:"#228833", detail:"Machine returned to service", notes, op, time:now});
  const b = document.getElementById("mech-banner");
  Object.assign(b.style, {background:"#0a1a0a",border:"1px solid #2a5a2a",color:"#55cc55",fontFamily:"'Josefin Slab',serif",fontSize:"13px",borderRadius:"8px",padding:"13px 18px",display:"block"});
  b.textContent = "✓ Machine back up and running";
  closeModal("mech-up-modal");
}

// ── CLEANING ──

// ── CLEANING ──
// (_cleanChecks declared in state.js)
function openCleanModal() {
  cleanReset();
  _cleanChecks = {};
  document.getElementById("clean-notes").value = "";
  document.getElementById("clean-start-btn").style.display = "inline-block";
  document.getElementById("clean-stop-btn").style.display  = "none";
  document.getElementById("clean-submit-btn").disabled = true;
  document.getElementById("clean-submit-btn").style.background = "#ccddee";
  document.getElementById("clean-submit-btn").style.color = "#6699aa";
  document.getElementById("clean-submit-btn").style.cursor = "not-allowed";
  document.getElementById("clean-submit-btn").textContent = "✓ Submit";
  const resumeBanner = document.getElementById("clean-resume-banner");
  if (resumeBanner) resumeBanner.style.display = "none";
  // Pre-fill operator from global
  const op = document.getElementById("global-operator")?.value || "";
  document.getElementById("clean-operator").value = op;
  // Pre-fill machine from active machine btn
  const activeMachine = document.querySelector(".machine-btn.active")?.dataset.machine || "";
  const machSel = document.getElementById("clean-machine");
  if (activeMachine && machSel) machSel.value = activeMachine;
  cleanRenderChecklist();
  openModal("clean-modal");
}

function cleanRenderChecklist() {
  const machine = document.getElementById("clean-machine")?.value || "";
  const shift   = document.getElementById("clean-shift")?.value || "Start of Shift";
  const body    = document.getElementById("clean-checklist-body");
  if (!body) return;

  const tasks = CLEANING_CHECKLISTS[machine]?.[shift] || [];
  _cleanChecks = {};

  if (!machine) {
    body.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#88aacc;text-align:center;padding:20px;">Select a machine to see the checklist.</div>`;
    cleanUpdateProgress();
    return;
  }
  if (tasks.length === 0) {
    body.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#88aacc;text-align:center;padding:20px;">No tasks defined for this machine / shift type yet.</div>`;
    cleanUpdateProgress();
    return;
  }

  // Check for saved partial progress
  const progressKey = cleanProgressKey(machine, shift);
  const savedChecks = window._checklistProgress?.[progressKey]?.checks || {};
  const hasSaved    = Object.keys(savedChecks).some(k => savedChecks[k]);
  const resumeBanner = document.getElementById("clean-resume-banner");
  if (resumeBanner) resumeBanner.style.display = hasSaved ? "" : "none";

  body.innerHTML = "";
  tasks.forEach((task, i) => {
    _cleanChecks[task] = savedChecks[task] || false;
    const done = _cleanChecks[task];
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:8px;margin-bottom:6px;background:${done ? '#eaf4fc' : (i%2===0?'#f5faff':'#fff')};border:1px solid #ddeef8;cursor:pointer;transition:background 0.15s;`;
    row.id = "clean-row-" + i;
    row.onclick = () => cleanToggleTask(task, i);

    const box = document.createElement("div");
    box.id = "clean-box-" + i;
    box.style.cssText = `width:22px;height:22px;border-radius:5px;border:2px solid ${done?'#2288cc':'#88aacc'};background:${done?'#2288cc':'#fff'};flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s;`;
    box.innerHTML = done ? `<svg width="13" height="10" viewBox="0 0 13 10" fill="none"><polyline points="1.5,5 5,8.5 11.5,1.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : "";

    const label = document.createElement("span");
    label.id = "clean-label-" + i;
    label.style.cssText = `font-family:'Josefin Slab',serif;font-size:13px;color:${done?'#88aacc':'#1a2a38'};text-decoration:${done?'line-through':'none'};`;
    label.textContent = task;

    row.appendChild(box);
    row.appendChild(label);
    body.appendChild(row);
  });

  cleanUpdateProgress();
}

function cleanToggleTask(task, i) {
  _cleanChecks[task] = !_cleanChecks[task];
  const done = _cleanChecks[task];
  const box   = document.getElementById("clean-box-"   + i);
  const label = document.getElementById("clean-label-" + i);
  const row   = document.getElementById("clean-row-"   + i);
  if (box) {
    box.style.background   = done ? "#2288cc" : "#fff";
    box.style.borderColor  = done ? "#2288cc" : "#88aacc";
    box.innerHTML = done ? `<svg width="13" height="10" viewBox="0 0 13 10" fill="none"><polyline points="1.5,5 5,8.5 11.5,1.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : "";
  }
  if (label) { label.style.color = done ? "#88aacc" : "#1a2a38"; label.style.textDecoration = done ? "line-through" : "none"; }
  if (row)   row.style.background = done ? "#eaf4fc" : "";
  cleanUpdateProgress();
}

function cleanProgressKey(machine, shift) {
  // Safe Firebase key: replace spaces and special chars
  return (machine + "_" + shift).replace(/[^a-zA-Z0-9_]/g, "_");
}

function cleanUpdateProgress() {
  const tasks   = Object.keys(_cleanChecks);
  const done    = tasks.filter(t => _cleanChecks[t]).length;
  const total   = tasks.length;
  const pct     = total > 0 ? Math.round(done / total * 100) : 0;
  const allDone = total > 0 && done === total;
  const anyDone = done > 0;

  const fill  = document.getElementById("clean-progress-fill");
  const lbl   = document.getElementById("clean-progress-label");
  const btn   = document.getElementById("clean-submit-btn");
  const saveBtn = document.getElementById("clean-save-progress-btn");

  if (fill) fill.style.width = pct + "%";
  if (lbl)  lbl.textContent = done + " / " + total;

  if (btn) {
    // Enable Submit once any task is checked — label changes based on completion
    if (anyDone) {
      btn.disabled = false;
      btn.style.background = allDone ? "#2288cc" : "#1a6a3a";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.textContent = allDone ? "✓ Submit Complete" : "✓ Submit Partial (" + done + "/" + total + ")";
    } else {
      btn.disabled = true;
      btn.style.background = "#ccddee";
      btn.style.color = "#6699aa";
      btn.style.cursor = "not-allowed";
      btn.textContent = "✓ Submit";
    }
  }
  if (saveBtn) {
    saveBtn.style.opacity = anyDone ? "1" : "0.45";
    saveBtn.style.cursor  = anyDone ? "pointer" : "default";
  }
}

// Legacy alias kept for safety
function cleanCheckAllDone() { cleanUpdateProgress(); }

function cleanSaveProgress() {
  const machine = document.getElementById("clean-machine")?.value || "";
  const shift   = document.getElementById("clean-shift")?.value   || "Start of Shift";
  const op      = document.getElementById("clean-operator")?.value.trim() || "";
  if (!machine || !Object.values(_cleanChecks).some(v => v)) return;

  const key  = cleanProgressKey(machine, shift);
  const data = { machine, shift, op, checks: { ..._cleanChecks }, savedAt: new Date().toISOString() };

  if (!window._checklistProgress) window._checklistProgress = {};
  window._checklistProgress[key] = data;
  if (window._fb) window._fb.saveChecklistProgress(key, data);

  // Visual feedback
  const btn = document.getElementById("clean-save-progress-btn");
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = "✓ Saved";
    btn.style.background = "#1a6a3a";
    btn.style.color = "#fff";
    setTimeout(() => { btn.innerHTML = orig; btn.style.background = "#1a3a5a"; btn.style.color = "#88ccee"; }, 1800);
  }
  closeModal("clean-modal");
  cleanReset();
}

function cleanSubmit() {
  clearInterval(cleanInterval); cleanRunning = false;
  const op      = document.getElementById("clean-operator")?.value.trim() || document.getElementById("global-operator")?.value || "—";
  const machine = document.getElementById("clean-machine")?.value || "—";
  const shift   = document.getElementById("clean-shift")?.value   || "—";
  const notes   = document.getElementById("clean-notes")?.value.trim() || "";
  const tasks   = Object.keys(_cleanChecks);
  const completed = tasks.filter(t => _cleanChecks[t]).length;
  const partial = completed < tasks.length;
  const detail  = `${shift} · ${machine} · ${completed}/${tasks.length} tasks${partial ? " (partial)" : ""} · ${fmt(cleanSec)}`;
  const notesFull = [notes, "Tasks: " + tasks.map(t => (_cleanChecks[t]?"✓":"✗") + " " + t).join(", ")].filter(Boolean).join("\n");
  addMaintEntry({ type:"Cleaning", color:"#5599cc", detail, notes:notesFull, op, machine, time:new Date() });
  if (window._fb) {
    window._fb.saveMachineEvent(machine, {
      category:"cleaning", type:"Cleaning", detail, notes:notesFull, color:"#5599cc",
      time:new Date().toISOString()
    });
  }
  // Clear saved progress for this checklist once submitted
  const key = cleanProgressKey(machine, shift);
  if (window._checklistProgress) delete window._checklistProgress[key];
  if (window._fb) window._fb.clearChecklistProgress(key);

  closeModal("clean-modal");
  cleanReset();
}

function cleanStart() {
  if (cleanRunning) return;
  cleanRunning = true;
  document.getElementById("clean-start-btn").style.display = "none";
  document.getElementById("clean-stop-btn").style.display  = "inline-block";
  cleanStartWall = Date.now() - (cleanSec * 1000);
  cleanInterval = setInterval(() => {
    cleanSec = Math.floor((Date.now() - cleanStartWall) / 1000);
    document.getElementById("clean-timer-display").textContent = fmt(cleanSec);
  }, 500);
}

function cleanStop() {
  if (!cleanRunning) return;
  clearInterval(cleanInterval); cleanRunning = false;
  document.getElementById("clean-start-btn").style.display = "inline-block";
  document.getElementById("clean-stop-btn").style.display  = "none";
}

function cleanCancel() {
  closeModal("clean-modal");
  cleanReset();
}

function cleanReset() {
  clearInterval(cleanInterval); cleanRunning = false; cleanSec = 0; cleanStartWall = 0;
  const d = document.getElementById("clean-timer-display");
  if (d) d.textContent = "00:00:00";
  _cleanChecks = {};
}
function openDefectiveModal() {
  document.getElementById("tally-display").value = "";
  document.getElementById("tally-notes").value = "";
  // Populate category dropdown
  const cat = document.getElementById("tally-category");
  cat.innerHTML = "";
  Object.keys(PIECE_TYPES).forEach(c => cat.appendChild(makeOption(c, c)));
  const globalCat = document.getElementById("global-category").value;
  if (globalCat) cat.value = globalCat;
  refreshTallySubtype();
  openModal("defective-modal");
}
function refreshTallySubtype() {
  const cat = document.getElementById("tally-category").value;
  const sub = document.getElementById("tally-subtype");
  sub.innerHTML = "";
  (PIECE_TYPES[cat] || []).forEach(t => sub.appendChild(makeOption(t, t)));
  const globalSub = document.getElementById("global-subtype").value;
  if (globalSub && PIECE_TYPES[cat]?.includes(globalSub)) sub.value = globalSub;
}
function logDefective() {
  const count = parseInt(document.getElementById("tally-display").value) || 0;
  const notes = document.getElementById("tally-notes").value.trim();
  const op = document.getElementById("global-operator").value || "—";
  const cat = document.getElementById("tally-category").value;
  const sub = document.getElementById("tally-subtype").value;
  const pieceInfo = cat ? ` · ${cat}${sub ? ' › ' + sub : ''}` : '';
  addMaintEntry({type:"Defective Material", color:"#aa55cc", detail:`Count: ${count}${pieceInfo}`, notes, op, time:new Date()});
  closeModal("defective-modal");
}

// ── MAINT LOG ──

// ═══════════════════════════════════════
// MAINTENANCE TABS
// ═══════════════════════════════════════

// MAINTENANCE TABS
// ═══════════════════════════════════════
// (_maintLogFilter declared in state.js)
function maintSwitchTab(tab) {
  const panels = { actions: 'maint-panel-actions', log: 'maint-panel-log' };
  const tabs   = { actions: 'maint-tab-actions',   log: 'maint-tab-log' };
  Object.keys(panels).forEach(t => {
    document.getElementById(panels[t]).style.display = t === tab ? '' : 'none';
    const btn = document.getElementById(tabs[t]);
    if (t === tab) {
      btn.style.color = '#e87820';
      btn.style.borderBottomColor = '#e87820';
    } else {
      btn.style.color = '#c0a080';
      btn.style.borderBottomColor = 'transparent';
    }
  });
  if (tab === 'log') renderMaintLog();
}

function maintLogFilter(filter) {
  _maintLogFilter = filter;
  // Update pill styles
  ['all','cleaning','mechanical','defective'].forEach(f => {
    const btn = document.getElementById('maint-log-filter-' + f);
    if (!btn) return;
    const colors = { all:'#e87820', cleaning:'#5599cc', mechanical:'#228833', defective:'#aa55cc' };
    const active = f === filter;
    btn.style.background   = active ? colors[f] : '#fff';
    btn.style.color        = active ? '#fff' : colors[f];
    btn.style.borderColor  = active ? colors[f] : '#c0d0e0';
  });
  renderMaintLog();
}


// ── MAINTENANCE REPORTS ──
function renderMaintReports() {
  const grid = document.getElementById("maint-reports-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const SHIFT_TYPES = ["Start of Shift","Mid Shift","End of Shift","40 Hour","Monthly","Quarterly","Semi-Annual"];
  const MECH_TYPES  = ["Operator Fix","Machine Down","Machine Back Up"];

  // Group maint log by machine
  const byMachine = {};
  maintLog.forEach(e => {
    const m = e.machine || "Unassigned";
    if (!byMachine[m]) byMachine[m] = [];
    byMachine[m].push(e);
  });

  const machines = [...MACHINES, ...Object.keys(byMachine)].filter((v,i,a) => a.indexOf(v) === i);

  machines.forEach(machine => {
    const entries = byMachine[machine] || [];
    const mechEntries = entries.filter(e => MECH_TYPES.includes(e.type));
    const cleanEntries = entries.filter(e => e.type === "Cleaning");
    const downOrUp = mechEntries.filter(e => e.type === "Machine Down" || e.type === "Machine Back Up");
    const lastDownOrUp = downOrUp.length ? downOrUp.reduce((a,b) => new Date(a.time) > new Date(b.time) ? a : b) : null;
    const hasDown = lastDownOrUp?.type === "Machine Down";

    // Figure out which shift types have been completed for this machine
    const completedShifts = {};
    SHIFT_TYPES.forEach(st => {
      const matches = cleanEntries.filter(e => e.detail && e.detail.includes(st));
      if (matches.length) completedShifts[st] = matches;
    });

    const card = document.createElement("div");
    card.style.cssText = `background:#fff;border:1px solid ${hasDown ? '#ffaaaa' : '#e8d8c0'};border-radius:12px;padding:16px 18px;cursor:pointer;box-shadow:${hasDown ? '0 0 0 2px #ff444433' : '0 2px 8px rgba(0,0,0,0.06)'};transition:box-shadow 0.15s;`;
    card.onmouseenter = () => card.style.boxShadow = hasDown ? '0 0 0 3px #ff444455' : '0 4px 16px rgba(0,0,0,0.12)';
    card.onmouseleave = () => card.style.boxShadow = hasDown ? '0 0 0 2px #ff444433' : '0 2px 8px rgba(0,0,0,0.06)';
    card.onclick = () => openMaintMachineDetail(machine);

    // Machine name row
    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
    nameRow.innerHTML = `
      <div style="font-family:'Abril Fatface',serif;font-size:18px;color:#1a1a2e;letter-spacing:0.02em;">${machine}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${hasDown ? `<span style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;background:#ff4444;color:#fff;border-radius:4px;padding:3px 8px;letter-spacing:0.05em;">⚠ MACHINE DOWN</span>` : ""}
        ${mechEntries.length && !hasDown ? `<span style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;background:#fff0e0;color:#e87820;border:1px solid #f0c080;border-radius:4px;padding:3px 8px;letter-spacing:0.05em;">⚙ ${mechEntries.length} Fix${mechEntries.length>1?'es':''}</span>` : ""}
        <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">▶ Details</span>
      </div>`;
    card.appendChild(nameRow);

    // Shift type pills
    if (Object.keys(completedShifts).length === 0 && mechEntries.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;color:#ccc;font-style:italic;";
      empty.textContent = "No maintenance logged for this machine yet.";
      card.appendChild(empty);
    } else {
      const pillRow = document.createElement("div");
      pillRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";
      SHIFT_TYPES.forEach(st => {
        const done = completedShifts[st];
        const pill = document.createElement("span");
        pill.style.cssText = done
          ? "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;background:#e8f5ee;color:#228844;border:1px solid #b0ddc0;border-radius:20px;padding:4px 10px;letter-spacing:0.04em;"
          : "font-family:'Josefin Slab',serif;font-size:10px;background:#f5f5f5;color:#bbb;border:1px solid #e0e0e0;border-radius:20px;padding:4px 10px;letter-spacing:0.04em;";
        pill.textContent = (done ? "✓ " : "") + st + (done ? ` (${done.length})` : "");
        pillRow.appendChild(pill);
      });
      card.appendChild(pillRow);

      // Last maintenance line
      if (entries.length) {
        const last = entries[0];
        const lastDiv = document.createElement("div");
        lastDiv.style.cssText = "margin-top:10px;font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;border-top:1px solid #f0e8d8;padding-top:8px;";
        lastDiv.textContent = "Last entry: " + last.type + " · " + (last.time ? new Date(last.time).toLocaleString() : "");
        card.appendChild(lastDiv);
      }
    }

    grid.appendChild(card);
  });

  if (!machines.length) {
    grid.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:13px;color:#bbb;text-align:center;padding:40px;">No maintenance entries yet.</div>`;
  }
}

function openMaintMachineDetail(machine) {
  const SHIFT_TYPES = ["Start of Shift","Mid Shift","End of Shift","40 Hour","Monthly","Quarterly","Semi-Annual"];
  const MECH_TYPES  = ["Operator Fix","Machine Down","Machine Back Up"];
  const entries = maintLog.filter(e => (e.machine || "Unassigned") === machine);
  const mechEntries  = entries.filter(e => MECH_TYPES.includes(e.type));
  const cleanEntries = entries.filter(e => e.type === "Cleaning");

  // Build modal content
  let html = `<div style="font-family:'Abril Fatface',serif;font-size:22px;color:#1a1a2e;margin-bottom:16px;">${machine} — Maintenance Detail</div>`;

  // Mechanical issues section
  if (mechEntries.length) {
    const _downOrUp2 = mechEntries.filter(e => e.type === "Machine Down" || e.type === "Machine Back Up");
    const _lastDU2 = _downOrUp2.length ? _downOrUp2.reduce((a,b) => new Date(a.time) > new Date(b.time) ? a : b) : null;
    const hasDown = _lastDU2?.type === "Machine Down";
    html += `<div style="background:${hasDown?'#fff5f5':'#fff8f0'};border:1px solid ${hasDown?'#ffaaaa':'#f0c080'};border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${hasDown?'#cc2222':'#e87820'};margin-bottom:10px;">${hasDown?'⚠ Mechanical Issues':'⚙ Operator Fixes'}</div>`;
    mechEntries.forEach(e => {
      html += `<div style="padding:8px 0;border-bottom:1px solid #f5e8d8;display:flex;flex-direction:column;gap:2px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:${e.type==='Machine Down'?'#cc2222':e.type==='Machine Back Up'?'#228833':'#e87820'};">${e.type}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">${e.time ? new Date(e.time).toLocaleString() : ""}</span>
        </div>
        ${e.detail ? `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#555;">${e.detail}</div>` : ""}
        ${e.notes  ? `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#888;font-style:italic;">${e.notes}</div>` : ""}
        ${e.op     ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">Op: ${e.op}</div>` : ""}
      </div>`;
    });
    html += `</div>`;
  }

  // Cleaning by shift type
  html += `<div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#5599cc;margin-bottom:10px;">🧹 Cleaning Checklist Completions</div>`;
  SHIFT_TYPES.forEach(st => {
    const matches = cleanEntries.filter(e => e.detail && e.detail.includes(st));
    if (!matches.length) return;
    html += `<div style="margin-bottom:12px;">
      <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#228844;margin-bottom:6px;">✓ ${st} (${matches.length}x)</div>`;
    matches.forEach(e => {
      html += `<div style="padding:6px 10px;background:#f5faff;border:1px solid #d8eef8;border-radius:6px;margin-bottom:4px;display:flex;flex-direction:column;gap:2px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#336699;">${e.detail||""}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">${e.time ? new Date(e.time).toLocaleString() : ""}</span>
        </div>
        ${e.op ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;">Op: ${e.op}</div>` : ""}
        ${e.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#888;font-style:italic;white-space:pre-wrap;">${e.notes}</div>` : ""}
      </div>`;
    });
    html += `</div>`;
  });

  if (!mechEntries.length && !cleanEntries.length) {
    html += `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#bbb;text-align:center;padding:20px;">No entries for this machine.</div>`;
  }

  // Show in a modal
  let modal = document.getElementById("maint-detail-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "maint-detail-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `<div class="modal-box" style="max-width:560px;max-height:80vh;overflow-y:auto;">
      <div id="maint-detail-body"></div>
      <div style="margin-top:16px;text-align:right;">
        <button class="btn-cancel" onclick="closeModal('maint-detail-modal')">Close</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("maint-detail-body").innerHTML = html;
  openModal("maint-detail-modal");
}

function addMaintEntry(entry) {
  // If the caller already set entry.machine (e.g. the clean modal has its own machine picker),
  // respect it. Otherwise fall back to the active top-bar machine button.
  const machine = entry.machine || document.querySelector(".machine-btn.active")?.dataset.machine || "Unassigned";
  entry.machine = machine;
  maintLog.unshift(entry);
  if (!machineEvents[machine]) machineEvents[machine] = [];
  machineEvents[machine].unshift({ category: "maintenance", type: entry.type, detail: entry.detail, notes: entry.notes, color: entry.color, time: entry.time });
  // Save to Firebase
  const fbEntry = { ...entry, time: entry.time instanceof Date ? entry.time.toISOString() : entry.time };
  if (window._fb) {
    window._fb.saveMaintEntry(fbEntry);
    window._fb.saveMachineEvent(machine, { category:"maintenance", type:entry.type, detail:entry.detail||"", notes:entry.notes||"", color:entry.color, time:fbEntry.time });
  }
  renderMaintLog();
  renderDefectSummary();
}

function maintSwitchTab(tab) {
  ['actions','log','reports'].forEach(t => {
    const panel = document.getElementById("maint-panel-" + t);
    const btn   = document.getElementById("maint-tab-" + t);
    if (!panel || !btn) return;
    const active = t === tab;
    panel.style.display    = active ? "" : "none";
    btn.style.color        = active ? "#e87820" : "#c0a080";
    btn.style.borderBottomColor = active ? "#e87820" : "transparent";
  });
  if (tab === 'log')     renderMaintLog();
  if (tab === 'reports') renderMaintReports();
}

function renderMaintLog() {
  const list = document.getElementById("maint-log-list");
  if (!list) return;
  const filterMap = {
    all: null,
    cleaning:   "Cleaning",
    mechanical: ["Operator Fix","Machine Down","Machine Back Up"],
    defective:  "Defective Material"
  };
  const f = filterMap[_maintLogFilter] || null;
  const filtered = f
    ? maintLog.filter(e => Array.isArray(f) ? f.includes(e.type) : e.type === f)
    : maintLog;
  if (!filtered.length) { list.innerHTML = '<div class="empty-log">No entries yet.</div>'; return; }
  list.innerHTML = "";
  filtered.forEach(e => {
    const div = document.createElement("div"); div.className = "log-entry";
    div.innerHTML = `
      <div class="log-dot" style="background:${e.color}"></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span class="log-type" style="color:${e.color}">${e.type}</span>
          <span class="log-time">${fmtDate(e.time)}</span>
        </div>
        ${e.detail ? `<div class="log-duration" style="color:${e.color}">${e.detail}</div>` : ""}
        ${e.notes  ? `<div class="log-note">${e.notes}</div>` : ""}
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#333;margin-top:3px;">Op: ${e.op}</div>
      </div>
    `;
    list.appendChild(div);
  });
}
