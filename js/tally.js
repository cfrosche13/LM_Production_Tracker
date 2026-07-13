// ═══════════════════════════════════════
// TALLY COUNT MODE
// ═══════════════════════════════════════

let _tallyMachine        = "";
let _tallyActiveOps      = [];   // operators confirmed at login (array, supports teams)
let _tallyLoginFn        = "";   // 'tally' or 'tally2' — where to go after login
let _tallyIsSwitching    = false; // true when login comes from Switch Operator (not fresh entry)
let _tally2Active        = false; // true while Tally 2.0 screen is the active screen
let _tallyCat            = "";        // "" = show all categories
let _tallyCounts         = {};        // key: "Cat · SubType" → count
let _tallyMisprints      = {};        // key: "Cat · SubType" → count
let _tallyStartTimes     = {};        // key: "Cat · SubType" → ISO string of first tap for the day
let _tallySavedCounts    = {};        // counts committed to Firebase (for delta calculation)
let _tallySavedMisprints = {};
let _tallySessionKeys    = [];        // Firebase keys written this session (for reset cleanup)
let _tallyMigrated       = {};        // tracks which piece types have had old cumulative records removed
let _tallyActive         = false;
let _tallyAutoSaveTimer  = null;

const _TALLY_PIECE_CATS = ["Coir OC", "Coir FC", "Non-Coir Mats", "Signs", "Display Pieces", "Roll Media", "Drinkware"];

// ── Auto-save ──
function _tallyScheduleSave() {
  clearTimeout(_tallyAutoSaveTimer);
  _tallyAutoSaveTimer = setTimeout(_tallyAutoSaveNow, 600);
}

function _tallyAutoSaveNow() {
  if (!window._fb) return;
  const d       = new Date();
  const dateStr = d.getFullYear() + "-"
                + String(d.getMonth() + 1).padStart(2, "0") + "-"
                + String(d.getDate()).padStart(2, "0");

  // Resolve current machine from global dropdown → tally picker → machine buttons
  const machine = document.getElementById("global-machine")?.value
               || _tallyMachine
               || document.querySelector(".machine-btn.active")?.dataset.machine
               || "";
  const op = document.getElementById("global-operator")?.value || "—";

  // Always save to localStorage so counts survive a page refresh while offline
  try {
    localStorage.setItem("pt_tally_draft_" + dateStr, JSON.stringify({
      machine:    machine || "—",
      counts:     { ..._tallyCounts },
      misprints:  { ..._tallyMisprints },
      startTimes: { ..._tallyStartTimes },
      savedAt:    d.toISOString(),
    }));
  } catch(e) {}

  // Save the raw snapshot (existing behaviour)
  window._fb.saveTallyState(dateStr, {
    machine:    machine || "—",
    counts:     { ..._tallyCounts },
    misprints:  { ..._tallyMisprints },
    startTimes: { ..._tallyStartTimes },
    savedAt:    d.toISOString(),
  });

  // Write delta session records — only the pieces added since the last save,
  // stamped with the current time. This prevents the hourly chart from
  // shifting as the day progresses (the old cumulative approach caused that).
  if (machine && machine !== "—") {
    Object.keys(_tallyCounts).forEach(pieceKey => {
      const count    = _tallyCounts[pieceKey]    || 0;
      const misprint = _tallyMisprints[pieceKey] || 0;
      if (count === 0 && misprint === 0) return;

      const delta         = count    - (_tallySavedCounts[pieceKey]    || 0);
      const misprintDelta = misprint - (_tallySavedMisprints[pieceKey] || 0);
      if (delta <= 0 && misprintDelta <= 0) return;

      // One-time: remove the old cumulative record for this piece type
      if (!_tallyMigrated[pieceKey]) {
        window._fb.deleteTallySession(machine, "tally_" + dateStr + "_" + pieceKey.replace(/[^a-zA-Z0-9]/g, "_"));
        _tallyMigrated[pieceKey] = true;
      }

      const fbKey = "tally_" + dateStr + "_" + pieceKey.replace(/[^a-zA-Z0-9]/g, "_") + "_" + d.getTime();
      window._fb.setTallySession(machine, fbKey, {
        mode:        "tally",
        qtyGood:     Math.max(0, delta),
        qtyBad:      Math.max(0, misprintDelta),
        pieceType:   pieceKey,
        op,
        time:        d.toISOString(),
        startTime:   d.toISOString(),
        totalSec:    60,
        changeovers: 0,
        notes:       "Tally count",
      });

      _tallySessionKeys.push(fbKey);
      _tallySavedCounts[pieceKey]    = count;
      _tallySavedMisprints[pieceKey] = misprint;
    });
  }

  // Flash the status indicator — show "Saved locally" when Firebase is offline
  const el = document.getElementById("tc-autosave-status");
  if (el) {
    const offline = window._fbOnline === false;
    el.textContent = offline ? "💾 Saved locally" : "✓ Saved";
    el.style.color = offline ? "#cc8800" : "#52a040";
    clearTimeout(el._fadeTimer);
    el._fadeTimer = setTimeout(() => {
      if (el) { el.textContent = ""; }
    }, 2000);
  }
}

