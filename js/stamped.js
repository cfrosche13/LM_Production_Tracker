// ═══════════════════════════════════════
// STAMPED TAB
// ═══════════════════════════════════════
// (stSec, stRunning, stPaused, stInterval, stStartWall, stTally, stMisprint declared in state.js)

function stPopulatePieceSelect() {
  const sel = document.getElementById('st-piece-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  (PIECE_TYPES["Wallets"] || []).forEach(t => {
    const o = document.createElement('option');
    o.value = o.textContent = t;
    sel.appendChild(o);
  });
  if (current && PIECE_TYPES["Wallets"]?.includes(current)) sel.value = current;
  const gs = document.getElementById('global-subtype');
  if (gs && sel.value) gs.value = sel.value;
  stPopulateMisprintSelect();
}

function stPopulateMisprintSelect() {
  const sel = document.getElementById('st-misprint-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  (PIECE_TYPES["Wallets"] || []).forEach(t => {
    const o = document.createElement('option');
    o.value = o.textContent = t;
    sel.appendChild(o);
  });
  if (current && PIECE_TYPES["Wallets"]?.includes(current)) sel.value = current;
}

function stUpdatePieceLabel() {
  const sel = document.getElementById('st-piece-select');
  const gs  = document.getElementById('global-subtype');
  if (sel && gs) gs.value = sel.value;
}

function stStart() {
  if (stRunning) return;
  stRunning = true;
  stPaused  = false;
  document.getElementById('st-start-btn').disabled = true;
  document.getElementById('st-start-btn').style.opacity = '0.4';
  document.getElementById('st-stop-btn').disabled = false;
  document.getElementById('st-timer-display').style.color = '#7733aa';
  stUpdatePieceLabel();
  stStartWall = Date.now();
  stInterval = setInterval(() => {
    stSec = Math.floor((Date.now() - stStartWall) / 1000);
    const m = String(Math.floor(stSec / 60)).padStart(2, '0');
    const s = String(stSec % 60).padStart(2, '0');
    document.getElementById('st-timer-display').textContent = m + ':' + s;
  }, 500);
}

function stSaveAndReset() {
  // Save current tally regardless of whether timer was running
  if (stTally === 0 && stMisprint === 0) return; // nothing to save
  const sub    = (document.getElementById('st-piece-select')?.value || document.getElementById('global-subtype').value || '').trim();
  const mSub   = (document.getElementById('st-misprint-select')?.value || sub).trim();
  const cat    = (document.getElementById('global-category').value || 'Wallets').trim();
  const op     = (document.getElementById('global-operator').value || '—').trim();
  const pieceType = cat + ' · ' + sub;
  const misprintNote = stMisprint > 0 && mSub !== sub ? `Misprints: ${stMisprint}x ${mSub}` : '';
  const session = {
    mode: 'stamped', totalSec: stSec, changeovers: 0,
    qtyGood: stTally, qtyBad: stMisprint, notes: misprintNote,
    pieceType, op, time: new Date().toISOString()
  };
  if (!machineReports['Wallets']) machineReports['Wallets'] = [];
  machineReports['Wallets'].push({ ...session, time: new Date() });
  if (window._fb) window._fb.saveSession('Wallets', session);
  localSaveSession('Wallets', session);
  updateTopCounters();
  stAddLogEntry({ ...session, time: new Date() });
  // Reset state
  stSec = 0; stTally = 0; stMisprint = 0;
  document.getElementById('st-timer-display').textContent = '00:00';
  document.getElementById('st-tally').value = 0;
  document.getElementById('st-misprint').value = 0;
}

function stCancel() {
  clearInterval(stInterval);
  stRunning = false; stSec = 0; stStartWall = 0; stTally = 0; stMisprint = 0;
  document.getElementById("st-start-btn").disabled = false;
  document.getElementById("st-start-btn").style.opacity = "";
  document.getElementById("st-stop-btn").disabled = true;
  document.getElementById("st-timer-display").textContent = "00:00";
  document.getElementById("st-timer-display").style.color = "#c0a0d8";
  document.getElementById("st-tally").value = 0;
  document.getElementById("st-misprint").value = 0;
}

