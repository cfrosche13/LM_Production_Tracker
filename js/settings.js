// ═══════════════════════════════════════
// SETTINGS — TARGETS
// ═══════════════════════════════════════
// Targets are stored in window._targets:
//   __mt: { "30": { "Coir · 28x16 FC": 50, ... }, "30+": {...}, "H5": {...} }
//   "Drinkware · Pint Glass": { pph: N }   ← flat global for Drinkware / Wallets
window._targets       = {};
window._targetsLoaded = false;

// ── Machine speed targets from CSV (defaults / seed values) ──
const _MT_DEFAULTS = {
  "30": {
    "Coir · 28x16 FC": 50,  "Coir · 28x16 OC": 55,
    "Coir · 30x18 FC": 34,  "Coir · 30x18 OC": 33,
    "Coir · 36x24 FC": 27,  "Coir · 36x24 OC": 32,
    "Coir · 60x24 FC": 22,  "Coir · 60x24 OC": 26,
    "Non-Coir Mats · AF Large": 41,    "Non-Coir Mats · AF Small": 89,
    "Non-Coir Mats · Drying Mat": 106, "Non-Coir Mats · PVC": 92,
  },
  "30+": {
    "Coir · 28x16 FC": 65,  "Coir · 28x16 OC": 70,
    "Coir · 30x18 FC": 43,  "Coir · 30x18 OC": 46,
    "Coir · 36x24 FC": 37,  "Coir · 36x24 OC": 37,
    "Coir · 60x24 FC": 30,  "Coir · 60x24 OC": 35,
    "Coir · Flocked": 113,
    "Non-Coir Mats · AF Large": 41,    "Non-Coir Mats · AF Small": 89,
    "Non-Coir Mats · Drying Mat": 106, "Non-Coir Mats · PVC": 92,
    "Signs · Double Sided Leaner": 35, "Signs · Leaner": 77,
  },
  "H5": {
    "Coir · Flocked": 127,
    "Roll Media · Large Canvas": 40,   "Roll Media · Small Canvas": 64,
    "Signs · Double Sided Leaner": 35, "Signs · Leaner": 72,
    "Signs · Yard Sign": 120,
  }
};

const _MT_ROLES = {
  "30":  {
    "Coir · 28x16 FC": "Home",  "Coir · 28x16 OC": "Home",
    "Coir · 30x18 FC": "Home",  "Coir · 30x18 OC": "Home",
    "Coir · 36x24 FC": "Home",  "Coir · 36x24 OC": "Home",
    "Coir · 60x24 FC": "Home",  "Coir · 60x24 OC": "Home",
    "Non-Coir Mats · AF Large": "Flex","Non-Coir Mats · AF Small": "Flex",
    "Non-Coir Mats · Drying Mat": "Flex","Non-Coir Mats · PVC": "Flex",
  },
  "30+": {
    "Coir · 28x16 FC": "Flex", "Coir · 28x16 OC": "Flex",
    "Coir · 30x18 FC": "Flex", "Coir · 30x18 OC": "Flex",
    "Coir · 36x24 FC": "Flex", "Coir · 36x24 OC": "Flex",
    "Coir · 60x24 FC": "Flex", "Coir · 60x24 OC": "Flex",
    "Coir · Flocked": "Home",
    "Non-Coir Mats · AF Large": "Flex","Non-Coir Mats · AF Small": "Flex",
    "Non-Coir Mats · Drying Mat": "Flex","Non-Coir Mats · PVC": "Flex",
    "Signs · Double Sided Leaner": "Flex","Signs · Leaner": "Flex",
  },
  "H5": {
    "Coir · Flocked": "Flex",
    "Roll Media · Large Canvas": "Home","Roll Media · Small Canvas": "Home",
    "Signs · Double Sided Leaner": "Home","Signs · Leaner": "Home",
    "Signs · Yard Sign": "Home",
  }
};

let _settingsAutoSaveTimer = null;
function _settingsScheduleSave() {
  clearTimeout(_settingsAutoSaveTimer);
  _settingsAutoSaveTimer = setTimeout(() => {
    if (window._fb && window._targetsLoaded) settingsSave();
  }, 800);
}