// ── Entry point ──
function selectPrintFunction(fn) {
  const funcSelect    = document.getElementById("print-function-select");
  const modeSelect    = document.getElementById("print-mode-select");
  const tallyScreen   = document.getElementById("print-tally-screen");
  const tally2Screen  = document.getElementById("print-tally2-screen");
  [funcSelect, modeSelect, tallyScreen, tally2Screen].forEach(el => { if (el) el.style.display = "none"; });
  if (fn === "timestudy") {
    modeSelect.style.display = "flex";
    qsInitMachine();
  } else {
    _tallyShowLoginOverlay(fn);
  }
}

function _tallyShowLoginOverlay(fn) {
  _tallyLoginFn = fn;
  const overlay = document.getElementById('tally-login-overlay');
  if (!overlay) return;

  // Build operator checkboxes
  const opsContainer = document.getElementById('tally-login-ops');
  opsContainer.innerHTML = '';
  const ops = (window._targets && window._targets['__operators']) || [];
  if (!ops.length) {
    opsContainer.innerHTML = '<div style="font-family:\'Josefin Slab\',serif;font-size:11px;color:#90a8b8;padding:6px 0;">No operators set up yet — add them in Settings.</div>';
  } else {
    ops.forEach(name => {
      const row = document.createElement('label');
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer;border-bottom:1px solid #e8f0e8;";
      const cb = document.createElement('input');
      cb.type  = 'checkbox';
      cb.value = name;
      cb.style.cssText = "width:18px;height:18px;accent-color:#2e8b57;cursor:pointer;flex-shrink:0;";
      if (_tallyActiveOps.includes(name)) cb.checked = true;
      const lbl = document.createElement('span');
      lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:14px;color:#1a2e1c;";
      lbl.textContent = name;
      row.appendChild(cb);
      row.appendChild(lbl);
      opsContainer.appendChild(row);
    });
  }

  // Populate machine dropdown (no Wallets)
  const mSel = document.getElementById('tally-login-machine');
  mSel.innerHTML = '<option value="">— Select machine —</option>';
  (MACHINES || []).filter(m => m !== 'Wallets').forEach(m => {
    const o = document.createElement('option');
    o.value = o.textContent = m;
    mSel.appendChild(o);
  });
  if (_tallyMachine) mSel.value = _tallyMachine;

  document.getElementById('tally-login-error').textContent = '';
  overlay.style.display = 'flex';
}

