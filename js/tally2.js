// ═══════════════════════════════════════
// TALLY 2.0
// ═══════════════════════════════════════
// Fixes vs. original tally:
//  - All timestamps use local time (never UTC) so evening shifts file correctly
//  - Snapshot keyed by machine + date so multiple computers never collide
//  - Restore always fetches the correct machine's data on refresh

let _t2Counts         = {};
let _t2Misprints      = {};
let _t2StartTimes     = {};
let _t2SavedCounts    = {};
let _t2SavedMisprints = {};
let _t2Cat            = "";
let _t2SaveTimer      = null;

const _T2_PIECE_CATS = ["Coir OC", "Coir FC", "Non-Coir Mats", "Signs", "Display Pieces", "Roll Media", "Drinkware"];

// ── Local time helpers — never use toISOString() ──
function _t2LocalDateStr() {
  const d = new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function _t2LocalTimeStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate())
       + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// ── Entry point — called from tallyLoginConfirm after login ──
// isSwitching = true when an operator handoff triggered this (counts reset to 0)
// isSwitching = false on first entry (counts restored from Firebase)
function t2Init(isSwitching) {
  _t2Cat = "";
  _t2RenderCatTabs();
  if (isSwitching) {
    // Clear everything for the incoming operator
    _t2Counts = {}; _t2Misprints = {}; _t2StartTimes = {};
    _t2SavedCounts = {}; _t2SavedMisprints = {};
    _t2RenderCards();
    // Write the empty snapshot immediately so a page refresh also starts at 0
    _t2SaveNow();
  } else {
    _t2RenderCards();
    _t2Restore();
  }
}

// ── Category tabs ──
function _t2RenderCatTabs() {
  const bar = document.getElementById('t2-cat-tabs');
  if (!bar) return;
  bar.innerHTML = '';
  ['All', ..._T2_PIECE_CATS].forEach(cat => {
    const btn = document.createElement('button');
    btn.dataset.cat = cat;
    btn.textContent = cat;
    const active = (cat === 'All' && _t2Cat === '') || cat === _t2Cat;
    btn.style.cssText = `font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;border:1.5px solid ${active ? '#2e8b57' : '#d0e4d8'};background:${active ? '#2e8b57' : '#fff'};color:${active ? '#fff' : '#5a7a52'};cursor:pointer;white-space:nowrap;flex-shrink:0;`;
    btn.onclick = () => t2PickCat(btn);
    bar.appendChild(btn);
  });
}

function t2PickCat(btn) {
  const cat = btn.dataset.cat;
  _t2Cat = (cat === 'All') ? '' : (_t2Cat === cat ? '' : cat);
  _t2RenderCatTabs();
  _t2RenderCards();
}

// ── Cards grid ──
function _t2RenderCards() {
  const area = document.getElementById('t2-cards-area');
  if (!area) return;
  area.innerHTML = '';

  const cats = _t2Cat === '' ? _T2_PIECE_CATS : [_t2Cat];

  cats.forEach(cat => {
    if (_t2Cat === '') {
      const hdr = document.createElement('div');
      hdr.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#2d6b3d;text-transform:uppercase;letter-spacing:0.12em;padding:2px 0 8px;margin-top:8px;border-bottom:2px solid #c2e8b8;margin-bottom:10px;";
      hdr.textContent = cat;
      area.appendChild(hdr);
    }

    let subs, keyCat;
    if (cat === 'Coir OC') {
      keyCat = 'Coir';
      subs = (PIECE_TYPES['Coir'] || []).filter(s => s.includes('OC') || s === 'Flocked');
    } else if (cat === 'Coir FC') {
      keyCat = 'Coir';
      subs = (PIECE_TYPES['Coir'] || []).filter(s => s.includes('FC'));
    } else {
      keyCat = cat;
      subs = PIECE_TYPES[cat] || [];
    }
    if (!subs.length) return;

    const grid = document.createElement('div');
    grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;margin-bottom:16px;";
    subs.forEach(sub => grid.appendChild(_t2MakeCard(keyCat + ' · ' + sub, sub)));
    area.appendChild(grid);
  });

  _t2RenderFooter(area);
}