let _settingsMachineTab = "30";

function renderSettingsTargets() {
  const container = document.getElementById("settings-targets-table");
  if (!container) return;
  container.innerHTML = "";

  if (!window._targetsLoaded) {
    container.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#90a8b8;text-align:center;padding:32px 0;">⏳ Loading saved targets…</div>`;
    return;
  }

  renderOperatorList();
  _renderMachineTargets(container);
  _renderDrinkwareTargets(container);
  renderSettingsOEE();
  renderColexMerchSettings();
}


// ── Machine speed targets ──
function _renderMachineTargets(container) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "margin-bottom:28px;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#2e8b57;text-transform:uppercase;letter-spacing:0.12em;padding-bottom:6px;border-bottom:2px solid #d0e4ee;margin-bottom:14px;";
  hdr.textContent = "Machine Speed Targets (pcs / hr)";
  wrap.appendChild(hdr);

  // Tab bar
  const tabBar = document.createElement("div");
  tabBar.style.cssText = "display:flex;gap:0;border-bottom:2px solid #d0e4ee;margin-bottom:16px;";
  Object.keys(_MT_DEFAULTS).forEach(m => {
    const active = m === _settingsMachineTab;
    const tab = document.createElement("button");
    tab.textContent = m;
    tab.style.cssText = `font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:8px 22px;border:none;cursor:pointer;letter-spacing:0.05em;background:${active ? '#fff' : '#f0f7fb'};color:${active ? '#2e8b57' : '#7aaa88'};border-bottom:${active ? '3px solid #2e8b57' : 'none'};margin-bottom:${active ? '-2px' : '0'};`;
    tab.onclick = () => { _settingsMachineTab = m; renderSettingsTargets(); };
    tabBar.appendChild(tab);
  });
  wrap.appendChild(tabBar);

  // Column headers
  const colHead = document.createElement("div");
  colHead.style.cssText = "display:grid;grid-template-columns:1fr 120px 60px;gap:8px;padding:0 8px 6px;";
  colHead.innerHTML = `
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;">Piece Type</span>
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#4488aa;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Target / Hour</span>
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Role</span>
  `;
  wrap.appendChild(colHead);

  const defaults = _MT_DEFAULTS[_settingsMachineTab] || {};
  const saved    = window._targets?.__mt?.[_settingsMachineTab] || {};
  const roles    = _MT_ROLES[_settingsMachineTab] || {};

  // Group by category
  const groups = {};
  Object.keys(defaults).forEach(pieceKey => {
    const cat = pieceKey.split(' · ')[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(pieceKey);
  });

  let rowIdx = 0;
  Object.entries(groups).forEach(([cat, pieces]) => {
    const catHdr = document.createElement("div");
    catHdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;color:#4488aa;text-transform:uppercase;letter-spacing:0.12em;padding:10px 0 4px;border-bottom:1px solid #d0e4ee;margin-bottom:6px;";
    catHdr.textContent = cat;
    wrap.appendChild(catHdr);

    pieces.forEach(pieceKey => {
      const sub  = pieceKey.split(' · ')[1];
      const pph  = saved[pieceKey] !== undefined ? saved[pieceKey] : defaults[pieceKey];
      const role = roles[pieceKey] || "";

      const row = document.createElement("div");
      row.style.cssText = `display:grid;grid-template-columns:1fr 120px 60px;gap:8px;align-items:center;padding:7px 8px;border-radius:8px;background:${rowIdx%2===0?'#f0f7fb':'#fff'};margin-bottom:3px;`;
      rowIdx++;

      const lbl = document.createElement("span");
      lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:12px;color:#224466;";
      lbl.textContent = sub;

      const cell = document.createElement("div");
      cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;";
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "0"; inp.placeholder = "—";
      if (pph !== undefined) inp.value = pph;
      inp.style.cssText = "font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#336688;background:#e8f4fb;border:1px solid #b8d8ee;border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;";
      inp.dataset.machine = _settingsMachineTab;
      inp.dataset.piece   = pieceKey;
      inp.addEventListener("input", () => settingsBufferMachineTarget(inp));
      const sublbl = document.createElement("span");
      sublbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;";
      sublbl.textContent = "pcs / hr";
      cell.appendChild(inp);
      cell.appendChild(sublbl);

      const badge = document.createElement("span");
      badge.textContent = role;
      badge.style.cssText = `font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;text-align:center;padding:2px 7px;border-radius:10px;${role==='Home'?'background:#d0f0d8;color:#1a6b30;':'background:#e8f0ff;color:#336699;'}`;

      row.appendChild(lbl);
      row.appendChild(cell);
      row.appendChild(badge);
      wrap.appendChild(row);
    });
  });

  container.appendChild(wrap);
}