function tallyLoginConfirm() {
  const checked = Array.from(document.querySelectorAll('#tally-login-ops input[type="checkbox"]:checked')).map(cb => cb.value);
  const machine = document.getElementById('tally-login-machine').value;
  if (!checked.length || !machine) {
    document.getElementById('tally-login-error').textContent = !checked.length
      ? 'Please select at least one operator.'
      : 'Please select a machine.';
    return;
  }
  _tallyActiveOps = checked;
  _tallyMachine   = machine;
  // Sync to global dropdowns so session records and counters work correctly
  const gop = document.getElementById('global-operator');
  if (gop) gop.value = checked.join(' & ');
  selectMachineByName(machine);
  document.getElementById('tally-login-overlay').style.display = 'none';
  _tallyUpdateLoginBadge();
  if (_tallyLoginFn === 'tally2') {
    document.getElementById('print-tally2-screen').style.display = 'flex';
    _tally2Active = true;
    if (typeof t2Init === 'function') t2Init(_tallyIsSwitching);
    _tallyIsSwitching = false;
  } else {
    _tallyActive = true;
    tallyRender();
    document.getElementById('print-tally-screen').style.display = 'flex';
  }
}

function tallyLoginSwitch() {
  _tallyIsSwitching = true;
  _tallyShowLoginOverlay(_tallyLoginFn || 'tally2');
}

// Called from the Operator Log Out button in the top bar
function tallyOperatorLogout() {
  _tallyActiveOps = [];
  _tallyUpdateLoginBadge();
  if (_tally2Active) {
    // Still on the tally screen — show login for the next operator
    // tallyLoginConfirm will call t2Init(true) which resets counts + writes empty snapshot
    _tallyIsSwitching = true;
    _tallyShowLoginOverlay('tally2');
  } else {
    // Not on the tally screen — reset counts directly
    if (typeof t2Init === 'function') t2Init(true);
  }
  if (typeof updateTopCounters === 'function') updateTopCounters();
}

function _tallyUpdateLoginBadge() {
  ['tc-active-user', 'tc2-active-user'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_tallyActiveOps.length && _tallyMachine) {
      el.textContent = _tallyActiveOps.join(' & ') + '  ·  ' + _tallyMachine;
      el.style.display = 'inline-block';
    } else {
      el.style.display = 'none';
    }
  });
}

function goToFunctionSelect() {
  document.getElementById("print-function-select").style.display  = "flex";
  document.getElementById("print-mode-select").style.display      = "none";
  document.getElementById("print-tally-screen").style.display     = "none";
  document.getElementById("print-tally2-screen").style.display    = "none";
  document.getElementById("print-run-screen").style.display       = "none";
  document.getElementById("print-jobs-screen").style.display      = "none";
  const overlay = document.getElementById('tally-login-overlay');
  if (overlay) overlay.style.display = 'none';
  _tallyActive  = false;
  _tally2Active = false;
}

// ── Render tally screen shell ──
function _tallyUpdateMachineBadge() {
  const badge = document.getElementById("tc-machine-badge");
  if (!badge) return;
  const machine = document.getElementById("global-machine")?.value || _tallyMachine || "";
  const MACHINE_COLORS = window.MACHINE_COLORS || {};
  if (!machine || machine === "—") {
    badge.textContent = "⚠️ No machine selected — tap the Machine dropdown above";
    badge.style.cssText = "margin-top:8px;font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;padding:5px 14px;border-radius:20px;display:inline-block;background:#fff3cd;color:#856404;border:2px solid #ffc107;";
  } else {
    const color = MACHINE_COLORS[machine] || "#52a040";
    badge.textContent = "Logging for: " + machine;
    badge.style.cssText = "margin-top:8px;font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;padding:5px 14px;border-radius:20px;display:inline-block;background:#fff;border:2px solid " + color + ";color:" + color + ";";
  }
}

function tallyRender() {
  const screen = document.getElementById("print-tally-screen");
  if (!screen) return;
  _tallyUpdateMachineBadge();
  // Sync machine buttons
  document.querySelectorAll(".tally-machine-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.machine === _tallyMachine)
  );
  // Sync cat tabs — "All" tab is active when _tallyCat is ""
  document.querySelectorAll(".tally-cat-tab").forEach(b => {
    b.classList.toggle("active",
      (b.dataset.cat === "All" && _tallyCat === "") ||
      (b.dataset.cat !== "All" && b.dataset.cat === _tallyCat)
    );
  });
  tallyRenderCards();
}