// ── Single piece card ──
function _t2MakeCard(key, sub) {
  const count = _t2Counts[key]    || 0;
  const mp    = _t2Misprints[key] || 0;
  const esc   = CSS.escape(key);

  const card = document.createElement('div');
  card.style.cssText = "background:#fff;border:2px solid #c2e8b8;border-radius:10px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;";

  const headerRow = document.createElement('div');
  headerRow.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;width:100%;position:relative;";

  const lbl = document.createElement('div');
  lbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#1a2e1c;text-transform:uppercase;letter-spacing:0.05em;line-height:1.3;flex:1;";
  lbl.textContent = sub;

  const kebab = document.createElement('button');
  kebab.textContent = '⋮';
  kebab.title = 'Adjust total';
  kebab.style.cssText = "background:none;border:none;cursor:pointer;font-size:16px;color:#aaccaa;padding:0 2px;line-height:1;flex-shrink:0;";
  kebab.addEventListener('click', e => { e.stopPropagation(); _t2OpenAdjust(key); });

  headerRow.appendChild(lbl);
  headerRow.appendChild(kebab);

  const countEl = document.createElement('div');
  countEl.id = 't2-count-' + esc;
  countEl.textContent = count;
  countEl.style.cssText = "font-family:'Abril Fatface',serif;font-size:36px;color:#2e8b57;background:#f0f7f2;border:2px solid #c2e8b8;border-radius:8px;padding:8px 4px;width:100%;text-align:center;box-sizing:border-box;line-height:1.2;transition:transform 0.1s;";

  const btnRow = document.createElement('div');
  btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;";

  const minusBtn = document.createElement('button');
  minusBtn.textContent = '−';
  minusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#f0f7f2;border:2px solid #c2e8b8;color:#2e8b57;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  minusBtn.addEventListener('click', () => t2Dec(key));

  const plusBtn = document.createElement('button');
  plusBtn.textContent = '+';
  plusBtn.style.cssText = "padding:10px 0;border-radius:7px;background:#2e8b57;border:2px solid #1e6b40;color:#fff;font-family:'Abril Fatface',serif;font-size:22px;cursor:pointer;touch-action:manipulation;user-select:none;line-height:1;";
  plusBtn.addEventListener('click', () => t2Inc(key));

  btnRow.appendChild(minusBtn);
  btnRow.appendChild(plusBtn);

  // Compact misprint row
  const mpRow = document.createElement('div');
  mpRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;width:100%;background:#fff8f8;border-radius:6px;padding:4px 6px;box-sizing:border-box;";

  const mpLbl = document.createElement('span');
  mpLbl.style.cssText = "font-family:'Josefin Slab',serif;font-size:9px;color:#cc3333;text-transform:uppercase;letter-spacing:0.06em;";
  mpLbl.textContent = '✗ Mis';

  const mpCtrl = document.createElement('div');
  mpCtrl.style.cssText = "display:flex;align-items:center;gap:4px;";

  const mpMinus = document.createElement('button');
  mpMinus.textContent = '−';
  mpMinus.style.cssText = "width:22px;height:22px;border-radius:4px;background:#fff;border:1px solid #ffcccc;color:#cc3333;font-family:'Abril Fatface',serif;font-size:14px;cursor:pointer;touch-action:manipulation;line-height:1;padding:0;";
  mpMinus.addEventListener('click', () => t2MisprintDec(key));

  const mpCountEl = document.createElement('span');
  mpCountEl.id = 't2-mp-' + esc;
  mpCountEl.textContent = mp;
  mpCountEl.style.cssText = "font-family:'Abril Fatface',serif;font-size:14px;color:#cc3333;min-width:18px;text-align:center;";

  const mpPlus = document.createElement('button');
  mpPlus.textContent = '+';
  mpPlus.style.cssText = "width:22px;height:22px;border-radius:4px;background:#cc3333;border:none;color:#fff;font-family:'Abril Fatface',serif;font-size:14px;cursor:pointer;touch-action:manipulation;line-height:1;padding:0;";
  mpPlus.addEventListener('click', () => t2MisprintInc(key));

  mpCtrl.appendChild(mpMinus);
  mpCtrl.appendChild(mpCountEl);
  mpCtrl.appendChild(mpPlus);
  mpRow.appendChild(mpLbl);
  mpRow.appendChild(mpCtrl);

  card.appendChild(headerRow);
  card.appendChild(countEl);
  card.appendChild(btnRow);
  card.appendChild(mpRow);
  return card;
}

