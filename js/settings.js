// ═══════════════════════════════════════
// SETTINGS — EFFICIENCY TARGETS
// ═══════════════════════════════════════
window._targets = {}; // { "Coir · 28x16": { pph: 120, ppt: 30 }, ... }

function settingsKey(cat, sub) { return cat + ' · ' + sub; }

function renderSettingsTargets() {
  const container = document.getElementById("settings-targets-table");
  if (!container) return;
  container.innerHTML = "";
  renderSettingsOEE();

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
      const key = settingsKey(cat, sub);
      const existing = window._targets[key] || {};
      const row = document.createElement("div");
      row.style.cssText = `display:grid;grid-template-columns:1fr 130px 130px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:${idx%2===0?'#f0f7fb':'#fff'};margin-bottom:4px;`;
      row.innerHTML = `
        <span style="font-family:\'Josefin Slab\',serif;font-size:12px;color:#224466;">${sub}</span>
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <input type="number" min="0" placeholder="—" value="${existing.pph||''}"
            data-key="${key}" data-field="pph"
            style="font-family:\'Josefin Slab\',serif;font-size:16px;font-weight:700;color:#336688;background:#e8f4fb;border:1px solid #b8d8ee;border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;"
            oninput="settingsBufferTarget(this)" />
          <span style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#90a8b8;">pcs / hr</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <input type="number" min="0" placeholder="—" value="${existing.ppt||''}"
            data-key="${key}" data-field="ppt"
            style="font-family:\'Josefin Slab\',serif;font-size:16px;font-weight:700;color:#7755cc;background:#f5f0ff;border:1px solid #d0c0ee;border-radius:6px;padding:5px 10px;width:100%;text-align:center;outline:none;"
            oninput="settingsBufferTarget(this)" />
          <span style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#90a8b8;">pcs / table</span>
        </div>
      `;
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
  const val = parseFloat(input.value) || 0;
  if (!window._targets) window._targets = {};
  window._targets["__oee_cycle_" + machine] = val;
}


function settingsBufferTarget(input) {
  const key   = input.dataset.key;
  const field = input.dataset.field;
  const val   = parseInt(input.value) || 0;
  if (!window._targets[key]) window._targets[key] = {};
  window._targets[key][field] = val;
}


function settingsSave() {
  if (window._fb) {
    window._fb.saveTargets(window._targets);
  }
  const confirm = document.getElementById("settings-save-confirm");
  if (confirm) {
    confirm.style.display = "block";
    setTimeout(() => { confirm.style.display = "none"; }, 2500);
  }
}

function getTarget(pieceType, field) {
  return (window._targets && window._targets[pieceType] && window._targets[pieceType][field]) || 0;
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