function tallyPickMachine(btn) {
  _tallyMachine = btn.dataset.machine;
  document.querySelectorAll(".tally-machine-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.machine === _tallyMachine)
  );
  document.querySelectorAll(".machine-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.machine === _tallyMachine)
  );
}

function tallyPickCat(btn) {
  const cat = btn.dataset.cat;
  if (cat === "All") {
    _tallyCat = "";
  } else {
    // Clicking the active tab again returns to All
    _tallyCat = (_tallyCat === cat) ? "" : cat;
  }
  document.querySelectorAll(".tally-cat-tab").forEach(b => {
    b.classList.toggle("active",
      (b.dataset.cat === "All" && _tallyCat === "") ||
      (b.dataset.cat !== "All" && b.dataset.cat === _tallyCat)
    );
  });
  tallyRenderCards();
}

// ── Main cards renderer ──
function tallyRenderCards() {
  const area = document.getElementById("tally-cards-area");
  if (!area) return;
  area.innerHTML = "";

  const showAll       = _tallyCat === "";
  const catsToShow    = showAll ? _TALLY_PIECE_CATS : (_tallyCat === "Misprints" ? [] : [_tallyCat]);
  const showMisprints = showAll || _tallyCat === "Misprints";

  catsToShow.forEach(cat => {
    if (showAll) {
      const hdr = document.createElement("div");
      hdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#c04070;text-transform:uppercase;letter-spacing:0.12em;padding:2px 0 8px;margin-top:8px;border-bottom:2px solid #f0c8d8;margin-bottom:10px;";
      hdr.textContent = cat;
      area.appendChild(hdr);
    }
    _tallyRenderCatSection(area, cat);
  });

  if (showMisprints) {
    if (showAll) {
      const hdr = document.createElement("div");
      hdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#882222;text-transform:uppercase;letter-spacing:0.12em;padding:2px 0 8px;margin-top:8px;border-bottom:2px solid #ffaaaa;margin-bottom:10px;";
      hdr.textContent = "Misprints";
      area.appendChild(hdr);
    }
    _tallyRenderMisprintsSection(area);
  }

  _tallyRenderFooter(area);
}

// ── Category section ──
function _tallyRenderCatSection(area, displayCat) {
  let subs, pieceKeyCat;
  if (displayCat === "Coir OC") {
    pieceKeyCat = "Coir";
    subs = (PIECE_TYPES["Coir"] || []).filter(s => s.includes("OC") || s === "Flocked");
  } else if (displayCat === "Coir FC") {
    pieceKeyCat = "Coir";
    subs = (PIECE_TYPES["Coir"] || []).filter(s => s.includes("FC"));
  } else {
    pieceKeyCat = displayCat;
    subs = PIECE_TYPES[displayCat] || [];
  }
  if (!subs.length) return;

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;margin-bottom:16px;";
  subs.forEach(sub => {
    grid.appendChild(_tallyMakePieceCard(pieceKeyCat + " · " + sub, sub));
  });
  area.appendChild(grid);
}

