// ═══════════════════════════════════════
// PRINT HEAD LOG MODULE
// ═══════════════════════════════════════

let _phMachine        = "30";
let _phYear           = new Date().getFullYear();
let _phLog            = {}; // { fbKey: { machine, position, date, op, notes, loggedAt } }
let _phAllotment      = {}; // { machine: { year: { allotted, ordered } } }
let _phDetailPosition = null; // position label currently shown in the head-detail modal

// ─── Panel open / close ──────────────────────────────
function openPrintheadsPanel() {
  document.getElementById("maint-panel-actions").style.display    = "none";
  document.getElementById("maint-panel-printheads").style.display = "";
  phSwitchMachine(_phMachine);

  if (window._fb) {
    Promise.all([window._fb.fetchPrintheadLog(), window._fb.fetchPrintheadAllotment()])
      .then(([logData, allotData]) => {
        _phLog       = logData   || {};
        _phAllotment = allotData || {};
        renderPrintheads();
      })
      .catch(() => {});
  }
}

function closePrintheadsPanel() {
  document.getElementById("maint-panel-printheads").style.display = "none";
  document.getElementById("maint-panel-actions").style.display    = "";
}

// ─── Machine tab switch ──────────────────────────────
// Matches the id scheme in index.html: "+" -> "p", spaces stripped.
function _phTabId(machine) {
  return "ph-tab-" + machine.replace(/\+/g, "p").replace(/\s+/g, "");
}

function _phHighlightMachineTab(machine) {
  PRINTED_MACHINES.forEach(m => {
    const btn = document.getElementById(_phTabId(m));
    if (!btn) return;
    const active = m === machine;
    btn.style.background  = active ? "#52a040" : "#f0f5ee";
    btn.style.color       = active ? "#fff"    : "#3a5a38";
    btn.style.borderColor = active ? "#3a8c32" : "#c0d8b8";
    btn.style.fontWeight  = active ? "700"     : "500";
  });
}

function phSwitchMachine(machine) {
  _phMachine = machine;
  _phHighlightMachineTab(machine);
  renderPrintheads();
}

function phYearShift(delta) {
  _phYear += delta;
  renderPrintheads();
}

// ─── Render ──────────────────────────────────────────
function renderPrintheads() {
  const el = document.getElementById("ph-content");
  if (!el) return;
  const machine = _phMachine;
  el.innerHTML = _phRenderAllotmentCard(machine) + _phRenderCarriageSection(machine);
}

function _phRenderAllotmentCard(machine) {
  const year      = _phYear;
  const rec       = (_phAllotment[machine] || {})[year] || { allotted: 0, ordered: 0 };
  const remaining = (rec.allotted || 0) - (rec.ordered || 0);

  return `
    <div style="background:#f8fdf8;border:1.5px solid #c8e8c8;border-radius:10px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3a8c32;">📋 Yearly Allotment — ${esc(machine)}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button onclick="phYearShift(-1)" style="width:26px;height:26px;border-radius:6px;border:1px solid #c0d8b8;background:#fff;color:#3a5a38;cursor:pointer;font-family:'Josefin Slab',serif;font-weight:700;">‹</button>
          <span style="font-family:'Abril Fatface',serif;font-size:16px;color:#1a2e1c;min-width:48px;text-align:center;display:inline-block;">${year}</span>
          <button onclick="phYearShift(1)" style="width:26px;height:26px;border-radius:6px;border:1px solid #c0d8b8;background:#fff;color:#3a5a38;cursor:pointer;font-family:'Josefin Slab',serif;font-weight:700;">›</button>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:100px;">
          <label style="font-family:'Josefin Slab',serif;font-size:10px;color:#5a7a5a;display:block;margin-bottom:3px;">Heads Allotted</label>
          <input type="number" min="0" id="ph-allotted-input" value="${rec.allotted || 0}"
            style="width:100%;box-sizing:border-box;font-family:'Abril Fatface',serif;font-size:18px;color:#1a2e1c;border:1.5px solid #b8d8b8;border-radius:6px;padding:6px 10px;">
        </div>
        <div style="flex:1;min-width:100px;">
          <label style="font-family:'Josefin Slab',serif;font-size:10px;color:#5a7a5a;display:block;margin-bottom:3px;">Heads Ordered</label>
          <input type="number" min="0" id="ph-ordered-input" value="${rec.ordered || 0}"
            style="width:100%;box-sizing:border-box;font-family:'Abril Fatface',serif;font-size:18px;color:#1a2e1c;border:1.5px solid #b8d8b8;border-radius:6px;padding:6px 10px;">
        </div>
        <button class="inv-btn inv-btn-receive" onclick="phSaveAllotment()">✓ Save</button>
      </div>
      <div style="margin-top:10px;font-family:'Josefin Slab',serif;font-size:12px;color:${remaining < 0 ? '#cc2222' : '#5a7a5a'};">
        ${remaining < 0 ? `⚠️ ${Math.abs(remaining)} over allotment` : `${remaining} remaining this year`}
      </div>
    </div>
  `;
}