function settingsBufferMachineTarget(inp) {
  const machine = inp.dataset.machine;
  const piece   = inp.dataset.piece;
  if (!window._targets) window._targets = {};
  if (!window._targets.__mt) window._targets.__mt = {};
  if (!window._targets.__mt[machine]) window._targets.__mt[machine] = {};
  if (inp.value === "") {
    delete window._targets.__mt[machine][piece];
  } else {
    window._targets.__mt[machine][piece] = parseInt(inp.value) || 0;
  }
  _settingsScheduleSave();
}

// ── Drinkware flat targets ──
function _renderDrinkwareTargets(container) {
  const subs = PIECE_TYPES["Drinkware"] || [];
  if (!subs.length) return;

  const wrap = document.createElement("div");
  wrap.style.cssText = "margin-bottom:28px;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#2e8b57;text-transform:uppercase;letter-spacing:0.12em;padding-bottom:6px;border-bottom:2px solid #d0e4ee;margin-bottom:12px;";
  hdr.textContent = "Drinkware Targets";
  wrap.appendChild(hdr);

  const colHead = document.createElement("div");
  colHead.style.cssText = "display:grid;grid-template-columns:1fr 130px 130px;gap:8px;padding:0 8px 6px;";
  colHead.innerHTML = `
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;">Piece Type</span>
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#4488aa;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Target / Hour</span>
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#7755cc;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Target / Table</span>
  `;
  wrap.appendChild(colHead);

  subs.forEach((sub, idx) => {
    const key      = "Drinkware · " + sub;
    const existing = window._targets[key] || {};
    const row      = document.createElement("div");
    row.style.cssText = `display:grid;grid-template-columns:1fr 130px 130px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:${idx%2===0?'#f0f7fb':'#fff'};margin-bottom:4px;`;

    const label = document.createElement("span");
    label.style.cssText = "font-family:'Josefin Slab',serif;font-size:12px;color:#224466;";
    label.textContent = sub;
    row.appendChild(label);

    function makeFlatCell(field, val, color, bg, border) {
      const cell = document.createElement("div");
      cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;";
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "0"; inp.placeholder = "—";
      inp.style.cssText = `font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:${color};background:${bg};border:1px solid ${border};border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;`;
      inp.dataset.key   = key;
      inp.dataset.field = field;
      if (val !== undefined && val !== null && val !== "") inp.value = val;
      inp.addEventListener("input", () => settingsBufferTarget(inp));
      const lbl = document.createElement("span");
      lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;";
      lbl.textContent = field === "pph" ? "pcs / hr" : "pcs / table";
      cell.appendChild(inp); cell.appendChild(lbl);
      return cell;
    }

    row.appendChild(makeFlatCell("pph", existing.pph ?? "", "#336688", "#e8f4fb", "#b8d8ee"));
    row.appendChild(makeFlatCell("ppt", existing.ppt ?? "", "#7755cc", "#f5f0ff", "#d0c0ee"));
    wrap.appendChild(row);
  });

  container.appendChild(wrap);
}