// ── Piece card ──
function _tallyMakePieceCard(key, sub) {
  const count    = _tallyCounts[key] || 0;
  const pph      = getTarget(key, "pph", _tallyMachine) || 0;
  const secEa    = pph > 0 ? 3600 / pph : 0;
  const totalSec = count * secEa;
  const esc      = CSS.escape(key);

  const card = document.createElement("div");
  card.style.cssText = "background:#fff;border:2px solid #f0c8d8;border-radius:10px;padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;";

  // Header row: label + ⋮ menu button
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;width:100%;position:relative;";

  const lbl = document.createElement("div");
  lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#882244;text-transform:uppercase;letter-spacing:0.05em;text-align:left;line-height:1.3;flex:1;";
  lbl.textContent = sub;

  const kebab = document.createElement("button");
  kebab.textContent = "⋮";
  kebab.title = "Options";
  kebab.style.cssText = "background:none;border:none;cursor:pointer;font-size:16px;color:#ccaabb;padding:0 2px;line-height:1;flex-shrink:0;";
  kebab.addEventListener("click", e => { e.stopPropagation(); _tallyShowKebabMenu(e.currentTarget, key, false); });

  headerRow.appendChild(lbl);
  headerRow.appendChild(kebab);

  // Non-editable count display
  const countEl = document.createElement("div");
  countEl.id = "tc-count-" + esc;
  countEl.textContent = count;
  countEl.style.cssText = "font-family:'Abril Fatface',serif;font-size:36px;color:#e8457a;background:#fff5f8;border:2px solid #f0c8d8;border-radius:8px;padding:8px 4px;width:100%;text-align:center;box-sizing:border-box;line-height:1.2;";

  // + / − buttons
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;";

  const minusBtn = document.createElement("button");
  minusBtn.textContent = "−";
  minusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#fff0f4;border:2px solid #f0c8d8;color:#c8457a;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  minusBtn.addEventListener("click", () => tallyUndo(key));

  const plusBtn = document.createElement("button");
  plusBtn.textContent = "+";
  plusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#e8457a;border:2px solid #c0305a;color:#fff;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  plusBtn.addEventListener("click", () => tallyInc(key));

  btnRow.appendChild(minusBtn);
  btnRow.appendChild(plusBtn);

  // Expected time display
  const timeWrap = document.createElement("div");
  timeWrap.id = "tc-time-" + esc;
  timeWrap.style.cssText = `text-align:center;width:100%;background:#f0f6fb;border-radius:6px;padding:5px 2px;${secEa ? "" : "opacity:0.35;"}`;

  const timeVal = document.createElement("div");
  timeVal.id = "tc-timeval-" + esc;
  timeVal.style.cssText = "font-family:'Abril Fatface',serif;font-size:14px;color:#336688;line-height:1.2;";
  timeVal.textContent = fmt(totalSec);

  const timeLbl = document.createElement("div");
  timeLbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:7px;color:#6688aa;text-transform:uppercase;letter-spacing:0.06em;";
  timeLbl.textContent = "exp. time";

  timeWrap.appendChild(timeVal);
  timeWrap.appendChild(timeLbl);

  card.appendChild(headerRow);
  card.appendChild(countEl);
  card.appendChild(btnRow);
  card.appendChild(timeWrap);
  return card;
}

// ── Misprints section — one card per piece subtype, keyed same as _tallyCounts ──
function _tallyRenderMisprintsSection(area) {
  _TALLY_PIECE_CATS.forEach(cat => {
    // Sub-header for each category within Misprints
    const subHdr = document.createElement("div");
    subHdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;color:#882222;text-transform:uppercase;letter-spacing:0.12em;padding:2px 0 6px;margin-top:6px;border-bottom:1px solid #ffaaaa;margin-bottom:8px;";
    subHdr.textContent = cat;
    area.appendChild(subHdr);

    let subs, pieceKeyCat;
    if (cat === "Coir OC") {
      pieceKeyCat = "Coir";
      subs = (PIECE_TYPES["Coir"] || []).filter(s => s.includes("OC") || s === "Flocked");
    } else if (cat === "Coir FC") {
      pieceKeyCat = "Coir";
      subs = (PIECE_TYPES["Coir"] || []).filter(s => s.includes("FC"));
    } else {
      pieceKeyCat = cat;
      subs = PIECE_TYPES[cat] || [];
    }
    if (!subs.length) return;

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;margin-bottom:12px;";
    subs.forEach(sub => {
      grid.appendChild(_tallyMakeMisprintPieceCard(pieceKeyCat + " · " + sub, sub));
    });
    area.appendChild(grid);
  });
}