function _t2RenderFooter(area) {
  const footer = document.createElement('div');
  footer.style.cssText = "display:flex;align-items:center;justify-content:space-between;width:100%;padding:16px 0 32px;";
  footer.innerHTML = `
    <span id="t2-autosave-status" style="font-family:'Josefin Slab',serif;font-size:11px;color:#52a040;min-width:60px;"></span>
  `;
  area.appendChild(footer);
}

// ── Count actions ──
function t2Inc(key) {
  if (!_t2StartTimes[key]) _t2StartTimes[key] = _t2LocalTimeStr();
  _t2Counts[key] = (_t2Counts[key] || 0) + 1;
  const el = document.getElementById('t2-count-' + CSS.escape(key));
  if (el) {
    el.textContent = _t2Counts[key];
    el.style.transform = 'scale(1.12)';
    setTimeout(() => { el.style.transform = ''; }, 120);
  }
  _t2ScheduleSave();
  updateTopCounters();
}

function t2Dec(key) {
  if (!_t2Counts[key]) return;
  _t2Counts[key]--;
  if (_t2Counts[key] === 0) delete _t2StartTimes[key];
  const el = document.getElementById('t2-count-' + CSS.escape(key));
  if (el) el.textContent = _t2Counts[key];
  _t2ScheduleSave();
  updateTopCounters();
}

function t2MisprintInc(key) {
  _t2Misprints[key] = (_t2Misprints[key] || 0) + 1;
  const el = document.getElementById('t2-mp-' + CSS.escape(key));
  if (el) el.textContent = _t2Misprints[key];
  _t2ScheduleSave();
}

function t2MisprintDec(key) {
  if (!_t2Misprints[key]) return;
  _t2Misprints[key]--;
  const el = document.getElementById('t2-mp-' + CSS.escape(key));
  if (el) el.textContent = _t2Misprints[key];
  _t2ScheduleSave();
}

// ── Save ──
function _t2ScheduleSave() {
  clearTimeout(_t2SaveTimer);
  _t2SaveTimer = setTimeout(_t2SaveNow, 800);
}

function _t2SaveNow() {
  const machine = (typeof _tallyMachine !== 'undefined' ? _tallyMachine : '') || '';
  if (!machine || machine === '—') return;

  const dateStr = _t2LocalDateStr();
  const now     = _t2LocalTimeStr();
  const ops     = (typeof _tallyActiveOps !== 'undefined' ? _tallyActiveOps : []);
  const opStr   = ops.length ? ops.join(' & ') : '—';

  const snapshot = {
    machine,
    operators:  ops,
    counts:     { ..._t2Counts },
    misprints:  { ..._t2Misprints },
    startTimes: { ..._t2StartTimes },
    savedAt:    now,
  };

  // localStorage backup (per machine + date so computers don't share)
  try {
    localStorage.setItem('pt_t2_' + machine + '_' + dateStr, JSON.stringify(snapshot));
  } catch(e) {}

  // Firebase snapshot — path includes machine so no cross-machine collisions
  if (window._fb) window._fb.setTally2State(machine, dateStr, snapshot);

  // Delta session records — only pieces that changed since last save
  if (window._fb) {
    Object.keys(_t2Counts).forEach(pieceKey => {
      const count    = _t2Counts[pieceKey]    || 0;
      const misprint = _t2Misprints[pieceKey] || 0;
      const delta    = count    - (_t2SavedCounts[pieceKey]    || 0);
      const mpDelta  = misprint - (_t2SavedMisprints[pieceKey] || 0);
      if (delta <= 0 && mpDelta <= 0) return;

      window._fb.saveSession(machine, {
        mode:        'tally2',
        qtyGood:     Math.max(0, delta),
        qtyBad:      Math.max(0, mpDelta),
        pieceType:   pieceKey,
        op:          opStr,
        time:        now,       // local time — no UTC midnight problem
        localDate:   dateStr,   // explicit local date for reporting
        totalSec:    60,
        changeovers: 0,
        notes:       '',
      });

      _t2SavedCounts[pieceKey]    = count;
      _t2SavedMisprints[pieceKey] = misprint;
    });
  }

  const el = document.getElementById('t2-autosave-status');
  if (el) {
    el.textContent = '✓ Saved';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2000);
  }
}