function stStop() {
  if (!stRunning) return;
  clearInterval(stInterval);
  stRunning = false;
  document.getElementById('st-start-btn').disabled = false;
  document.getElementById('st-start-btn').style.opacity = '';
  document.getElementById('st-stop-btn').disabled = true;
  document.getElementById('st-timer-display').style.color = '#c0a0d8';
  stSaveAndReset();
}

function stTallyInc() {
  stTally++;
  const el = document.getElementById('st-tally');
  el.value = stTally;
  el.style.transform = 'scale(1.12)';
  el.style.transition = 'transform 0.1s';
  setTimeout(() => { el.style.transform = ''; }, 120);

  // Log individual tally event to machineEvents for per-click PPH calculation
  const sub     = (document.getElementById('st-piece-select')?.value || document.getElementById('global-subtype')?.value || '').trim();
  const cat     = (document.getElementById('global-category')?.value || 'Wallets').trim();
  const op      = (document.getElementById('global-operator')?.value || '—').trim();
  const pieceType = cat + ' · ' + sub;
  const now     = new Date().toISOString();
  const tallyEvent = {
    category: 'tally',
    type: 'Tally Run',
    time: now,
    detail: pieceType + ' · ' + stTally + ' pcs',
    color: '#e8457a',
    notes: '',
    op,
    pieceType,
    qty: stTally,
    runningTotal: stTally
  };
  if (window._fb) window._fb.saveMachineEvent('Wallets', tallyEvent);
}

function stTallyDec() {
  if (stTally > 0) stTally--;
  document.getElementById('st-tally').value = stTally;
}

function stMisprintInc() {
  stMisprint++;
  const el = document.getElementById('st-misprint');
  el.value = stMisprint;
  el.style.transform = 'scale(1.12)';
  el.style.transition = 'transform 0.1s';
  setTimeout(() => { el.style.transform = ''; }, 120);

  // Log individual spoilage event to machineEvents
  const sub     = (document.getElementById('st-piece-select')?.value || document.getElementById('global-subtype')?.value || '').trim();
  const cat     = (document.getElementById('global-category')?.value || 'Wallets').trim();
  const op      = (document.getElementById('global-operator')?.value || '—').trim();
  const pieceType = cat + ' · ' + sub;
  const now     = new Date().toISOString();
  const spoilageEvent = {
    category: 'tally',
    type: 'Spoilage',
    time: now,
    detail: stMisprint + ' wasted piece(s)',
    color: '#cc3333',
    qty: stMisprint,
    pieceType,
    op
  };
  if (window._fb) window._fb.saveMachineEvent('Wallets', spoilageEvent);
}

function stMisprintDec() {
  if (stMisprint > 0) stMisprint--;
  document.getElementById('st-misprint').value = stMisprint;
}

function stAddLogEntry(session) {
  const list = document.getElementById('st-log-list');
  const empty = list.querySelector('.empty-log');
  if (empty) empty.remove();
  const d = session.time instanceof Date ? session.time : new Date(session.time);
  const entry = document.createElement('div');
  entry.className = 'run-log-entry';
  entry.style.cssText = 'border-left-color:#7733aa;';
  entry.innerHTML = `
    <span class="run-log-type" style="color:#7733aa;">${session.pieceType.split(' · ')[1] || session.pieceType}</span>
    <span class="run-log-time">${fmt(session.totalSec)}</span>
    <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#228844;margin-left:8px;">✓ ${session.qtyGood}</span>
    ${session.qtyBad > 0 ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#cc3333;margin-left:6px;">✗ ${session.qtyBad}</span>` : ''}
    <span class="log-time" style="margin-left:8px;">${fmtDate(d)}</span>
  `;
  list.prepend(entry);
}

