// ═══════════════════════════════════════
// SETTINGS — EFFICIENCY TARGETS
// ═══════════════════════════════════════
window._targets       = {}; // { "Coir · 28x16": { pph: 120, ppt: 30 }, ... }
window._targetsLoaded = false;

let _settingsAutoSaveTimer = null;
function _settingsScheduleSave() {
  clearTimeout(_settingsAutoSaveTimer);
  _settingsAutoSaveTimer = setTimeout(() => {
    if (window._fb && window._targetsLoaded) settingsSave();
  }, 800);
}

function settingsKey(cat, sub) { return cat + ' · ' + sub; }

function renderSettingsTargets() {
  const container = document.getElementById("settings-targets-table");
  if (!container) return;
  container.innerHTML = "";

  // Wait for Firebase to deliver saved targets before rendering
  if (!window._targetsLoaded) {
    container.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#90a8b8;text-align:center;padding:32px 0;">⏳ Loading saved targets…</div>`;
    return;
  }

  renderSettingsOEE();
  renderColexMerchSettings();

  Object.entries(PIECE_TYPES).forEach(([cat, subs]) => {
    // Category header
    const catHeader = document.createElement("div");
    catHeader.style.cssText = "font-family:\'Josefin Slab\',serif;font-size:10px;font-weight:700;color:#4488aa;text-transform:uppercase;letter-spacing:0.12em;padding:14px 0 6px;border-bottom:2px solid #d0e4ee;margin-bottom:8px;";
    catHeader.textContent = cat;
    container.appendChild(catHeader);

    // Column headers
    const colHead = document.createElement("div");
    colHead.style.cssText = "display:grid;grid-template-columns:1fr 130px 130px;gap:8px;padding:0 8px 6px;";
    colHead.innerHTML = `
      <span style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;">Piece Type</span>
      <span style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#4488aa;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Target / Hour</span>
      <span style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#7755cc;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Target / Table</span>
    `;
    container.appendChild(colHead);

    subs.forEach((sub, idx) => {
      const key      = settingsKey(cat, sub);
      const existing = window._targets[key] || {};
      const row      = document.createElement("div");
      row.style.cssText = `display:grid;grid-template-columns:1fr 130px 130px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:${idx%2===0?'#f0f7fb':'#fff'};margin-bottom:4px;`;

      // Label — use textContent to avoid any HTML injection
      const label = document.createElement("span");
      label.style.cssText = "font-family:'Josefin Slab',serif;font-size:12px;color:#224466;";
      label.textContent = sub;
      row.appendChild(label);

      // Helper to build an input cell — uses DOM so data-key is never HTML-encoded
      function makeInputCell(field, val, color, bg, border) {
        const cell = document.createElement("div");
        cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;";
        const inp = document.createElement("input");
        inp.type        = "number";
        inp.min         = "0";
        inp.placeholder = "—";
        inp.style.cssText = `font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:${color};background:${bg};border:1px solid ${border};border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;`;
        inp.dataset.key   = key;   // safe — no innerHTML, no escaping needed
        inp.dataset.field = field;
        if (val !== undefined && val !== null && val !== "") inp.value = val;
        inp.addEventListener("input", () => settingsBufferTarget(inp));
        const lbl = document.createElement("span");
        lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;";
        lbl.textContent = field === "pph" ? "pcs / hr" : "pcs / table";
        cell.appendChild(inp);
        cell.appendChild(lbl);
        return cell;
      }

      const pphVal = (existing.pph !== undefined && existing.pph !== null) ? existing.pph : "";
      const pptVal = (existing.ppt !== undefined && existing.ppt !== null) ? existing.ppt : "";
      row.appendChild(makeInputCell("pph", pphVal, "#336688", "#e8f4fb", "#b8d8ee"));
      row.appendChild(makeInputCell("ppt", pptVal, "#7755cc", "#f5f0ff", "#d0c0ee"));
      container.appendChild(row);
    });
  });
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

function getTarget(pieceType, field) {
  return (window._targets && window._targets[pieceType] && window._targets[pieceType][field]) || 0;
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
  let printedGood = 0, printedBad = 0, stampedGood = 0, stampedBad = 0;
  const today = todayStr ? todayStr() : null;

  Object.entries(machineReports).forEach(([machine, sessions]) => {
    sessions.forEach(s => {
      // Only count today
      if (!isInDateRange(s.time)) return;
      if (PRINTED_MACHINES.includes(machine)) {
        printedGood += s.qtyGood || 0;
        printedBad  += s.qtyBad  || 0;
      } else if (STAMPED_MACHINES.includes(machine)) {
        stampedGood += s.qtyGood || 0;
        stampedBad  += s.qtyBad  || 0;
      }
    });
  });

  const pe = document.getElementById("counter-printed");
  const pb = document.getElementById("counter-printed-bad");
  const se = document.getElementById("counter-stamped");
  const sb = document.getElementById("counter-stamped-bad");
  if (pe) pe.textContent = (printedGood + printedBad).toLocaleString();
  if (pb) pb.textContent = printedBad.toLocaleString() + " bad";
  if (se) se.textContent = (stampedGood + stampedBad).toLocaleString();
  if (sb) sb.textContent = stampedBad.toLocaleString() + " bad";
}