// ── Restore today's counts from Firebase (per machine) or localStorage ──
function _t2Restore() {
  const machine = (typeof _tallyMachine !== 'undefined' ? _tallyMachine : '') || '';
  const dateStr = _t2LocalDateStr();

  const apply = data => {
    if (!data) {
      try {
        const raw = localStorage.getItem('pt_t2_' + machine + '_' + dateStr);
        if (raw) data = JSON.parse(raw);
      } catch(e) {}
    }
    if (!data || !data.counts) return;
    _t2Counts         = { ...data.counts };
    _t2Misprints      = { ...(data.misprints  || {}) };
    _t2StartTimes     = { ...(data.startTimes || {}) };
    _t2SavedCounts    = { ...data.counts };
    _t2SavedMisprints = { ...(data.misprints  || {}) };
    _t2RenderCards();
  };

  if (window._fb && machine) {
    window._fb.fetchTally2State(machine, dateStr).then(apply).catch(() => apply(null));
  } else {
    apply(null);
  }
}

// ── Reset ──
function t2Reset() {
  if (!window.confirm('Reset all counts for this session?')) return;
  const machine = (typeof _tallyMachine !== 'undefined' ? _tallyMachine : '') || '';
  const dateStr = _t2LocalDateStr();
  _t2Counts = {}; _t2Misprints = {}; _t2StartTimes = {};
  _t2SavedCounts = {}; _t2SavedMisprints = {};
  _t2RenderCards();
  if (window._fb && machine) {
    window._fb.setTally2State(machine, dateStr, {
      machine, counts: {}, misprints: {}, startTimes: {}, savedAt: _t2LocalTimeStr()
    });
  }
}

// ── Adjust modal (⋮ button) ──
function _t2OpenAdjust(key) {
  // Remove any existing modal
  document.getElementById('t2-adjust-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 't2-adjust-modal';
  overlay.style.cssText = "position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;";

  const sub = key.split(' · ')[1] || key;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:340px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.18);position:relative;">
      <button id="t2-adj-close" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#aaa;">×</button>
      <div style="font-family:'Abril Fatface',serif;font-size:18px;color:#1a2e1c;margin-bottom:4px;">${sub}</div>
      <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#7aaa88;margin-bottom:18px;">Current count: <strong id="t2-adj-current">${_t2Counts[key] || 0}</strong></div>
      <input id="t2-adj-input" type="number" placeholder="e.g. 10 or -3"
        style="width:100%;box-sizing:border-box;font-family:'Josefin Slab',serif;font-size:16px;padding:12px 14px;border:1.5px solid #c2e8b8;border-radius:8px;outline:none;color:#1a2e1c;margin-bottom:8px;" />
      <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#90a8b8;margin-bottom:18px;">Enter a positive number to add, negative to subtract.</div>
      <button id="t2-adj-confirm" style="width:100%;padding:14px;background:#2e8b57;color:#fff;border:none;border-radius:8px;font-family:'Josefin Slab',serif;font-size:15px;font-weight:700;cursor:pointer;">Apply</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const input   = document.getElementById('t2-adj-input');
  const confirm = document.getElementById('t2-adj-confirm');

  function apply() {
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val === 0) { overlay.remove(); return; }
    const newCount = Math.max(0, (_t2Counts[key] || 0) + val);
    if (newCount > 0 && !_t2StartTimes[key]) _t2StartTimes[key] = _t2LocalTimeStr();
    _t2Counts[key] = newCount;
    const el = document.getElementById('t2-count-' + CSS.escape(key));
    if (el) el.textContent = newCount;
    _t2ScheduleSave();
    updateTopCounters();
    overlay.remove();
  }

  confirm.addEventListener('click', apply);
  document.getElementById('t2-adj-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  apply();
    if (e.key === 'Escape') overlay.remove();
  });
  setTimeout(() => input.focus(), 60);
}

// ── Firebase reconnect flush ──
document.addEventListener('fbReconnected', () => {
  if (Object.keys(_t2Counts).length > 0) _t2SaveNow();
});