function renderSettingsOEE() {
  const container = document.getElementById("settings-oee-cycles");
  if (!container) return;
  container.innerHTML = "";
  MACHINES.forEach((machine, idx) => {
    const val = getIdealCycle(machine);
    const row = document.createElement("div");
    row.style.cssText = `display:grid;grid-template-columns:1fr 160px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:${idx%2===0?'#f0f7fb':'#fff'};margin-bottom:4px;`;
    row.innerHTML = `
      <span style="font-family:'Josefin Slab',serif;font-size:13px;color:#224466;font-weight:700;">${machine}</span>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <input type="number" min="0" step="0.5" placeholder="—" value="${val || ''}"
          data-machine="${machine}"
          style="font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#336688;background:#e8f4fb;border:1px solid #b8d8ee;border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;"
          oninput="settingsBufferOEE(this)" />
        <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;">sec / unit</span>
      </div>`;
    container.appendChild(row);
  });
}


function settingsBufferOEE(input) {
  const machine = input.dataset.machine;
  if (!window._targets) window._targets = {};
  if (input.value === "") {
    delete window._targets["__oee_cycle_" + machine];
  } else {
    window._targets["__oee_cycle_" + machine] = parseFloat(input.value) || 0;
  }
  _settingsScheduleSave();
}


function settingsBufferTarget(input) {
  const key   = input.dataset.key;
  const field = input.dataset.field;
  if (!window._targets[key]) window._targets[key] = {};
  if (input.value === "" || input.value === null) {
    // User cleared the field — remove the entry so it doesn't save as 0
    delete window._targets[key][field];
    if (!Object.keys(window._targets[key]).length) delete window._targets[key];
  } else {
    window._targets[key][field] = parseInt(input.value) || 0;
  }
  _settingsScheduleSave();
}


function settingsSave() {
  const confirmEl = document.getElementById("settings-save-confirm");
  const saveBtn   = document.getElementById("settings-save-btn");
  if (!window._fb) {
    if (confirmEl) {
      confirmEl.textContent  = "✗ Not connected — please log in again.";
      confirmEl.style.color  = "#cc3333";
      confirmEl.style.display = "block";
      setTimeout(() => { confirmEl.style.display = "none"; }, 3000);
    }
    return;
  }
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }
  window._fb.saveTargets(window._targets)
    .then(() => {
      if (confirmEl) {
        confirmEl.textContent  = "✓ Targets saved successfully";
        confirmEl.style.color  = "#228844";
        confirmEl.style.display = "block";
        setTimeout(() => { confirmEl.style.display = "none"; }, 2500);
      }
    })
    .catch(err => {
      console.error("settingsSave failed:", err);
      if (confirmEl) {
        confirmEl.textContent  = "✗ Save failed: " + (err.message || err);
        confirmEl.style.color  = "#cc3333";
        confirmEl.style.display = "block";
        setTimeout(() => { confirmEl.style.display = "none"; }, 5000);
      }
    })
    .finally(() => {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "✓ Save Targets"; }
    });
}

// machine param: if provided, look up machine-specific rate first, then fall back to global
function getTarget(pieceType, field, machine) {
  if (field === 'pph' && machine) {
    const mt = window._targets?.__mt?.[machine];
    if (mt && mt[pieceType] !== undefined) return mt[pieceType];
    // Fall back to defaults if not yet saved to Firebase
    if (_MT_DEFAULTS[machine] && _MT_DEFAULTS[machine][pieceType] !== undefined) {
      return _MT_DEFAULTS[machine][pieceType];
    }
  }
  return (window._targets && window._targets[pieceType] && window._targets[pieceType][field]) || 0;
}

// ═══════════════════════════════════════
// OPERATOR LIST
// ═══════════════════════════════════════
function renderOperatorList() {
  const list = document.getElementById('settings-operators-list');
  if (!list) return;
  list.innerHTML = '';
  const ops = (window._targets && window._targets['__operators']) || [];
  // Render as compact chips
  ops.forEach((name, idx) => {
    const chip = document.createElement('span');
    chip.style.cssText = "display:inline-flex;align-items:center;gap:5px;background:#e8f4fb;border:1px solid #b8d8ee;border-radius:20px;padding:3px 10px 3px 12px;font-family:'Josefin Slab',serif;font-size:12px;color:#224466;margin:0 4px 4px 0;";
    const lbl = document.createElement('span');
    lbl.textContent = name;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.style.cssText = "background:none;border:none;color:#99b8cc;cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:2px;";
    btn.onclick = () => operatorRemove(idx);
    chip.appendChild(lbl);
    chip.appendChild(btn);
    list.appendChild(chip);
  });
  if (!ops.length) {
    const empty = document.createElement('span');
    empty.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;color:#90a8b8;";
    empty.textContent = 'No operators yet.';
    list.appendChild(empty);
  }
}

