// ═══════════════════════════════════════
// OPEN ORDERS
// ═══════════════════════════════════════
// Data for this tab is no longer uploaded by hand — open_orders_sync.py reads
// the LMContainers export from the network share on its own schedule and
// writes the summary straight to Firebase (`openOrders`). This tab is a pure
// live listener now; see js/app.js listenOrders() for the wiring.
// (_openOrdersData declared in state.js)

function renderOpenOrders() {
  const empty   = document.getElementById("orders-empty");
  const summary = document.getElementById("orders-summary");
  const agingEl = document.getElementById("orders-aging");
  const lastUpd = document.getElementById("orders-last-updated");

  if (!_openOrdersData) {
    if (empty) empty.style.display = "";
    if (summary) summary.innerHTML = "";
    if (agingEl) agingEl.innerHTML = "";
    return;
  }
  if (empty) empty.style.display = "none";

  const { aging, total, fbaTotal, dsTotal, regTotal, fetchedAt } = _openOrdersData;
  const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
  if (lastUpd) lastUpd.textContent = "☁ Synced · " + fetchedDate.toLocaleDateString([], {month:"short", day:"numeric"}) + " " + fetchedDate.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

  // ── Summary cards ──
  const fbaColor = fbaTotal > 0 ? "#1a6faa" : "#72a868";
  const dsColor  = dsTotal  > 0 ? "#7733aa" : "#72a868";
  const regColor = regTotal > 0 ? "#cc7722" : "#72a868";
  if (summary) {
    summary.innerHTML = [
      { label:"Total Unproduced",   val: total.toLocaleString(),    color:"#cc3333", bg:"#fff5f5", border:"#f0b8b8" },
      { label:"Drop Ship Orders",   val: dsTotal.toLocaleString(),  color:dsColor,   bg:"#faf0ff", border:"#ddbfee" },
      { label:"FBA Orders",         val: fbaTotal.toLocaleString(), color:fbaColor,  bg:"#f0f6ff", border:"#a8c8ee" },
      { label:"Reg Orders",         val: regTotal.toLocaleString(), color:regColor,  bg:"#fff8f0", border:"#f0d0a8" },
    ].map(({label,val,color,bg,border}) => `
      <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:'Josefin Slab',serif;font-size:9px;color:${color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${label}</div>
        <div style="font-family:'Abril Fatface',serif;font-size:28px;color:${color};line-height:1;">${val}</div>
      </div>`).join("");
  }

  // ── Aging buckets ──
  if (agingEl) {
    const agingColors = { "0-1 Days":["#228844","#f0fbf5","#b8e8c8"], "2-3 Days":["#aa7700","#fffbf0","#f0d8a8"], "4-7 Days":["#cc7700","#fff8f0","#f0c8a8"], "8+ Days":["#cc3333","#fff5f5","#f0b8b8"] };
    agingEl.innerHTML = Object.entries(aging).map(([label, qty]) => {
      const [color,bg,border] = agingColors[label] || ["#888","#f8f8f8","#ddd"];
      const pct = total > 0 ? Math.round(qty/total*100) : 0;
      return `
        <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px 14px;">
          <div style="font-family:'Josefin Slab',serif;font-size:9px;color:${color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${label}</div>
          <div style="font-family:'Abril Fatface',serif;font-size:26px;color:${color};line-height:1;">${qty.toLocaleString()}</div>
          <div style="background:#e0e0e0;border-radius:99px;height:4px;overflow:hidden;margin-top:8px;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;"></div>
          </div>
          <div style="font-family:'Josefin Slab',serif;font-size:9px;color:${color};margin-top:4px;">${pct}% of backlog</div>
        </div>`;
    }).join("");
  }

}


// ═══════════════════════════════════════
// TASKS READY TO CLOSE (SWMMS BATCH CLOSURE)
// ═══════════════════════════════════════
// Populated by task_closure_sync.py from the SWMS tool suite's Postgres DB.
// A task appears here once every PJ under it is 'complete' AND it has no
// unresolved exception on record, and either was never dismissed or its
// dismiss/resurface window has already passed (task_closure_tracking).
// (_readyToCloseTasks declared in state.js)