// ── Misprint piece card ──
function _tallyMakeMisprintPieceCard(key, sub) {
  const count = _tallyMisprints[key] || 0;
  const esc   = CSS.escape("mp-" + key);

  const card = document.createElement("div");
  card.style.cssText = "background:#fff5f5;border:2px solid #ffaaaa;border-radius:10px;padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;";

  // Header row: label + ⋮ menu button
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;width:100%;position:relative;";

  const lbl = document.createElement("div");
  lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#882222;text-transform:uppercase;letter-spacing:0.05em;text-align:left;line-height:1.3;flex:1;";
  lbl.textContent = sub;

  const kebab = document.createElement("button");
  kebab.textContent = "⋮";
  kebab.title = "Options";
  kebab.style.cssText = "background:none;border:none;cursor:pointer;font-size:16px;color:#ccaaaa;padding:0 2px;line-height:1;flex-shrink:0;";
  kebab.addEventListener("click", e => { e.stopPropagation(); _tallyShowKebabMenu(e.currentTarget, key, true); });

  headerRow.appendChild(lbl);
  headerRow.appendChild(kebab);

  // Non-editable count display
  const countEl = document.createElement("div");
  countEl.id = "tc-mp-" + esc;
  countEl.textContent = count;
  countEl.style.cssText = "font-family:'Abril Fatface',serif;font-size:36px;color:#cc3333;background:#fff5f5;border:2px solid #ffaaaa;border-radius:8px;padding:8px 4px;width:100%;text-align:center;box-sizing:border-box;line-height:1.2;";

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;";

  const minusBtn = document.createElement("button");
  minusBtn.textContent = "−";
  minusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#fff0f0;border:2px solid #ffaaaa;color:#cc3333;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  minusBtn.addEventListener("click", () => {
    _tallyMisprints[key] = Math.max(0, (_tallyMisprints[key] || 0) - 1);
    const el = document.getElementById("tc-mp-" + esc);
    if (el) el.textContent = _tallyMisprints[key];
    _tallyScheduleSave();
  });

  const plusBtn = document.createElement("button");
  plusBtn.textContent = "+";
  plusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#cc3333;border:2px solid #992222;color:#fff;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  plusBtn.addEventListener("click", () => {
    _tallyMisprints[key] = (_tallyMisprints[key] || 0) + 1;
    const el = document.getElementById("tc-mp-" + esc);
    if (el) el.textContent = _tallyMisprints[key];
    _tallyScheduleSave();
  });

  btnRow.appendChild(minusBtn);
  btnRow.appendChild(plusBtn);
  card.appendChild(headerRow);
  card.appendChild(countEl);
  card.appendChild(btnRow);
  return card;
}

// ── Count manipulation ──
function tallyInc(key) {
  if (!_tallyCounts[key] && !_tallyStartTimes[key]) {
    _tallyStartTimes[key] = new Date().toISOString();
  }
  _tallyCounts[key] = (_tallyCounts[key] || 0) + 1;
  _tallyUpdateCard(key);
  _tallyScheduleSave();
  updateTopCounters();
  // Log this individual tick to Firebase for manager dashboard charting
  if (window._fb && _tallyMachine && _tallyMachine !== "—") {
    const d = new Date();
    const dateStr = d.getFullYear() + "-"
                  + String(d.getMonth()+1).padStart(2,"0") + "-"
                  + String(d.getDate()).padStart(2,"0");
    window._fb.pushTallyEvent(_tallyMachine, dateStr, {
      pieceType: key,
      delta:     1,
      total:     _tallyCounts[key],
      op:        document.getElementById("global-operator")?.value || "—",
      time:      d.toISOString(),
    });
  }
}
function tallyUndo(key) {
  if (!_tallyCounts[key]) return;
  _tallyCounts[key]--;
  if (_tallyCounts[key] === 0) delete _tallyStartTimes[key];
  _tallyUpdateCard(key);
  _tallyScheduleSave();
  updateTopCounters();
}
function tallySetCount(key, rawVal) {
  const newCount = Math.max(0, parseInt(rawVal) || 0);
  if (newCount > 0 && !_tallyStartTimes[key]) {
    _tallyStartTimes[key] = new Date().toISOString();
  }
  _tallyCounts[key] = newCount;
  _tallyUpdateTimeOnly(key);
  _tallyScheduleSave();
}
function _tallyUpdateCard(key) {
  const count = _tallyCounts[key] || 0;
  const esc   = CSS.escape(key);
  const el    = document.getElementById("tc-count-" + esc);
  if (el) el.textContent = count;
  _tallyUpdateTimeOnly(key);
}