function operatorAdd() {
  const input = document.getElementById('settings-op-input');
  const name  = (input ? input.value : '').trim();
  if (!name) return;
  if (!window._targets) window._targets = {};
  if (!window._targets['__operators']) window._targets['__operators'] = [];
  if (window._targets['__operators'].includes(name)) { if (input) input.value = ''; return; }
  window._targets['__operators'].push(name);
  if (input) input.value = '';
  renderOperatorList();
  _settingsScheduleSave();
}

function operatorRemove(idx) {
  if (!window._targets || !window._targets['__operators']) return;
  window._targets['__operators'].splice(idx, 1);
  renderOperatorList();
  _settingsScheduleSave();
}

// ═══════════════════════════════════════
// COLEX MERCHANDISER EXPECTED TIMES
// ═══════════════════════════════════════
function renderColexMerchSettings() {
  const container = document.getElementById("settings-colex-merch");
  if (!container) return;
  container.innerHTML = "";

  const colHead = document.createElement("div");
  colHead.style.cssText = "display:grid;grid-template-columns:1fr 160px;gap:8px;padding:0 8px 6px;";
  colHead.innerHTML = `
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;">Piece Type</span>
    <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#9a7e00;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Expected Time / Sheet</span>
  `;
  container.appendChild(colHead);

  COLEX_MERCHANDISERS.forEach((pt, idx) => {
    const key = "__colex_merch_time_" + pt.id;
    const existing = window._targets?.[key] || COLEX_MERCH_TIME_DEFAULTS[pt.id] || "";
    const row = document.createElement("div");
    row.style.cssText = `display:grid;grid-template-columns:1fr 160px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:${idx%2===0?'#fdfaec':'#fff'};margin-bottom:4px;`;
    row.innerHTML = `
      <div>
        <div style="font-family:'Josefin Slab',serif;font-size:12px;color:#7a6000;font-weight:700;">${pt.label}</div>
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b09820;">1 sheet = ${pt.yield} pc${pt.yield > 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <input type="number" min="0" placeholder="—" value="${existing}"
          data-key="${key}"
          style="font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#9a7e00;background:#fdf9e6;border:1px solid #e0cc70;border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;"
          oninput="settingsBufferColexMerch(this)" />
        <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#b09820;">seconds / sheet</span>
      </div>
    `;
    container.appendChild(row);
  });
}

function settingsBufferColexMerch(input) {
  const key = input.dataset.key;
  if (!window._targets) window._targets = {};
  if (input.value === "") {
    delete window._targets[key];
  } else {
    window._targets[key] = parseInt(input.value) || 0;
  }
  _settingsScheduleSave();
}

// ═══════════════════════════════════════
// TOP BAR COUNTERS
// ═══════════════════════════════════════
// (PRINTED_MACHINES, STAMPED_MACHINES declared in constants.js)