function phSaveAllotment() {
  const machine  = _phMachine;
  const year     = _phYear;
  const allotted = parseInt(document.getElementById("ph-allotted-input").value) || 0;
  const ordered  = parseInt(document.getElementById("ph-ordered-input").value) || 0;
  const data = { allotted, ordered };

  if (!_phAllotment[machine]) _phAllotment[machine] = {};
  _phAllotment[machine][year] = data;
  if (window._fb) window._fb.savePrintheadAllotment(machine, year, data);

  renderPrintheads();
}

// ─── Visual carriage ──────────────────────────────────
function _phCountForPosition(machine, positionLabel) {
  return Object.values(_phLog).filter(e => e.machine === machine && e.position === positionLabel).length;
}

function _phHeadHtml(pos, idx, width, height) {
  if (!pos) return "";
  height = height || 88;
  const colors = (pos.colors || []).map(c => PH_COLOR_SWATCH[c] || "#999");
  const count  = _phCountForPosition(_phMachine, pos.label);
  const bands  = colors.length >= 2
    ? `<div style="display:flex;flex-direction:row;flex:1;">
         <div style="flex:1;background:${colors[0]};"></div>
         <div style="flex:1;background:${colors[1]};"></div>
       </div>`
    : `<div style="flex:1;background:${colors[0] || '#999'};"></div>`;
  const codeLabel = pos.code
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
         <span style="background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.15);border-radius:4px;padding:2px 7px;font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:#1a1a1a;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${esc(pos.code)}</span>
       </div>`
    : "";

  return `
    <div onclick="phOpenHeadDetail(${idx})" title="${esc(pos.label)}"
      style="position:relative;width:${width}px;height:${height}px;border-radius:4px;overflow:hidden;cursor:pointer;
             border:1.5px solid rgba(255,255,255,0.3);display:flex;flex-direction:column;
             box-shadow:0 2px 4px rgba(0,0,0,0.35);flex-shrink:0;">
      ${bands}
      ${codeLabel}
      ${count > 0 ? `<div style="position:absolute;top:2px;right:2px;background:#1a1a1a;color:#8fe08f;font-family:'Josefin Slab',serif;font-size:8px;font-weight:700;border-radius:8px;padding:1px 4px;line-height:1.2;">${count}</div>` : ""}
    </div>
  `;
}

// H5 carriage: each cartridge mounts its 5 heads in a staggered two-row
// (brick) pattern, not one straight stack — odd heads (5, 3, 1) form a
// 3-row column, even heads (4, 2) form a shorter column nested vertically
// between them and shifted right, producing the interleaved zig-zag seen in
// the machine's own Print Heads diagnostics screen. Cartridges also step
// down left-to-right in a cascade, echoing that screen's photo.
function _phHeadSegmentHtml(pos, idx, headNum, left, top, width, height, z) {
  if (!pos) return "";
  const codes  = pos.colors || [];
  const colorA = PH_COLOR_SWATCH[codes[0]] || "#999";
  const colorB = PH_COLOR_SWATCH[codes[1]] || "#999";
  const count  = _phCountForPosition(_phMachine, pos.label);

  return `
    <div onclick="phOpenHeadDetail(${idx})" title="${esc(pos.label)}"
      style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;cursor:pointer;
             border-radius:6px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.35);
             box-shadow:0 2px 6px rgba(0,0,0,0.4);z-index:${z};display:flex;">
      <div style="flex:1;background:${colorA};display:flex;align-items:center;justify-content:center;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#2a2a2a;">${esc(codes[0] || "")}</div>
      <div style="flex:1;background:${colorB};display:flex;align-items:center;justify-content:center;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#2a2a2a;">${esc(codes[1] || "")}</div>
      <div style="position:absolute;top:2px;left:3px;background:#0d0f10;color:#fff;font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;border-radius:4px;padding:1px 4px;line-height:1.3;box-shadow:0 1px 2px rgba(0,0,0,0.4);">H${headNum}</div>
      ${count > 0 ? `<div style="position:absolute;top:2px;right:3px;background:#0d0f10;color:#8fe08f;font-family:'Josefin Slab',serif;font-size:8px;font-weight:700;border-radius:8px;padding:1px 4px;line-height:1.3;">${count}</div>` : ""}
    </div>
  `;
}

function _phRenderCartridgeStick(positions, cartIdx, segW, segH) {
  const oddHeads  = [5, 3, 1]; // straight 3-row column, on the right
  const evenHeads = [4, 2];    // 2-row column, nested between the odd rows, on the left
  const colGap  = 14;
  const shiftX  = segW + colGap; // fully clear of the other column, no overlap
  const stackH  = segH * 3;
  const stickW  = shiftX + segW;

  let html = `<div style="position:relative;width:${stickW}px;height:${stackH}px;">`;
  oddHeads.forEach((head, i) => {
    const idx = cartIdx * 5 + (head - 1);
    html += _phHeadSegmentHtml(positions[idx], idx, head, shiftX, i * segH, segW, segH, 1);
  });
  evenHeads.forEach((head, j) => {
    const idx = cartIdx * 5 + (head - 1);
    const top = segH / 2 + j * segH;
    html += _phHeadSegmentHtml(positions[idx], idx, head, 0, top, segW, segH, 2);
  });
  html += `</div>`;
  return html;
}

function _phRenderCartridgeColumns(positions, segW, segH) {
  let html = "";
  for (let cart = 0; cart < 5; cart++) {
    const cascade = cart * 26; // steps each cartridge down as you move left to right
    html += `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:${cascade}px;">`;
    html += `<div style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:#ddd;letter-spacing:0.05em;">Cartridge ${cart + 1}</div>`;
    html += _phRenderCartridgeStick(positions, cart, segW, segH);
    html += `</div>`;
  }
  return html;
}