function renderReadyToCloseTasks() {
  const countEl     = document.getElementById("close-tasks-count");
  const listEl      = document.getElementById("close-tasks-list");
  const emptyEl     = document.getElementById("close-tasks-empty");
  const updEl       = document.getElementById("close-tasks-updated");
  const copyBtn     = document.getElementById("close-tasks-copy-btn");
  const machineSel  = document.getElementById("close-tasks-filter-machine");
  const pieceSel    = document.getElementById("close-tasks-filter-piece");
  const waitSel     = document.getElementById("close-tasks-filter-wait");
  if (!listEl) return;

  const data     = _readyToCloseTasks;
  const allTasks = data?.tasks || [];

  // ── Keep filter option lists in sync with whatever's actually in the data, preserving the current selection ──
  if (machineSel) {
    const machines = [...new Set(allTasks.flatMap(t => t.machines || []))].sort();
    const prev = machineSel.value;
    machineSel.innerHTML = `<option value="">All Machines</option>` + machines.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
    if (machines.includes(prev)) machineSel.value = prev;
  }
  if (pieceSel) {
    const pieceTypes = [...new Set(allTasks.map(t => t.pieceType).filter(Boolean))].sort();
    const prev = pieceSel.value;
    pieceSel.innerHTML = `<option value="">All Piece Types</option>` + pieceTypes.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
    if (pieceTypes.includes(prev)) pieceSel.value = prev;
  }

  const machineFilter = machineSel?.value || "";
  const pieceFilter   = pieceSel?.value || "";
  const maxWaitMs     = Number(waitSel?.value || 0) * 3600000;

  // Wait filter is "this recent or newer" (excludes older stale/dummy tasks),
  // not a minimum threshold — a task with no firstReadyAt can't be aged, so
  // it's excluded whenever a max-wait filter is active.
  const now = Date.now();
  const tasks = allTasks.filter(t => {
    if (machineFilter && !(t.machines || []).includes(machineFilter)) return false;
    if (pieceFilter && t.pieceType !== pieceFilter) return false;
    if (maxWaitMs > 0) {
      if (!t.firstReadyAt) return false;
      const readyMs = now - new Date(t.firstReadyAt).getTime();
      if (readyMs > maxWaitMs) return false;
    }
    return true;
  });
  _closeTasksFiltered = tasks; // Copy Task List copies exactly this filtered set

  const filtered = tasks.length !== allTasks.length;
  if (countEl) countEl.textContent = tasks.length.toLocaleString() + (filtered ? ` of ${allTasks.length}` : "");
  if (copyBtn) copyBtn.disabled = tasks.length === 0;

  if (updEl) {
    if (data?.updatedAt) {
      const d = new Date(data.updatedAt);
      updEl.textContent = "☁ Synced · " + d.toLocaleDateString([], {month:"short", day:"numeric"}) + " " + d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    } else {
      updEl.textContent = "";
    }
  }

  if (tasks.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) { emptyEl.style.display = ""; emptyEl.textContent = allTasks.length === 0 ? "No tasks ready to close right now." : "No tasks match the current filters."; }
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  listEl.innerHTML = tasks.map(t => {
    const readyMs = t.firstReadyAt ? now - new Date(t.firstReadyAt).getTime() : null;
    const waitLabel = readyMs == null ? "" :
      readyMs < 3600000  ? Math.max(1, Math.round(readyMs/60000)) + "m waiting" :
      readyMs < 86400000 ? Math.round(readyMs/3600000) + "h waiting" :
                            Math.round(readyMs/86400000) + "d waiting";
    const machineLabel = (t.machines || []).join(", ");
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #c2e8b8;border-radius:8px;padding:8px 14px;">
        <span style="font-family:'Josefin Slab',serif;font-size:13px;color:#1a2a18;font-weight:700;">${esc(t.taskId)}</span>
        <div style="display:flex;gap:14px;align-items:center;">
          ${t.pieceType ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#336644;">${esc(t.pieceType)}</span>` : ""}
          ${machineLabel ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#4a7a5a;">${esc(machineLabel)}</span>` : ""}
          <span style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#4a7a5a;">${t.pjCount || 1} PJ${(t.pjCount||1) === 1 ? "" : "s"}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#996600;">${waitLabel}</span>
        </div>
      </div>`;
  }).join("");
}

function copyReadyToCloseTasks() {
  const tasks = _closeTasksFiltered || [];
  if (tasks.length === 0) return;
  const text = tasks.map(t => t.taskId).join("\n");
  const btn = document.getElementById("close-tasks-copy-btn");
  navigator.clipboard.writeText(text).then(() => {
    if (btn) { const orig = btn.textContent; btn.textContent = "✓ Copied " + tasks.length; setTimeout(() => btn.textContent = orig, 2000); }
  }).catch(() => {
    if (btn) { const orig = btn.textContent; btn.textContent = "✗ Copy failed"; setTimeout(() => btn.textContent = orig, 2000); }
  });
}
