// ═══════════════════════════════════════
// COLEX
// ═══════════════════════════════════════

// ── Merchandiser state ──
let _colexMerchSheets     = {};
let _colexMerchLostSheets = 0;

// ── Yard Signs timer state ──
let _colexYSRunning   = false;
let _colexYSSec       = 0;
let _colexYSStartWall = 0;
let _colexYSInterval  = null;

// ── Category selection ──
function colexSelectCat(btn) {
  document.querySelectorAll(".colex-cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const cat = btn.dataset.cat;
  const content = document.getElementById("colex-content");
  content.style.textAlign = "";
  if (cat === "Yard Signs") {
    colexYardSignsRender(content);
  } else if (cat === "Merchandisers") {
    colexMerchRender(content);
  } else if (cat === "Canvas") {
    colexCanvasRender(content);
  } else if (cat === "Custom") {
    colexCustomRender(content);
  } else {
    content.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:14px;color:#b09820;text-align:center;padding:32px 0;">${cat} — coming soon.</div>`;
  }
}

// ═══════════════════════════════════════
// YARD SIGNS
// ═══════════════════════════════════════

function colexYardSignsRender(container) {
  container.innerHTML = "";

  const stopped = !_colexYSRunning && _colexYSSec > 0;

  container.innerHTML = `
    <div style="width:100%;max-width:560px;">

      <!-- Header info -->
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px;">
        <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#b09820;text-transform:uppercase;letter-spacing:0.1em;">Yard Signs</div>
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#c8c8a0;">1 sheet = ${COLEX_YARD_SIGN_YIELD} pieces</div>
      </div>

      <!-- Timer display -->
      <div style="background:#fff;border:2px solid #e0cc70;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:20px;">
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b09820;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Run Time</div>
        <div id="cys-display" style="font-family:'Abril Fatface',serif;font-size:64px;color:${_colexYSRunning ? '#c8a800' : (_colexYSSec > 0 ? '#336688' : '#d0c080')};line-height:1;letter-spacing:0.02em;">${fmt(_colexYSSec)}</div>
      </div>

      <!-- Controls -->
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:28px;">
        <button id="cys-start-btn" onclick="colexYSStart()"
          style="display:${_colexYSRunning ? 'none' : 'flex'};align-items:center;gap:8px;padding:12px 28px;border-radius:10px;background:#c8a800;border:2px solid #9a7e00;color:#fff;font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.06em;">
          ▶ ${_colexYSSec > 0 ? 'Resume' : 'Start'}
        </button>
        <button id="cys-stop-btn" onclick="colexYSStop()"
          style="display:${_colexYSRunning ? 'flex' : 'none'};align-items:center;gap:8px;padding:12px 28px;border-radius:10px;background:#cc3333;border:2px solid #992222;color:#fff;font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.06em;">
          ■ Stop
        </button>
        <button onclick="colexYSReset()"
          style="padding:12px 20px;border-radius:10px;background:#fff;border:2px solid #e0cc70;color:#9a7e00;font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.06em;">
          ↺ Reset
        </button>
      </div>

      <!-- Sheet entry — visible only after stopping -->
      <div id="cys-entry" style="display:${stopped ? 'block' : 'none'};">
        <div style="background:#fff;border:2px solid #e0cc70;border-radius:12px;padding:20px 24px;margin-bottom:16px;">
          <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b09820;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;">Session Summary</div>
          <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;">
            <div style="flex:1;min-width:120px;">
              <label style="font-family:'Josefin Slab',serif;font-size:10px;color:#9a7e00;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">Total Sheets Cut</label>
              <input id="cys-sheets-input" type="number" min="0" placeholder="0"
                style="font-family:'Abril Fatface',serif;font-size:28px;color:#c8a800;background:#fffbe6;border:2px solid #e0cc70;border-radius:8px;padding:8px 14px;width:100%;text-align:center;outline:none;"
                oninput="colexYSUpdatePieces()" />
            </div>
            <div style="flex:1;min-width:120px;">
              <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#72a868;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Pieces Produced</div>
              <div id="cys-pieces-display" style="font-family:'Abril Fatface',serif;font-size:28px;color:#52a040;background:#f0faf0;border:2px solid #c2e8b8;border-radius:8px;padding:8px 14px;text-align:center;">0</div>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button onclick="colexYSSave()" style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;padding:11px 28px;border-radius:10px;background:#c8a800;border:2px solid #9a7e00;color:#fff;cursor:pointer;letter-spacing:0.06em;">✓ Save Session</button>
        </div>
      </div>

    </div>
  `;
}

function colexYSStart() {
  _colexYSRunning   = true;
  _colexYSStartWall = Date.now() - (_colexYSSec * 1000);
  // Re-render so buttons and entry panel update correctly
  const content = document.getElementById("colex-content");
  colexYardSignsRender(content);
  // Kick off live tick
  _colexYSInterval = setInterval(() => {
    _colexYSSec = Math.floor((Date.now() - _colexYSStartWall) / 1000);
    const el = document.getElementById("cys-display");
    if (el) el.textContent = fmt(_colexYSSec);
  }, 500);
}

function colexYSStop() {
  if (!_colexYSRunning) return;
  clearInterval(_colexYSInterval);
  _colexYSInterval = null;
  _colexYSRunning  = false;
  // Re-render so entry panel appears cleanly and state is correct
  const content = document.getElementById("colex-content");
  colexYardSignsRender(content);
  // Auto-focus the sheet input so operator can type immediately
  setTimeout(() => {
    const input = document.getElementById("cys-sheets-input");
    if (input) input.focus();
  }, 50);
}

function colexYSReset() {
  clearInterval(_colexYSInterval);
  _colexYSRunning   = false;
  _colexYSSec       = 0;
  _colexYSStartWall = 0;
  _colexYSInterval  = null;
  const content = document.getElementById("colex-content");
  colexYardSignsRender(content);
}

function colexYSUpdatePieces() {
  const sheets = parseInt(document.getElementById("cys-sheets-input")?.value) || 0;
  const piecesEl = document.getElementById("cys-pieces-display");
  if (piecesEl) piecesEl.textContent = (sheets * COLEX_YARD_SIGN_YIELD).toLocaleString();
}

function colexYSSave() {
  const sheets = parseInt(document.getElementById("cys-sheets-input")?.value) || 0;
  if (!sheets && _colexYSSec === 0) return;
  const pieces = sheets * COLEX_YARD_SIGN_YIELD;
  const op     = document.getElementById("global-operator")?.value || "—";
  const now    = new Date();

  if (window._fb) {
    window._fb.saveMachineEvent("Colex", {
      category: "colex",
      type:     "Yard Signs Run",
      detail:   `${sheets} sheets · ${pieces} pcs · ${fmt(_colexYSSec)}`,
      notes:    "",
      color:    "#c8a800",
      time:     now.toISOString(),
    });
  }

  // Reset and show confirmation
  clearInterval(_colexYSInterval);
  _colexYSRunning = false; _colexYSSec = 0; _colexYSStartWall = 0; _colexYSInterval = null;
  const content = document.getElementById("colex-content");
  colexYardSignsRender(content);
  // Flash saved message
  const disp = document.getElementById("cys-display");
  if (disp) { disp.textContent = "Saved!"; disp.style.color = "#52a040"; disp.style.fontSize = "40px"; }
  setTimeout(() => colexYardSignsRender(document.getElementById("colex-content")), 1500);
}

// ── Render tally cards ──
function colexMerchRender(container) {
  container.innerHTML = "";

  // 2×2 card grid
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;";

  COLEX_MERCHANDISERS.forEach(pt => {
    const sheets      = _colexMerchSheets[pt.id] || 0;
    const pieces      = sheets * pt.yield;
    const secPerSheet = colexMerchGetTime(pt.id);
    const totalSec    = sheets * secPerSheet;

    const card = document.createElement("div");
    card.style.cssText = "background:#fff;border:2px solid #e0cc70;border-radius:12px;padding:14px 12px;display:flex;flex-direction:column;align-items:center;gap:10px;";
    card.innerHTML = `
      <div style="width:100%;text-align:center;">
        <div style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:#7a6000;text-transform:uppercase;letter-spacing:0.06em;line-height:1.3;">${pt.label}</div>
        <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#b09820;letter-spacing:0.06em;margin-top:2px;">1 sheet = ${pt.yield} pc${pt.yield > 1 ? 's' : ''}</div>
      </div>

      <button id="cm-tally-${pt.id}" onclick="colexMerchTally('${pt.id}')"
        style="width:100%;padding:14px 0;border-radius:10px;background:#c8a800;border:2px solid #9a7e00;color:#fff;font-family:'Abril Fatface',serif;font-size:26px;cursor:pointer;line-height:1;transition:all 0.1s;touch-action:manipulation;user-select:none;">+1</button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;">
        <div style="text-align:center;background:#fffbe6;border-radius:8px;padding:6px 4px;">
          <div id="cm-sheets-${pt.id}" style="font-family:'Abril Fatface',serif;font-size:24px;color:#c8a800;line-height:1;">${sheets}</div>
          <div style="font-family:'Josefin Slab',serif;font-size:8px;color:#b09820;text-transform:uppercase;letter-spacing:0.08em;">sheets</div>
        </div>
        <div style="text-align:center;background:#f0faf0;border-radius:8px;padding:6px 4px;">
          <div id="cm-pieces-${pt.id}" style="font-family:'Abril Fatface',serif;font-size:24px;color:#52a040;line-height:1;">${pieces}</div>
          <div style="font-family:'Josefin Slab',serif;font-size:8px;color:#72a868;text-transform:uppercase;letter-spacing:0.08em;">pieces</div>
        </div>
      </div>

      <div style="width:100%;text-align:center;background:#f0f6fb;border-radius:8px;padding:6px 4px;${secPerSheet ? '' : 'opacity:0.4;'}">
        <div id="cm-time-${pt.id}" style="font-family:'Abril Fatface',serif;font-size:18px;color:#336688;line-height:1;">${fmt(totalSec)}</div>
        <div style="font-family:'Josefin Slab',serif;font-size:8px;color:#6688aa;text-transform:uppercase;letter-spacing:0.08em;">expected time</div>
      </div>

      <button id="cm-undo-${pt.id}" onclick="colexMerchUndo('${pt.id}')" ${sheets === 0 ? 'disabled' : ''}
        style="width:100%;padding:5px 0;border-radius:6px;background:${sheets === 0 ? '#f5f0e0' : '#fff8e6'};border:1px solid #e0cc70;color:${sheets === 0 ? '#c8b860' : '#9a7e00'};font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;cursor:${sheets === 0 ? 'default' : 'pointer'};transition:all 0.1s;">↩ Undo</button>
    `;
    grid.appendChild(card);
  });
  container.appendChild(grid);

  // Lost sheets counter
  const lost = _colexMerchLostSheets;
  const lostRow = document.createElement("div");
  lostRow.style.cssText = "background:#fff5f5;border:2px solid #ffaaaa;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;";
  lostRow.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex:1;">
      <div style="text-align:center;min-width:48px;">
        <div id="cm-lost" style="font-family:'Abril Fatface',serif;font-size:28px;color:#cc3333;line-height:1;">${lost}</div>
        <div style="font-family:'Josefin Slab',serif;font-size:8px;color:#cc3333;text-transform:uppercase;letter-spacing:0.08em;">lost sheets</div>
      </div>
      <div>
        <div style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:#882222;text-transform:uppercase;letter-spacing:0.06em;">Spoilage / Mistakes</div>
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#cc7777;">Tap to log a lost or ruined sheet</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;">
      <button onclick="colexMerchLostTally()"
        style="width:60px;height:44px;border-radius:8px;background:#cc3333;border:2px solid #992222;color:#fff;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;user-select:none;">+1</button>
      <button id="cm-lost-undo" onclick="colexMerchLostUndo()" ${lost === 0 ? 'disabled' : ''}
        style="width:60px;height:22px;border-radius:5px;background:${lost === 0 ? '#fce8e8' : '#fff0f0'};border:1px solid #ffaaaa;color:${lost === 0 ? '#ddaaaa' : '#cc3333'};font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;cursor:${lost === 0 ? 'default' : 'pointer'};">↩ Undo</button>
    </div>
  `;
  container.appendChild(lostRow);

  // Footer actions
  const footer = document.createElement("div");
  footer.id = "cm-footer";
  footer.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";
  footer.innerHTML = `
    <button onclick="colexMerchReset()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 20px;border-radius:8px;background:#fff;border:1px solid #e0cc70;color:#9a7e00;cursor:pointer;letter-spacing:0.05em;">↺ Reset</button>
    <button id="cm-save-btn" onclick="colexMerchSave()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 24px;border-radius:8px;background:#c8a800;border:2px solid #9a7e00;color:#fff;cursor:pointer;letter-spacing:0.05em;">✓ Save Session</button>
  `;
  container.appendChild(footer);
}

// ── Update a single piece-type card in place ──
function colexMerchUpdateCard(id) {
  const pt = COLEX_MERCHANDISERS.find(p => p.id === id);
  if (!pt) return;
  const sheets      = _colexMerchSheets[id] || 0;
  const pieces      = sheets * pt.yield;
  const secPerSheet = colexMerchGetTime(id);
  const totalSec    = sheets * secPerSheet;

  const sheetsEl = document.getElementById("cm-sheets-" + id);
  const piecesEl = document.getElementById("cm-pieces-" + id);
  const timeEl   = document.getElementById("cm-time-"   + id);
  const undoBtn  = document.getElementById("cm-undo-"   + id);

  if (sheetsEl) sheetsEl.textContent = sheets;
  if (piecesEl) piecesEl.textContent = pieces;
  if (timeEl)   timeEl.textContent   = fmt(totalSec);
  if (undoBtn) {
    undoBtn.disabled         = sheets === 0;
    undoBtn.style.background = sheets === 0 ? '#f5f0e0' : '#fff8e6';
    undoBtn.style.color      = sheets === 0 ? '#c8b860' : '#9a7e00';
    undoBtn.style.cursor     = sheets === 0 ? 'default'  : 'pointer';
  }
}

// ── Update lost-sheet counter in place ──
function colexMerchUpdateLost() {
  const lostEl   = document.getElementById("cm-lost");
  const undoBtn  = document.getElementById("cm-lost-undo");
  const lost     = _colexMerchLostSheets;
  if (lostEl)  lostEl.textContent      = lost;
  if (undoBtn) {
    undoBtn.disabled         = lost === 0;
    undoBtn.style.background = lost === 0 ? '#fce8e8' : '#fff0f0';
    undoBtn.style.color      = lost === 0 ? '#ddaaaa' : '#cc3333';
    undoBtn.style.cursor     = lost === 0 ? 'default'  : 'pointer';
  }
}

// ── Get expected time (seconds per sheet) from settings ──
function colexMerchGetTime(id) {
  const saved = window._targets?.["__colex_merch_time_" + id];
  return (saved !== undefined && saved !== "" && saved !== 0) ? saved : (COLEX_MERCH_TIME_DEFAULTS[id] || 0);
}

// ── Tally / Undo — piece types ──
function colexMerchTally(id) {
  if (!_colexMerchSheets[id]) _colexMerchSheets[id] = 0;
  _colexMerchSheets[id]++;
  colexMerchUpdateCard(id);
}
function colexMerchUndo(id) {
  if (!_colexMerchSheets[id] || _colexMerchSheets[id] === 0) return;
  _colexMerchSheets[id]--;
  colexMerchUpdateCard(id);
}

// ── Tally / Undo — lost sheets ──
function colexMerchLostTally() {
  _colexMerchLostSheets++;
  colexMerchUpdateLost();
}
function colexMerchLostUndo() {
  if (_colexMerchLostSheets === 0) return;
  _colexMerchLostSheets--;
  colexMerchUpdateLost();
}

// ── Reset all ──
function colexMerchReset() {
  _colexMerchSheets     = {};
  _colexMerchLostSheets = 0;
  const content = document.getElementById("colex-content");
  colexMerchRender(content);
}

// ── Save session ──
function colexMerchSave() {
  const hasData = COLEX_MERCHANDISERS.some(pt => (_colexMerchSheets[pt.id] || 0) > 0) || _colexMerchLostSheets > 0;
  if (!hasData) return;

  const op  = document.getElementById("global-operator")?.value || "—";
  const now = new Date();

  // Save piece-type entries
  COLEX_MERCHANDISERS.forEach(pt => {
    const sheets = _colexMerchSheets[pt.id] || 0;
    if (!sheets) return;
    const pieces      = sheets * pt.yield;
    const secPerSheet = colexMerchGetTime(pt.id);
    const totalSec    = sheets * secPerSheet;
    if (window._fb) {
      window._fb.saveMachineEvent("Colex", {
        category: "colex",
        type:     "Merchandiser Run",
        detail:   `${pt.label} · ${sheets} sheets · ${pieces} pcs`,
        notes:    `Expected: ${fmt(totalSec)}`,
        color:    "#c8a800",
        time:     now.toISOString(),
      });
    }
  });

  // Save lost sheets entry
  if (_colexMerchLostSheets > 0 && window._fb) {
    window._fb.saveMachineEvent("Colex", {
      category: "colex",
      type:     "Spoilage",
      detail:   `${_colexMerchLostSheets} lost sheet${_colexMerchLostSheets > 1 ? 's' : ''}`,
      notes:    "",
      color:    "#cc3333",
      time:     now.toISOString(),
    });
  }

  _colexMerchSheets     = {};
  _colexMerchLostSheets = 0;

  // Flash the save button green, then re-render
  const saveBtn = document.getElementById("cm-save-btn");
  if (saveBtn) {
    saveBtn.textContent       = "✓ Saved!";
    saveBtn.style.background  = "#52a040";
    saveBtn.style.borderColor = "#3a7a2c";
    setTimeout(() => {
      const content = document.getElementById("colex-content");
      colexMerchRender(content);
    }, 1000);
  } else {
    const content = document.getElementById("colex-content");
    colexMerchRender(content);
  }
}

// ═══════════════════════════════════════
// CANVAS — simple tally
// ═══════════════════════════════════════
let _colexCanvasCount = 0;

function colexCanvasRender(container) {
  container.innerHTML = `
    <div style="width:100%;max-width:560px;">
      <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#b09820;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">Canvas</div>

      <div style="background:#fff;border:2px solid #e0cc70;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:20px;">
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b09820;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Pieces Completed</div>
        <div id="cvs-count" style="font-family:'Abril Fatface',serif;font-size:80px;color:#c8a800;line-height:1;">${_colexCanvasCount}</div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px;">
        <button onclick="colexCanvasTally()"
          style="flex:1;max-width:220px;padding:16px 0;border-radius:10px;background:#c8a800;border:2px solid #9a7e00;color:#fff;font-family:'Abril Fatface',serif;font-size:28px;cursor:pointer;touch-action:manipulation;user-select:none;">+1</button>
        <button id="cvs-undo" onclick="colexCanvasUndo()" ${_colexCanvasCount === 0 ? 'disabled' : ''}
          style="padding:16px 20px;border-radius:10px;background:${_colexCanvasCount === 0 ? '#f5f0e0' : '#fff8e6'};border:2px solid #e0cc70;color:${_colexCanvasCount === 0 ? '#c8b860' : '#9a7e00'};font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;cursor:${_colexCanvasCount === 0 ? 'default' : 'pointer'};">↩ Undo</button>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="colexCanvasReset()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 20px;border-radius:8px;background:#fff;border:1px solid #e0cc70;color:#9a7e00;cursor:pointer;">↺ Reset</button>
        <button id="cvs-save" onclick="colexCanvasSave()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 24px;border-radius:8px;background:#c8a800;border:2px solid #9a7e00;color:#fff;cursor:pointer;">✓ Save Session</button>
      </div>
    </div>
  `;
}

function colexCanvasTally() {
  _colexCanvasCount++;
  const el = document.getElementById("cvs-count");
  const undo = document.getElementById("cvs-undo");
  if (el) el.textContent = _colexCanvasCount;
  if (undo) { undo.disabled = false; undo.style.background = "#fff8e6"; undo.style.color = "#9a7e00"; undo.style.cursor = "pointer"; }
}

function colexCanvasUndo() {
  if (_colexCanvasCount === 0) return;
  _colexCanvasCount--;
  const el = document.getElementById("cvs-count");
  const undo = document.getElementById("cvs-undo");
  if (el) el.textContent = _colexCanvasCount;
  if (undo && _colexCanvasCount === 0) { undo.disabled = true; undo.style.background = "#f5f0e0"; undo.style.color = "#c8b860"; undo.style.cursor = "default"; }
}

function colexCanvasReset() {
  _colexCanvasCount = 0;
  colexCanvasRender(document.getElementById("colex-content"));
}

function colexCanvasSave() {
  if (_colexCanvasCount === 0) return;
  const op  = document.getElementById("global-operator")?.value || "—";
  const now = new Date();
  if (window._fb) {
    window._fb.saveMachineEvent("Colex", {
      category: "colex", type: "Canvas Run",
      detail: `${_colexCanvasCount} piece${_colexCanvasCount !== 1 ? 's' : ''}`,
      notes: "", color: "#c8a800", time: now.toISOString(),
    });
  }
  _colexCanvasCount = 0;
  const saveBtn = document.getElementById("cvs-save");
  if (saveBtn) { saveBtn.textContent = "✓ Saved!"; saveBtn.style.background = "#52a040"; saveBtn.style.borderColor = "#3a7a2c"; }
  setTimeout(() => colexCanvasRender(document.getElementById("colex-content")), 1200);
}

// ═══════════════════════════════════════
// CUSTOM — tally + notes
// ═══════════════════════════════════════
let _colexCustomCount = 0;

function colexCustomRender(container) {
  container.innerHTML = `
    <div style="width:100%;max-width:560px;">
      <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#b09820;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">Custom</div>

      <div style="background:#fff;border:2px solid #e0cc70;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:20px;">
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b09820;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Pieces Completed</div>
        <div id="cct-count" style="font-family:'Abril Fatface',serif;font-size:80px;color:#c8a800;line-height:1;">${_colexCustomCount}</div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px;">
        <button onclick="colexCustomTally()"
          style="flex:1;max-width:220px;padding:16px 0;border-radius:10px;background:#c8a800;border:2px solid #9a7e00;color:#fff;font-family:'Abril Fatface',serif;font-size:28px;cursor:pointer;touch-action:manipulation;user-select:none;">+1</button>
        <button id="cct-undo" onclick="colexCustomUndo()" ${_colexCustomCount === 0 ? 'disabled' : ''}
          style="padding:16px 20px;border-radius:10px;background:${_colexCustomCount === 0 ? '#f5f0e0' : '#fff8e6'};border:2px solid #e0cc70;color:${_colexCustomCount === 0 ? '#c8b860' : '#9a7e00'};font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;cursor:${_colexCustomCount === 0 ? 'default' : 'pointer'};">↩ Undo</button>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-family:'Josefin Slab',serif;font-size:10px;color:#9a7e00;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">Notes</label>
        <textarea id="cct-notes" placeholder="Describe what was produced, job details, special instructions..."
          style="font-family:'Josefin Slab',serif;font-size:13px;width:100%;min-height:80px;background:#fffbe6;border:2px solid #e0cc70;border-radius:8px;padding:10px 12px;color:#5a4800;outline:none;resize:vertical;box-sizing:border-box;"
          onfocus="this.style.borderColor='#c8a800'" onblur="this.style.borderColor='#e0cc70'"></textarea>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="colexCustomReset()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 20px;border-radius:8px;background:#fff;border:1px solid #e0cc70;color:#9a7e00;cursor:pointer;">↺ Reset</button>
        <button id="cct-save" onclick="colexCustomSave()" style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;padding:9px 24px;border-radius:8px;background:#c8a800;border:2px solid #9a7e00;color:#fff;cursor:pointer;">✓ Save Session</button>
      </div>
    </div>
  `;
}

function colexCustomTally() {
  _colexCustomCount++;
  const el = document.getElementById("cct-count");
  const undo = document.getElementById("cct-undo");
  if (el) el.textContent = _colexCustomCount;
  if (undo) { undo.disabled = false; undo.style.background = "#fff8e6"; undo.style.color = "#9a7e00"; undo.style.cursor = "pointer"; }
}

function colexCustomUndo() {
  if (_colexCustomCount === 0) return;
  _colexCustomCount--;
  const el = document.getElementById("cct-count");
  const undo = document.getElementById("cct-undo");
  if (el) el.textContent = _colexCustomCount;
  if (undo && _colexCustomCount === 0) { undo.disabled = true; undo.style.background = "#f5f0e0"; undo.style.color = "#c8b860"; undo.style.cursor = "default"; }
}

function colexCustomReset() {
  _colexCustomCount = 0;
  colexCustomRender(document.getElementById("colex-content"));
}

function colexCustomSave() {
  const notes = document.getElementById("cct-notes")?.value.trim() || "";
  if (_colexCustomCount === 0 && !notes) return;
  const op  = document.getElementById("global-operator")?.value || "—";
  const now = new Date();
  if (window._fb) {
    window._fb.saveMachineEvent("Colex", {
      category: "colex", type: "Custom Run",
      detail: `${_colexCustomCount} piece${_colexCustomCount !== 1 ? 's' : ''}`,
      notes, color: "#c8a800", time: now.toISOString(),
    });
  }
  _colexCustomCount = 0;
  const saveBtn = document.getElementById("cct-save");
  if (saveBtn) { saveBtn.textContent = "✓ Saved!"; saveBtn.style.background = "#52a040"; saveBtn.style.borderColor = "#3a7a2c"; }
  setTimeout(() => colexCustomRender(document.getElementById("colex-content")), 1200);
}