// 30/30+ carriage: 6 columns x 2 rows. Positions are stored in pairs [2n, 2n+1]
// per color (see PRINTHEAD_POSITIONS_30) — row "1" (lower, physically) is 2n,
// row "2" (higher) is 2n+1, so row 2 renders on top of row 1 in each column.
function _phRenderGridColumns(positions, width) {
  let html = "";
  for (let col = 0; col < positions.length / 2; col++) {
    const lowerIdx = col * 2;
    const upperIdx = col * 2 + 1;
    html += `<div style="display:flex;flex-direction:column;gap:4px;">`;
    html += _phHeadHtml(positions[upperIdx], upperIdx, width, 60);
    html += _phHeadHtml(positions[lowerIdx], lowerIdx, width, 60);
    html += `</div>`;
  }
  return html;
}

function _phRenderCarriageSection(machine) {
  const positions = PRINTHEAD_POSITIONS[machine] || [];
  if (!positions.length) return "";
  const isH5  = machine === "H5";
  const isGrid = machine === "30" || machine === "30+";
  const headW = isGrid ? 48 : positions.length > 16 ? 22 : positions.length > 8 ? 30 : 42;

  let inner = "";
  if (isGrid) {
    inner = _phRenderGridColumns(positions, headW);
  } else if (isH5) {
    inner = _phRenderCartridgeColumns(positions, 56, 48);
  } else {
    // Drinkware: one row of 4 columns, White first through Varnish last.
    // Each head is itself wider than tall (seated horizontally).
    inner += `<div style="display:flex;align-items:flex-end;gap:10px;">`;
    positions.forEach((pos, idx) => { inner += _phHeadHtml(pos, idx, 110, 56); });
    inner += `</div>`;
  }

  return `
    <div style="margin:18px 0 4px;">
      <div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3a8c32;margin-bottom:10px;">🖨️ Print Head Carriage — ${esc(machine)}</div>
      <div style="overflow-x:auto;padding-bottom:8px;">
        <div style="display:inline-flex;gap:${isGrid ? 12 : isH5 ? 42 : 10}px;align-items:${isH5 ? 'flex-start' : 'flex-end'};padding:${isH5 ? '26px 32px' : '16px 18px'};background:#26292c;border-radius:10px;border:3px solid #444;">
          ${inner}
        </div>
      </div>
      <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#aaa;margin-top:4px;">Tap a head to view or log its replacement history. The number badge shows how many times it's been replaced.</div>
    </div>
  `;
}