// ── ⋮ Kebab dropdown menu ──
function _tallyShowKebabMenu(anchor, key, isMisprint) {
  document.getElementById("tally-kebab-menu")?.remove();

  const menu = document.createElement("div");
  menu.id = "tally-kebab-menu";
  menu.style.cssText = "position:absolute;right:0;top:100%;z-index:500;background:#fff;border:1px solid #e8e8e8;border-radius:9px;box-shadow:0 4px 20px rgba(0,0,0,0.13);min-width:210px;overflow:hidden;";

  function menuItem(label, color, onClick) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `display:block;width:100%;text-align:left;padding:11px 16px;background:none;border:none;border-bottom:1px solid #f4f4f4;cursor:pointer;font-family:'Libre Franklin',sans-serif;font-size:13px;color:${color};`;
    btn.addEventListener("mouseenter", () => btn.style.background = "#f9f9f9");
    btn.addEventListener("mouseleave", () => btn.style.background = "none");
    btn.addEventListener("click", () => { menu.remove(); onClick(); });
    return btn;
  }

  menu.appendChild(menuItem("Add / Subtract from Total", "#1a2a18", () => _tallyOpenAdjustModal(key, isMisprint)));
  const resetItem = menuItem("Reset Counter", "#cc3333", () => {
    if (isMisprint) {
      _tallyMisprints[key] = 0;
      const el = document.getElementById("tc-mp-" + CSS.escape("mp-" + key));
      if (el) el.textContent = 0;
      _tallyScheduleSave();
    } else {
      _tallyCounts[key] = 0;
      _tallyUpdateCard(key);
      _tallyScheduleSave();
    }
  });
  resetItem.style.borderBottom = "none";
  menu.appendChild(resetItem);

  anchor.style.position = "relative";
  anchor.appendChild(menu);

  // Dismiss on next outside click
  setTimeout(() => {
    document.addEventListener("click", () => document.getElementById("tally-kebab-menu")?.remove(), { once: true });
  }, 0);
}

// ── Add/Subtract modal ──
function _tallyEnsureAdjustModal() {
  if (document.getElementById("tally-adjust-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "tally-adjust-modal";
  overlay.style.cssText = "display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.35);align-items:center;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:380px;width:90%;position:relative;box-shadow:0 8px 40px rgba(0,0,0,0.18);">
      <button id="tally-adjust-close"
        style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#aaa;">×</button>
      <div style="font-family:'Libre Franklin',sans-serif;font-size:18px;font-weight:700;color:#1a2a18;margin-bottom:20px;">Add or Subtract From Total</div>
      <input id="tally-adjust-input" type="number" placeholder="e.g. 5  or  -2"
        style="width:100%;box-sizing:border-box;font-size:15px;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;outline:none;font-family:'Libre Franklin',sans-serif;color:#333;margin-bottom:8px;" />
      <div style="font-family:'Libre Franklin',sans-serif;font-size:12px;color:#aaa;margin-bottom:20px;">Add a positive or negative number to the existing total</div>
      <button id="tally-adjust-confirm"
        style="width:100%;padding:14px;background:#52a040;color:#fff;border:none;border-radius:8px;font-family:'Libre Franklin',sans-serif;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:0.02em;">Add to Total</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.style.display = "none"; });
  document.getElementById("tally-adjust-close").addEventListener("click", () => { overlay.style.display = "none"; });
}