function updateTopCounters() {
  let combinedGood = 0, combinedBad = 0;
  let shift1Good = 0, shift2Good = 0;
  let walletsGood = 0, walletsBad = 0;
  let drinkwareGood = 0, drinkwareBad = 0;

  Object.entries(machineReports).forEach(([machine, sessions]) => {
    sessions.forEach(s => {
      if (!isInDateRange(s.time)) return;
      if (DRINKWARE_MACHINES.includes(machine)) {
        drinkwareGood += s.qtyGood || 0;
        drinkwareBad  += s.qtyBad  || 0;
      } else if (PRINTED_MACHINES.includes(machine)) {
        combinedGood += s.qtyGood || 0;
        combinedBad  += s.qtyBad  || 0;
        const shift = getShift(s.time);
        if (shift === 1) shift1Good += s.qtyGood || 0;
        if (shift === 2) shift2Good += s.qtyGood || 0;
      } else if (STAMPED_MACHINES.includes(machine)) {
        walletsGood += s.qtyGood || 0;
        walletsBad  += s.qtyBad  || 0;
      }
    });
  });

  // Add in-memory counts not yet written to Firebase so counters update instantly on each tap.
  // Covers both the original Tally Count and Tally 2.0.
  const _tm = (typeof _tallyMachine !== 'undefined') ? _tallyMachine : '';
  if (_tm && _tm !== '—' && (PRINTED_MACHINES.includes(_tm) || DRINKWARE_MACHINES.includes(_tm))) {
    const isDrinkware = DRINKWARE_MACHINES.includes(_tm);
    // Original tally pending
    const counts    = (typeof _tallyCounts      !== 'undefined') ? _tallyCounts      : {};
    const saved     = (typeof _tallySavedCounts !== 'undefined') ? _tallySavedCounts : {};
    const misprints = (typeof _tallyMisprints      !== 'undefined') ? _tallyMisprints      : {};
    const savedMp   = (typeof _tallySavedMisprints !== 'undefined') ? _tallySavedMisprints : {};
    let pendingGood = 0, pendingBad = 0;
    Object.keys(counts).forEach(k => { pendingGood += (counts[k] || 0) - (saved[k] || 0); });
    Object.keys(misprints).forEach(k => { pendingBad += (misprints[k] || 0) - (savedMp[k] || 0); });

    // Tally 2.0 pending — only when Tally 2.0 is the active screen
    if (typeof _tally2Active !== 'undefined' && _tally2Active) {
      const t2c  = (typeof _t2Counts      !== 'undefined') ? _t2Counts      : {};
      const t2s  = (typeof _t2SavedCounts !== 'undefined') ? _t2SavedCounts : {};
      const t2mp = (typeof _t2Misprints      !== 'undefined') ? _t2Misprints      : {};
      const t2ms = (typeof _t2SavedMisprints !== 'undefined') ? _t2SavedMisprints : {};
      Object.keys(t2c).forEach(k  => { pendingGood += Math.max(0, (t2c[k]  || 0) - (t2s[k]  || 0)); });
      Object.keys(t2mp).forEach(k => { pendingBad  += Math.max(0, (t2mp[k] || 0) - (t2ms[k] || 0)); });
    }

    if (pendingGood !== 0 || pendingBad !== 0) {
      if (isDrinkware) {
        drinkwareGood += pendingGood;
        drinkwareBad  += pendingBad;
      } else {
        combinedGood += pendingGood;
        combinedBad  += pendingBad;
        const shiftNow = getShift(new Date());
        if (shiftNow === 1) shift1Good += pendingGood;
        if (shiftNow === 2) shift2Good += pendingGood;
      }
    }
  }

  const ce  = document.getElementById("counter-combined");
  const cb  = document.getElementById("counter-combined-bad");
  const s1  = document.getElementById("counter-shift1");
  const s2  = document.getElementById("counter-shift2");
  const we  = document.getElementById("counter-wallets");
  const wb  = document.getElementById("counter-wallets-bad");
  const de  = document.getElementById("counter-drinkware");
  const db2 = document.getElementById("counter-drinkware-bad");
  if (ce) ce.textContent = (combinedGood + combinedBad).toLocaleString();
  if (cb) cb.textContent = combinedBad.toLocaleString() + " bad";
  if (s1) s1.textContent = shift1Good.toLocaleString();
  if (s2) s2.textContent = shift2Good.toLocaleString();
  if (we) we.textContent = (walletsGood + walletsBad).toLocaleString();
  if (wb) wb.textContent = walletsBad.toLocaleString() + " bad";
  if (de) de.textContent = (drinkwareGood + drinkwareBad).toLocaleString();
  if (db2) db2.textContent = drinkwareBad.toLocaleString() + " bad";
}