// ─── Head detail (history) modal ─────────────────────
function phOpenHeadDetail(idx) {
  const pos = (PRINTHEAD_POSITIONS[_phMachine] || [])[idx];
  if (!pos) return;
  _phDetailPosition = pos.label;
  _phRenderHeadDetail();
  openModal("printhead-detail-modal");
}

function _phRenderHeadDetail() {
  const body = document.getElementById("ph-detail-body");
  if (!body) return;
  const machine  = _phMachine;
  const position = _phDetailPosition;

  const entries = Object.values(_phLog)
    .filter(e => e.machine === machine && e.position === position)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
      <div style="font-family:'Abril Fatface',serif;font-size:18px;color:#1a2e1c;">${esc(position)}</div>
      <button class="inv-btn inv-btn-receive" onclick="openPrintheadLogModal('${esc(position)}')">+ Log Replacement</button>
    </div>
    <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#888;margin-bottom:14px;">${esc(machine)}</div>
  `;

  if (!entries.length) {
    html += `<div class="inv-empty">No replacements logged yet for this head.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    entries.forEach(e => {
      const dateStr = e.date
        ? new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
      html += `
        <div class="inv-product-row">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;color:#1a2e1c;">${dateStr}</span>
            ${e.op ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#88aa88;">${esc(e.op)}</span>` : ""}
          </div>
          ${e.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#888;font-style:italic;margin-top:3px;">${esc(e.notes)}</div>` : ""}
        </div>
      `;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
}

// ─── Log a replacement ────────────────────────────────
// prefillPosition: when opened from a head's detail modal, locks the dropdown
// to that head instead of letting the operator pick from the whole machine.
function openPrintheadLogModal(prefillPosition) {
  const machine   = _phMachine;
  const positions = PRINTHEAD_POSITIONS[machine] || [];
  const sel = document.getElementById("ph-log-position");
  sel.innerHTML = positions.map(p => `<option value="${esc(p.label)}">${esc(p.label)}</option>`).join("");
  sel.disabled = !!prefillPosition;
  if (prefillPosition) sel.value = prefillPosition;

  document.getElementById("ph-log-machine-display").textContent = machine;
  document.getElementById("ph-log-date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("ph-log-operator").value = document.getElementById("global-operator")?.value || "";
  document.getElementById("ph-log-notes").value = "";
  openModal("printhead-log-modal");
}

function submitPrintheadLog() {
  const machine  = _phMachine;
  const position = document.getElementById("ph-log-position").value;
  const date     = document.getElementById("ph-log-date").value;
  const op       = document.getElementById("ph-log-operator").value.trim() ||
                   document.getElementById("global-operator")?.value || "—";
  const notes    = document.getElementById("ph-log-notes").value.trim();

  if (!date) { alert("Please enter a date."); return; }

  const entry = { machine, position, date, op, notes, loggedAt: new Date().toISOString() };
  const tmpKey = "_new_" + entry.loggedAt;
  _phLog[tmpKey] = entry;
  if (window._fb) window._fb.savePrintheadLog(entry);

  closeModal("printhead-log-modal");
  renderPrintheads();

  const detailModal = document.getElementById("printhead-detail-modal");
  if (detailModal && detailModal.classList.contains("open")) _phRenderHeadDetail();
}