function _tallyOpenAdjustModal(key, isMisprint) {
  _tallyEnsureAdjustModal();
  const overlay = document.getElementById("tally-adjust-modal");
  const input   = document.getElementById("tally-adjust-input");
  input.value   = "";
  overlay.style.display = "flex";
  setTimeout(() => input.focus(), 80);

  // Clone confirm to clear any prior listener
  const oldBtn = document.getElementById("tally-adjust-confirm");
  const confirm = oldBtn.cloneNode(true);
  oldBtn.replaceWith(confirm);

  function doCommit() {
    const typed = parseInt(input.value, 10);
    if (isNaN(typed) || input.value.trim() === "") return;
    if (isMisprint) {
      _tallyMisprints[key] = Math.max(0, (_tallyMisprints[key] || 0) + typed);
      const el = document.getElementById("tc-mp-" + CSS.escape("mp-" + key));
      if (el) el.textContent = _tallyMisprints[key];
    } else {
      const newCount = Math.max(0, (_tallyCounts[key] || 0) + typed);
      if (newCount > 0 && !_tallyStartTimes[key]) {
        _tallyStartTimes[key] = new Date().toISOString();
      }
      _tallyCounts[key] = newCount;
      _tallyUpdateCard(key);
      // Log the manual adjustment to Firebase for manager dashboard charting
      if (window._fb && _tallyMachine && _tallyMachine !== "—") {
        const d = new Date();
        const dateStr = d.getFullYear() + "-"
                      + String(d.getMonth()+1).padStart(2,"0") + "-"
                      + String(d.getDate()).padStart(2,"0");
        window._fb.pushTallyEvent(_tallyMachine, dateStr, {
          pieceType: key,
          delta:     typed,
          total:     _tallyCounts[key],
          op:        document.getElementById("global-operator")?.value || "—",
          time:      d.toISOString(),
        });
      }
    }
    _tallyScheduleSave();
    updateTopCounters();
    overlay.style.display = "none";
  }

  confirm.addEventListener("click", doCommit);
  input.onkeydown = e => {
    if (e.key === "Enter")  doCommit();
    if (e.key === "Escape") overlay.style.display = "none";
  };
}
function _tallyUpdateTimeOnly(key) {
  const count    = _tallyCounts[key] || 0;
  const pph      = getTarget(key, "pph", _tallyMachine) || 0;
  const totalSec = count * (pph > 0 ? 3600 / pph : 0);
  const el = document.getElementById("tc-timeval-" + CSS.escape(key));
  if (el) el.textContent = fmt(totalSec);
}

// ── Footer ──
function _tallyRenderFooter(area) {
  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;align-items:center;justify-content:space-between;width:100%;padding-bottom:24px;";
  footer.innerHTML = `
    <span id="tc-autosave-status" style="font-family:'Josefin Slab',serif;font-size:11px;color:#52a040;min-width:60px;"></span>
  `;
  area.appendChild(footer);
}

// When Firebase reconnects, flush any counts tallied while offline
document.addEventListener("fbReconnected", () => {
  if (Object.keys(_tallyCounts).length > 0) _tallyAutoSaveNow();
});

// ── Reset ──
function tallyReset() {
  // Delete tally-derived sessions from Firebase before clearing local counts
  const machine = document.getElementById("global-machine")?.value
               || _tallyMachine
               || document.querySelector(".machine-btn.active")?.dataset.machine
               || "";
  if (machine && machine !== "—" && window._fb) {
    const d       = new Date();
    const dateStr = d.getFullYear() + "-"
                  + String(d.getMonth() + 1).padStart(2, "0") + "-"
                  + String(d.getDate()).padStart(2, "0");
    // Delete all delta records written this session
    _tallySessionKeys.forEach(key => window._fb.deleteTallySession(machine, key));
    // Also try to delete any old-format cumulative records that may still exist
    Object.keys(_tallyCounts).forEach(pieceKey => {
      if ((_tallyCounts[pieceKey] || 0) > 0 || (_tallyMisprints[pieceKey] || 0) > 0) {
        window._fb.deleteTallySession(machine, "tally_" + dateStr + "_" + pieceKey.replace(/[^a-zA-Z0-9]/g, "_"));
      }
    });
  }

  _tallyCounts         = {};
  _tallyMisprints      = {};
  _tallyStartTimes     = {};
  _tallySavedCounts    = {};
  _tallySavedMisprints = {};
  _tallySessionKeys    = [];
  _tallyMigrated       = {};
  tallyRenderCards();
  _tallyAutoSaveNow();  // immediately clear the Firebase snapshot
}

