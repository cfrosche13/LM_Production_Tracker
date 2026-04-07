function switchReportsTab(tab) {
  const isOEE = tab === 'oee';
  document.getElementById("oee-panel").style.display         = isOEE ? "" : "none";
  document.getElementById("reports-grid-scroll").style.display = isOEE ? "none" : "";
  document.getElementById("reports-empty").style.display       = "none";
  document.getElementById("hourly-chart-wrap").style.display   = "none";
  document.getElementById("btn-tab-oee").style.display        = isOEE ? "none" : "";
  document.getElementById("btn-tab-production").style.display  = isOEE ? "" : "none";
  if (isOEE) renderOEEPanel();
}

function renderOEEPanel() {
  const body = document.getElementById("oee-panel-body");
  if (!body) return;
  body.innerHTML = "";

  // Date range from existing report filters
  const fromEl = document.getElementById("report-date-from");
  const toEl   = document.getElementById("report-date-to");
  const fromStr = fromEl?.value || localDateStr(new Date());
  const toStr   = toEl?.value   || localDateStr(new Date());

  // Build list of dates in range
  const dates = [];
  let cur = new Date(fromStr + "T00:00:00");
  const end = new Date(toStr   + "T00:00:00");
  while (cur <= end) {
    dates.push(localDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }

  MACHINES.forEach(machine => {
    const machineData = dates.map(d => ({ date: d, oee: calcOEE(machine, d) })).filter(d => d.oee);
    if (!machineData.length) return;

    const avgOEE   = Math.round(machineData.reduce((s,d) => s + d.oee.oee,          0) / machineData.length);
    const avgAvail = Math.round(machineData.reduce((s,d) => s + d.oee.availability,  0) / machineData.length);
    const avgPerf  = Math.round(machineData.reduce((s,d) => s + d.oee.performance,   0) / machineData.length);
    const avgQual  = Math.round(machineData.reduce((s,d) => s + d.oee.quality,       0) / machineData.length);
    const clr = oeeColor(avgOEE);

    const card = document.createElement("div");
    card.style.cssText = "background:#fff;border:1px solid #e0ddf8;border-radius:14px;padding:18px 20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(80,60,160,0.07);";

    // Header
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Abril Fatface',serif;font-size:20px;color:#1a1a2e;">${machine}</div>
        <div style="text-align:right;">
          <div style="font-family:'Abril Fatface',serif;font-size:36px;color:${clr.text};line-height:1;">${avgOEE}%</div>
          <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;">Avg OEE</div>
        </div>
      </div>
      <!-- OEE bar -->
      <div style="background:#eee;border-radius:99px;height:10px;overflow:hidden;margin-bottom:14px;">
        <div style="height:100%;width:${avgOEE}%;background:${clr.bar};border-radius:99px;transition:width 0.5s;"></div>
      </div>
      <!-- A · P · Q breakdown -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        ${[["Availability", avgAvail, "#336688"],["Performance", avgPerf, "#aa7700"],["Quality", avgQual, "#228844"]].map(([label,val,col]) => `
          <div style="text-align:center;background:#f8f8ff;border:1px solid #e8e4f8;border-radius:8px;padding:10px 6px;">
            <div style="font-family:'Josefin Slab',serif;font-size:8px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${label}</div>
            <div style="font-family:'Abril Fatface',serif;font-size:24px;color:${col};">${val}%</div>
          </div>`).join("")}
      </div>`;

    // Per-day breakdown table (if multiple dates)
    if (machineData.length > 1) {
      const tableWrap = document.createElement("div");
      tableWrap.style.cssText = "border-top:1px solid #f0eef8;padding-top:12px;";
      tableWrap.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:9px;color:#b090c8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Daily Breakdown</div>`;
      machineData.forEach(({date, oee: o}) => {
        const dc = oeeColor(o.oee);
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f8f5ff;";
        row.innerHTML = `
          <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#888;min-width:80px;">${date}</span>
          <div style="flex:1;background:#eee;border-radius:99px;height:6px;overflow:hidden;">
            <div style="height:100%;width:${o.oee}%;background:${dc.bar};border-radius:99px;"></div>
          </div>
          <span style="font-family:'Abril Fatface',serif;font-size:14px;color:${dc.text};min-width:42px;text-align:right;">${o.oee}%</span>
          <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#b0b8c8;min-width:100px;">A:${o.availability}% P:${o.performance}% Q:${o.quality}%</span>
          ${o.downEvents ? `<span style="font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;color:#cc2222;background:#fff5f5;border:1px solid #f0b8b8;border-radius:4px;padding:2px 6px;">⬇ Down</span>` : ""}
        `;
        tableWrap.appendChild(row);
      });
      card.appendChild(tableWrap);
    }

    body.appendChild(card);
  });

  if (!body.children.length) {
    body.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:13px;color:#bbb;text-align:center;padding:40px;">No production data in this date range to calculate OEE.</div>`;
  }
}

function renderDefectSummary() {
  const defRows  = document.getElementById("defect-summary-rows");
  const badRows  = document.getElementById("bad-qty-summary-rows");
  if (!defRows || !badRows) return;

  // ── Column 1: Defective Raw Material totals by piece type ──
  const defTotals = {};
  maintLog.forEach(e => {
    if (e.type !== "Defective Material") return;
    if (!qrInRange(e.time)) return;
    const countMatch = (e.detail || "").match(/Count:\s*(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : 0;
    if (!count) return;
    const pieceMatch = (e.detail || "").match(/·\s*(.+)$/);
    const key = pieceMatch ? pieceMatch[1].trim() : "Unspecified";
    defTotals[key] = (defTotals[key] || 0) + count;
  });

  // ── Column 2: Bad Qty by piece type, with operators ──
  // Gather from all machine sessions: { pieceType -> { total, ops: {opName -> count} } }
  const badTotals = {};
  Object.values(machineReports).forEach(sessions => {
    sessions.forEach(s => {
      if (!s.qtyBad) return;
      if (!qrInRange(s.time)) return;
      const key = s.pieceType || "Unknown";
      if (!badTotals[key]) badTotals[key] = { total: 0, ops: {} };
      badTotals[key].total += s.qtyBad;
      const op = s.op || "—";
      badTotals[key].ops[op] = (badTotals[key].ops[op] || 0) + s.qtyBad;
    });
  });

  const hasDefects = Object.keys(defTotals).length > 0;
  const hasBad     = Object.keys(badTotals).length > 0;

  // Render defect column
  defRows.innerHTML = "";
  if (!hasDefects) {
    defRows.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#c090c0;font-style:italic;">None logged</div>`;
  } else {
    const grandTotal = Object.values(defTotals).reduce((a, b) => a + b, 0);
    const grand = document.createElement("div");
    grand.style.cssText = "display:flex;justify-content:space-between;padding:3px 0 7px;border-bottom:1px solid #ddbfee;margin-bottom:6px;";
    grand.innerHTML = `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#7733aa;font-weight:700;">Total</span><span style="font-family:'Abril Fatface',serif;font-size:18px;color:#aa55cc;">${grandTotal}</span>`;
    defRows.appendChild(grand);
    Object.entries(defTotals).forEach(([key, count]) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #f0e0ff;";
      row.innerHTML = `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#8844bb;">${key}</span><span style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;color:#aa55cc;">${count}</span>`;
      defRows.appendChild(row);
    });
  }

  // Render bad qty column
  badRows.innerHTML = "";
  if (!hasBad) {
    badRows.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:11px;color:#e0a0a0;font-style:italic;">None logged</div>`;
  } else {
    const grandBad = Object.values(badTotals).reduce((a, b) => a + b.total, 0);
    const grand = document.createElement("div");
    grand.style.cssText = "display:flex;justify-content:space-between;padding:3px 0 7px;border-bottom:1px solid #f0c0c0;margin-bottom:6px;";
    grand.innerHTML = `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#aa2222;font-weight:700;">Total</span><span style="font-family:'Abril Fatface',serif;font-size:18px;color:#cc3333;">${grandBad}</span>`;
    badRows.appendChild(grand);
    Object.entries(badTotals).forEach(([key, data]) => {
      const row = document.createElement("div");
      row.style.cssText = "padding:3px 0 4px;border-bottom:1px solid #ffe0e0;";
      const opList = Object.entries(data.ops).map(([op, n]) =>
        `<span style="background:#fff0f0;border:1px solid #f0c0c0;border-radius:3px;padding:1px 6px;font-size:10px;color:#cc4444;">${op}: ${n}</span>`
      ).join(" ");
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#bb3333;">${key}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;color:#cc3333;">${data.total}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;font-family:'Josefin Slab',serif;">${opList}</div>
      `;
      badRows.appendChild(row);
    });
  }
}


function qrSetRange(range) {
  const t = new Date();
  const pad = n => String(n).padStart(2,"0");
  const fmt = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const customInputs = document.getElementById("qr-custom-inputs");

  if (range === 'custom') {
    // Show custom inputs, pre-fill with today if empty
    if (customInputs) customInputs.style.display = "flex";
    const fromEl = document.getElementById("qr-date-from");
    const toEl   = document.getElementById("qr-date-to");
    if (!fromEl.value) fromEl.value = fmt(t);
    if (!toEl.value)   toEl.value   = fmt(t);
  } else {
    if (customInputs) customInputs.style.display = "none";
    let from, to;
    if (range === 'today') {
      from = to = fmt(t);
    } else if (range === 'yesterday') {
      const y = new Date(t);
      y.setDate(t.getDate() - 1);
      from = to = fmt(y);
    } else if (range === 'week') {
      // Last week: Monday–Sunday of the previous calendar week
      const dayOfWeek = t.getDay(); // 0=Sun,1=Mon...6=Sat
      const lastSun = new Date(t);
      lastSun.setDate(t.getDate() - dayOfWeek);
      const lastMon = new Date(lastSun);
      lastMon.setDate(lastSun.getDate() - 6);
      from = fmt(lastMon);
      to   = fmt(lastSun);
    } else if (range === 'month') {
      from = t.getFullYear()+"-"+pad(t.getMonth()+1)+"-01";
      to   = fmt(t);
    }
    document.getElementById("qr-date-from").value = from;
    document.getElementById("qr-date-to").value   = to;
    renderDefectSummary();
  }

  // Update button active states
  ["today","yesterday","week","month","custom"].forEach(r => {
    const btn = document.getElementById("qr-btn-"+r);
    if (!btn) return;
    const active = r === range;
    btn.style.background = active ? "#7733aa" : "transparent";
    btn.style.color      = active ? "#fff"    : "#aa55cc";
  });
}

function qrSetToday() { qrSetRange('today'); }


function qrInRange(dateVal) {
  if (!dateVal) return true;
  const from = document.getElementById("qr-date-from")?.value;
  const to   = document.getElementById("qr-date-to")?.value;
  const ds = localDateStr(dateVal);
  if (from && ds < from) return false;
  if (to   && ds > to)   return false;
  return true;
}


function goToQualityReport() {
  document.getElementById("reports-section").style.display = "none";
  document.getElementById("quality-report-section").style.display = "block";
  qrSetRange("today");
}




function renderReports() {
  const grid = document.getElementById("reports-grid");
  const empty = document.getElementById("reports-empty");
  const allMachines = [...MACHINES, ...Object.keys(machineEvents), ...Object.keys(machineReports)].filter((v,i,a)=>a.indexOf(v)===i);

  // Filter to selected date range
  const todaySessions = {};
  const todayEvents   = {};
  allMachines.forEach(m => {
    todaySessions[m] = (machineReports[m] || []).filter(s => isInDateRange(s.time));
    todayEvents[m]   = (machineEvents[m]  || []).filter(e => isInDateRange(e.time));
  });

  const machinesWithData = allMachines.filter(m => todaySessions[m]?.length > 0 || todayEvents[m]?.length > 0);

  if (machinesWithData.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    const from = document.getElementById("report-date-from")?.value;
    const to   = document.getElementById("report-date-to")?.value;
    empty.textContent = from || to ? "No production data for this date range." : "No production data yet — complete a run to see reports.";
    renderHourlyChart(todaySessions);
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = "";
  // Update label
  const dateEl = document.getElementById("report-date-label");
  if (dateEl) {
    const from = document.getElementById("report-date-from")?.value;
    const to   = document.getElementById("report-date-to")?.value;
    if (from && to && from === to) {
      dateEl.textContent = new Date(from + "T12:00:00").toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"});
    } else if (from && to) {
      dateEl.textContent = new Date(from + "T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric"}) + " – " + new Date(to + "T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric"});
    } else {
      dateEl.textContent = "";
    }
  }

  machinesWithData.forEach(machine => {
    const sessions = todaySessions[machine] || [];
    const eventsForMachine = todayEvents[machine] || [];
    const totalSec = sessions.reduce((s, r) => s + r.totalSec, 0);
    const totalChangeovers = sessions.reduce((s, r) => s + r.changeovers, 0);
    const totalGood = sessions.reduce((s, r) => s + (r.qtyGood || 0), 0);
    const totalBad  = sessions.reduce((s, r) => s + (r.qtyBad  || 0), 0);
    const editing = reportEditMode.has(machine);

    const card = document.createElement("div");
    card.className = "report-card";
    card.style.cursor = "pointer";
    card.addEventListener("click", function(e) {
      // Don't open if clicking the edit button, a select, or an input
      if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) return;
      openCardDetail(machine);
    });
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        ${(() => {
          const today = new Date().toISOString().split('T')[0];
          const todayStr = localDateStr(new Date());
          const oeeData = calcOEE(machine, todayStr);
          if (oeeData && oeeData.oee > 0) {
            const oc = oeeColor(oeeData.oee);
            return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
              <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8b8;text-transform:uppercase;letter-spacing:0.08em;">Today OEE</span>
              <span style="font-family:'Abril Fatface',serif;font-size:18px;color:${oc.text};">${oeeData.oee}%</span>
              <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#b0b8c8;">A:${oeeData.availability}% · P:${oeeData.performance}% · Q:${oeeData.quality}%</span>
            </div>`;
          }
          return '';
        })()}
        ${(editing && machine === 'Unassigned') ? `
          <select onchange="reassignMachine('Unassigned', this.value)"
            style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;color:#e8457a;background:#fff5f8;border:1px solid #f0c8d8;border-radius:6px;padding:3px 8px;cursor:pointer;outline:none;">
            <option value="">— Assign Machine —</option>
            ${MACHINES.map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        ` : `<div class="report-machine-name" style="margin-bottom:0;">${machine}</div>`}
        <div style="display:flex;gap:6px;align-items:center;">
          <button onclick="toggleReportEdit('${machine}')" style="font-family:'Josefin Slab',serif;font-size:10px;padding:4px 12px;border-radius:4px;border:1px solid;cursor:pointer;letter-spacing:0.08em;background:${editing ? '#228844' : '#f5f0ff'};color:${editing ? '#fff' : '#7755cc'};border-color:${editing ? '#228844' : '#c8b8ee'};">${editing ? '✓ Done' : '✎ Edit'}</button>
          ${machine === 'Unassigned' ? `<button onclick="deleteUnassignedCard(event)" style="font-family:'Josefin Slab',serif;font-size:10px;padding:4px 12px;border-radius:4px;border:1px solid #f0c0c0;cursor:pointer;letter-spacing:0.08em;background:#fff0f0;color:#cc3333;">✕ Delete</button>` : ''}
        </div>
      </div>
      <div class="report-metrics">
        <div class="report-metric">
          <span class="report-metric-label">Total Run Time</span>
          <span class="report-metric-value" style="font-size:22px;">${fmt(totalSec)}</span>
        </div>
        <div class="report-metric">
          <span class="report-metric-label">Total Tables</span>
          <span class="report-metric-value">${totalChangeovers}</span>
        </div>
        <div style="display:flex;gap:12px;">
          <div class="report-metric" style="flex:1;">
            <span class="report-metric-label">Qty Good</span>
            <span class="report-metric-value" style="color:#228844;">${totalGood}</span>
          </div>
          <div class="report-metric" style="flex:1;">
            <span class="report-metric-label">Qty Bad</span>
            <span class="report-metric-value" style="color:#cc3333;">${totalBad}</span>
          </div>
        </div>
      </div>
      <div data-orders-machine="${machine}"></div>
      ${(eventsForMachine?.length) ? `
      <div class="report-sessions">
        <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#a0a0c0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Events (${eventsForMachine.length})</div>
        <div data-events-machine="${machine}"></div>
      </div>` : ""}
    `;
    grid.appendChild(card);

    // Build the printed vs open orders bar outside the template literal
    const ordersSlot = card.querySelector('[data-orders-machine="' + machine + '"]');
    if (ordersSlot) {
      const pieceTypes = [...new Set(sessions.map(function(s){ return s.pieceType; }).filter(Boolean))];
      const openQty = _openOrdersData && _openOrdersData.byType
        ? pieceTypes.reduce(function(sum, pt){ return sum + (_openOrdersData.byType[pt] || 0); }, 0)
        : 0;

      var ordersHTML = '<div style="border-top:1px solid #fde0ea;padding-top:10px;">';
      ordersHTML += '<div style="font-family:\'Josefin Slab\',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">vs Open Orders</div>';

      if (!_openOrdersData || !_openOrdersData.byType) {
        ordersHTML += '<div style="font-family:\'Josefin Slab\',serif;font-size:11px;color:#e0c0d0;font-style:italic;">No order data — drop file in Open Orders tab</div>';
      } else if (openQty === 0) {
        ordersHTML += '<div style="font-family:\'Josefin Slab\',serif;font-size:11px;color:#e0c0d0;font-style:italic;">No open orders for these piece types</div>';
      } else {
        var pct       = Math.min(100, Math.round(totalGood / openQty * 100));
        var barColor  = pct >= 80 ? "#228844" : pct >= 50 ? "#aa7700" : "#e8457a";
        var bgColor   = pct >= 80 ? "#f0fbf5" : pct >= 50 ? "#fffbf0" : "#fff5f8";
        var bdrColor  = pct >= 80 ? "#b8e8c8" : pct >= 50 ? "#f0d8a8" : "#f0c8d8";
        var ptLabel   = pieceTypes.length > 0 ? '<div style="font-family:\'Josefin Slab\',serif;font-size:9px;color:#c090a8;margin-top:5px;line-height:1.4;">' + pieceTypes.join(' · ') + '</div>' : '';
        ordersHTML += '<div style="background:' + bgColor + ';border:1px solid ' + bdrColor + ';border-radius:8px;padding:10px 12px;">';
        ordersHTML += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">';
        ordersHTML += '<span style="font-family:\'Josefin Slab\',serif;font-size:11px;color:#c090a8;"><span style="color:#228844;font-weight:700;">' + totalGood.toLocaleString() + '</span> printed &nbsp;/&nbsp; <span style="color:#cc3333;font-weight:700;">' + openQty.toLocaleString() + '</span> open</span>';
        ordersHTML += '<span style="font-family:\'Abril Fatface\',serif;font-size:20px;color:' + barColor + ';">' + pct + '%</span>';
        ordersHTML += '</div>';
        ordersHTML += '<div style="background:#e8e0ec;border-radius:99px;height:8px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:99px;transition:width 0.5s;"></div></div>';
        ordersHTML += ptLabel + '</div>';
      }
      ordersHTML += '</div>';
      ordersSlot.innerHTML = ordersHTML;
    }

    // Events
    if (eventsForMachine?.length) {
      const evDiv = card.querySelector(`[data-events-machine="${machine}"]`);
      eventsForMachine.forEach((e, idx) => {
        const row = document.createElement("div");
        row.style.cssText = "padding:6px 0;border-bottom:1px solid #f0eef8;display:flex;flex-direction:column;gap:4px;";
        const header = document.createElement("div");
        header.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:6px;";
        header.innerHTML=`
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:7px;height:7px;border-radius:50%;background:${e.color};flex-shrink:0;"></div>
            <span style="font-family:'Josefin Slab',serif;font-size:11px;color:${e.color};font-weight:700;">${e.type}</span>
          </div>
          <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#b8b8cc;">${fmtDate(e.time)}</span>`;
        row.appendChild(header);
        if (editing) {
          const detInp = document.createElement("input");
          detInp.value=e.detail||""; detInp.placeholder="Detail...";
          detInp.style.cssText="font-family:'Josefin Slab',serif;font-size:11px;color:#606080;background:#f8f8fc;border:1px solid #e0dff0;border-radius:4px;padding:4px 8px;outline:none;width:100%;";
          detInp.onchange=()=>updateEvent(machine,idx,'detail',detInp.value);
          const noteTa = document.createElement("textarea");
          noteTa.placeholder="Notes..."; noteTa.textContent=e.notes||"";
          noteTa.style.cssText="font-family:'Josefin Slab',serif;font-size:11px;color:#a090b0;font-style:italic;background:#f8f8fc;border:1px solid #e0dff0;border-radius:4px;padding:4px 8px;outline:none;width:100%;resize:vertical;min-height:40px;";
          noteTa.onchange=()=>updateEvent(machine,idx,'notes',noteTa.value);
          row.appendChild(detInp);
          row.appendChild(noteTa);
        } else {
          if (e.detail) {
            const d = document.createElement("div");
            d.style.cssText="font-family:'Josefin Slab',serif;font-size:11px;color:#a0a0b8;padding-left:13px;";
            d.textContent=e.detail; row.appendChild(d);
          }
          if (e.notes) {
            const n = document.createElement("div");
            n.style.cssText="font-family:'Josefin Slab',serif;font-size:11px;color:#a090b0;font-style:italic;padding-left:13px;";
            n.textContent=e.notes; row.appendChild(n);
          }
        }
        evDiv.appendChild(row);
      });
    }
  });

  // Set scroll container to show exactly 2 rows of cards
  // and cap each sessions list to 10 visible items
  requestAnimationFrame(() => {
    const scroll = document.getElementById("reports-grid-scroll");

    // Cap session/event inner lists to 10 visible items
    document.querySelectorAll("[data-sessions-machine],[data-events-machine]").forEach(sessDiv => {
      const children = Array.from(sessDiv.children);
      if (children.length > 10) {
        let h = 0;
        children.slice(0, 10).forEach(c => { h += c.offsetHeight + 4; });
        sessDiv.style.maxHeight = h + "px";
        sessDiv.style.overflowY = "auto";
        sessDiv.style.scrollbarWidth = "thin";
        sessDiv.style.scrollbarColor = "#f0c8d8 #fff5f8";
      }
    });

    // Set grid scroll to 2 card rows
    const firstCard = scroll?.querySelector(".report-card");
    if (scroll && firstCard) {
      const cardH = firstCard.offsetHeight;
      scroll.style.maxHeight = (cardH * 2 + 14) + "px";
    }
  });

  // Render hourly chart with filtered sessions
  renderHourlyChart(todaySessions);
  updateTopCounters();
}

// (_cdmMachine declared in state.js)

function cdmSwitchTab(tab) {
  const summary = document.getElementById("cdm-body");
  const edit    = document.getElementById("cdm-edit-body");
  const tSum    = document.getElementById("cdm-tab-summary");
  const tEdit   = document.getElementById("cdm-tab-edit");
  if (tab === 'summary') {
    summary.style.display = ""; edit.style.display = "none";
    tSum.style.color = "#e8457a"; tSum.style.borderBottomColor = "#e8457a";
    tEdit.style.color = "#c090a8"; tEdit.style.borderBottomColor = "transparent";
  } else {
    summary.style.display = "none"; edit.style.display = "";
    tEdit.style.color = "#e8457a"; tEdit.style.borderBottomColor = "#e8457a";
    tSum.style.color = "#c090a8"; tSum.style.borderBottomColor = "transparent";
    cdmRenderEdit();
  }
}


function cdmRenderEdit() {
  const machine = _cdmMachine;
  const container = document.getElementById("cdm-edit-body");
  if (!container || !machine) return;
  const sessions = (machineReports[machine] || []).filter(s => isInDateRange(s.time));
  const allSessions = machineReports[machine] || [];
  const keys = window._sessionKeys?.[machine] || [];

  container.innerHTML = "";

  if (sessions.length === 0) {
    container.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:13px;color:#c090a8;text-align:center;padding:40px 0;">No sessions in this date range.</div>`;
    return;
  }

  // Header note
  const note = document.createElement("div");
  note.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #fde0ea;";
  note.textContent = `${sessions.length} session${sessions.length !== 1 ? "s" : ""} in selected date range`;
  container.appendChild(note);

  // Sort by time descending
  const sorted = [...sessions].sort((a, b) => new Date(b.time) - new Date(a.time));

  sorted.forEach(s => {
    // Find real index in allSessions to get Firebase key
    const realIdx = allSessions.findIndex(x =>
      x.time?.toISOString?.() === s.time?.toISOString?.() &&
      x.pieceType === s.pieceType && x.qtyGood === s.qtyGood
    );
    const fbKey = keys[realIdx] || null;

    const d = s.time instanceof Date ? s.time : new Date(s.time);
    const timeStr = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    const dateStr = d.toLocaleDateString("en-US", {month:"short", day:"numeric"});

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;margin-bottom:6px;background:#fff5f8;border:1px solid #fde0ea;gap:12px;";

    const info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0;";
    info.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
        <span style="font-family:'Josefin Slab',serif;font-size:12px;color:#3a2a38;font-weight:700;">${s.pieceType || "—"}</span>
        <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;">${dateStr} ${timeStr}</span>
        ${s.op ? `<span style="font-family:'Josefin Slab',serif;font-size:10px;color:#a090b8;">${s.op}</span>` : ""}
      </div>
      <div style="display:flex;gap:12px;margin-top:3px;">
        <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#228844;">✓ ${s.qtyGood || 0}</span>
        ${s.qtyBad ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#cc3333;">✗ ${s.qtyBad}</span>` : ""}
        ${s.totalSec ? `<span style="font-family:'Josefin Slab',serif;font-size:11px;color:#a090b8;">${fmt(s.totalSec)}</span>` : ""}
      </div>
    `;

    const delBtn = document.createElement("button");
    delBtn.innerHTML = "✕ Delete";
    delBtn.style.cssText = "font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;background:#fff0f0;color:#cc3333;border:1px solid #f0c0c0;border-radius:6px;padding:6px 12px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.15s;";
    delBtn.onmouseenter = () => { delBtn.style.background = "#cc3333"; delBtn.style.color = "#fff"; };
    delBtn.onmouseleave = () => { delBtn.style.background = "#fff0f0"; delBtn.style.color = "#cc3333"; };
    delBtn.onclick = () => {
      if (!confirm("Delete this session? This cannot be undone.")) return;
      if (fbKey && window._fb) {
        window._fb.deleteSession(machine, fbKey);
        // Firebase listener will re-render
      } else {
        // Local only fallback
        if (realIdx !== -1) {
          machineReports[machine].splice(realIdx, 1);
          renderReports();
        }
      }
      cdmRenderEdit();
    };

    row.appendChild(info);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}


function openCardDetail(machine) {
  _cdmMachine = machine;
  // Reset to summary tab
  cdmSwitchTab('summary');
  const sessions = (machineReports[machine] || []).filter(s => isInDateRange(s.time));
  const events   = (machineEvents[machine]  || []).filter(e => isInDateRange(e.time));

  // Header date label
  document.getElementById("cdm-machine").textContent = machine;
  const from = document.getElementById("report-date-from")?.value;
  const to   = document.getElementById("report-date-to")?.value;
  let dateLabel = "";
  if (from && to && from === to) {
    dateLabel = new Date(from + "T12:00:00").toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"});
  } else if (from && to) {
    dateLabel = new Date(from + "T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric"})
              + " \u2013 " + new Date(to + "T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric"});
  }
  document.getElementById("cdm-date").textContent = dateLabel;

  // Totals
  const totalGood = sessions.reduce((s, r) => s + (r.qtyGood || 0), 0);
  const totalBad  = sessions.reduce((s, r) => s + (r.qtyBad  || 0), 0);
  const totalAll  = totalGood + totalBad;

  // Collect all piece types
  const pieceTypes = [...new Set(sessions.map(s => s.pieceType).filter(Boolean))].sort();

  // Assign a color palette per piece type
  const PALETTE = ["#e8457a","#3366cc","#f5c800","#228844","#7733aa","#e87820",
                   "#22aacc","#cc3333","#55aa55","#aa5599","#4488ee","#dd8833"];
  const ptColor = {};
  pieceTypes.forEach((pt, i) => { ptColor[pt] = PALETTE[i % PALETTE.length]; });

  // Build hourly buckets: { hour: { pieceType: qty } }
  const hourBuckets = {};
  sessions.forEach(s => {
    const h = new Date(s.time).getHours();
    if (!hourBuckets[h]) hourBuckets[h] = {};
    const pt = s.pieceType || "Unknown";
    hourBuckets[h][pt] = (hourBuckets[h][pt] || 0) + (s.qtyGood || 0);
  });

  // Active hours: all hours that have data
  const activeHours = Object.keys(hourBuckets).map(Number).sort((a,b)=>a-b);

  // Build body HTML
  const body = document.getElementById("cdm-body");
  body.innerHTML = "";

  // ── TOP ROW: totals left, chart right ──
  const topRow = document.createElement("div");
  topRow.style.cssText = "display:flex;gap:20px;align-items:flex-start;margin-bottom:24px;";

  // LEFT: totals panel
  const totalsPanel = document.createElement("div");
  totalsPanel.style.cssText = "flex-shrink:0;width:160px;display:flex;flex-direction:column;gap:10px;";
  totalsPanel.innerHTML = `
    <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px;">Total Produced</div>
    <div style="font-family:'Abril Fatface',serif;font-size:52px;color:#e8457a;line-height:1;">${totalAll.toLocaleString()}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#90b888;text-transform:uppercase;letter-spacing:0.1em;">✓ Good</span>
        <span style="font-family:'Abril Fatface',serif;font-size:22px;color:#228844;">${totalGood.toLocaleString()}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#e09090;text-transform:uppercase;letter-spacing:0.1em;">✗ Bad</span>
        <span style="font-family:'Abril Fatface',serif;font-size:22px;color:#cc3333;">${totalBad.toLocaleString()}</span>
      </div>
    </div>
    <div style="margin-top:8px;padding-top:10px;border-top:1px solid #fde0ea;">
      <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px;">Tables Run</div>
      <div style="font-family:'Abril Fatface',serif;font-size:36px;color:#b070c0;line-height:1;">${sessions.reduce((s,r)=>s+(r.changeovers||0),0).toLocaleString()}</div>
    </div>
    <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;margin-top:4px;">${sessions.length} session${sessions.length!==1?'s':''}</div>
  `;

  // RIGHT: stacked bar chart + legend
  const chartPanel = document.createElement("div");
  chartPanel.style.cssText = "flex:1;display:flex;flex-direction:column;gap:0;min-width:0;";

  // Legend top-right
  const legend = document.createElement("div");
  legend.style.cssText = "display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:flex-end;margin-bottom:10px;";
  pieceTypes.forEach(pt => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex;align-items:center;gap:5px;font-family:'Josefin Slab',serif;font-size:10px;color:#5a5a7a;";
    item.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ptColor[pt]};flex-shrink:0;"></span>${pt}`;
    legend.appendChild(item);
  });
  chartPanel.appendChild(legend);

  // Canvas
  const canvasWrap = document.createElement("div");
  canvasWrap.style.cssText = "position:relative;flex:1;";
  const canvas = document.createElement("canvas");
  canvas.id = "cdm-chart";
  canvas.style.cssText = "width:100%;display:block;";
  canvasWrap.appendChild(canvas);
  chartPanel.appendChild(canvasWrap);

  topRow.appendChild(totalsPanel);
  topRow.appendChild(chartPanel);
  body.appendChild(topRow);

  // ── PIECE TYPE BREAKDOWN ──
  if (pieceTypes.length > 0) {
    const section = document.createElement("div");
    section.style.cssText = "margin-top:4px;";

    // Section header
    const sectionHeader = document.createElement("div");
    sectionHeader.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #fde0ea;";
    sectionHeader.textContent = "Piece Type Breakdown";
    section.appendChild(sectionHeader);

    // Column headers
    const colHeader = document.createElement("div");
    colHeader.style.cssText = "display:grid;grid-template-columns:1fr 80px 80px 80px 80px;gap:6px;padding:0 8px 6px;";
    colHeader.innerHTML = `
      <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#c090a8;text-transform:uppercase;letter-spacing:0.1em;">Piece Type</span>
      <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#c090a8;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Sessions</span>
      <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#228844;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">✓ Good</span>
      <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#cc3333;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">✗ Bad</span>
      <span style="font-family:'Josefin Slab',serif;font-size:9px;color:#7733aa;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Tables</span>
    `;
    section.appendChild(colHeader);

    // One row per piece type
    pieceTypes.forEach((pt, idx) => {
      const ptSessions = sessions.filter(s => s.pieceType === pt);
      const ptGood   = ptSessions.reduce((s,r) => s + (r.qtyGood    || 0), 0);
      const ptBad    = ptSessions.reduce((s,r) => s + (r.qtyBad     || 0), 0);
      const ptTables = ptSessions.reduce((s,r) => s + (r.changeovers|| 0), 0);
      const ptTotal  = ptGood + ptBad;
      const pct      = totalAll > 0 ? Math.round((ptTotal / totalAll) * 100) : 0;

      const row = document.createElement("div");
      row.style.cssText = `display:grid;grid-template-columns:1fr 80px 80px 80px 80px;gap:6px;align-items:center;padding:8px 8px;border-radius:8px;background:${idx%2===0?'#fdf5f8':'#fff'};cursor:pointer;transition:box-shadow 0.15s,transform 0.1s;`;
      row.title = "Click for detailed breakdown";
      row.onmouseenter = () => { row.style.boxShadow="0 2px 12px rgba(232,69,122,0.13)"; row.style.transform="translateY(-1px)"; };
      row.onmouseleave = () => { row.style.boxShadow=""; row.style.transform=""; };
      row.onclick = () => openPieceTypeDrill(_cdmMachine, pt);

      // Progress bar fill behind piece type name
      const nameWrap = document.createElement("div");
      nameWrap.style.cssText = "position:relative;display:flex;align-items:center;gap:8px;overflow:hidden;border-radius:4px;";
      nameWrap.innerHTML = `
        <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${ptColor[pt]}22;border-radius:4px;"></div>
        <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${ptColor[pt]};flex-shrink:0;position:relative;"></span>
        <span style="font-family:'Josefin Slab',serif;font-size:12px;color:#3a2a38;position:relative;">${pt}</span>
        <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;position:relative;">${pct}%</span>
      `;
      row.appendChild(nameWrap);

      [ptSessions.length, ptGood, ptBad, ptTables].forEach((val, i) => {
        const cell = document.createElement("div");
        const colors = ["#a090b8","#228844","#cc3333","#7733aa"];
        cell.style.cssText = `font-family:'Abril Fatface',serif;font-size:18px;color:${colors[i]};text-align:center;`;
        cell.textContent = val.toLocaleString();
        row.appendChild(cell);
      });

      section.appendChild(row);
    });

    // Totals footer row
    const footer = document.createElement("div");
    footer.style.cssText = "display:grid;grid-template-columns:1fr 80px 80px 80px 80px;gap:6px;align-items:center;padding:8px 8px;margin-top:4px;border-top:2px solid #fde0ea;";
    const totalTables = sessions.reduce((s,r) => s + (r.changeovers||0), 0);
    footer.innerHTML = `
      <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.1em;">Total</span>
      <span style="font-family:'Abril Fatface',serif;font-size:18px;color:#a090b8;text-align:center;">${sessions.length}</span>
      <span style="font-family:'Abril Fatface',serif;font-size:18px;color:#228844;text-align:center;">${totalGood.toLocaleString()}</span>
      <span style="font-family:'Abril Fatface',serif;font-size:18px;color:#cc3333;text-align:center;">${totalBad.toLocaleString()}</span>
      <span style="font-family:'Abril Fatface',serif;font-size:18px;color:#7733aa;text-align:center;">${totalTables.toLocaleString()}</span>
    `;
    section.appendChild(footer);
    body.appendChild(section);
  }

  openModal("card-detail-modal");

  // Draw chart after modal is visible
  requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement.offsetWidth;
    const PAD_L = 36, PAD_B = 28, PAD_T = 8, PAD_R = 8;
    const CHART_H = 180;
    const cssH = CHART_H + PAD_T + PAD_B;
    const nHours = Math.max(activeHours.length, 1);
    const BAR_W = Math.max(16, Math.floor((cssW - PAD_L - PAD_R) / nHours * 0.7));
    const GROUP_W = Math.floor((cssW - PAD_L - PAD_R) / nHours);

    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = cssH + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // Max total per hour
    const hourTotals = activeHours.map(h => Object.values(hourBuckets[h]).reduce((s,v)=>s+v,0));
    const maxVal = Math.max(1, ...hourTotals);

    // Grid lines
    const gridN = 4;
    ctx.setLineDash([3,3]);
    ctx.strokeStyle = "#f0dde8";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridN; i++) {
      const y = PAD_T + CHART_H - (i/gridN)*CHART_H;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(cssW - PAD_R, y); ctx.stroke();
      ctx.fillStyle = "#c090a8";
      ctx.font = "9px 'Josefin Slab',serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round((i/gridN)*maxVal), PAD_L - 4, y + 3);
    }
    ctx.setLineDash([]);

    // Stacked bars
    activeHours.forEach((h, gi) => {
      const groupX = PAD_L + gi * GROUP_W + (GROUP_W - BAR_W) / 2;
      const total = hourTotals[gi];
      let yOffset = PAD_T + CHART_H;

      pieceTypes.forEach(pt => {
        const val = hourBuckets[h][pt] || 0;
        if (!val) return;
        const segH = (val / maxVal) * CHART_H;
        const y = yOffset - segH;
        const isTop = (pt === pieceTypes.find(p => (hourBuckets[h][p]||0) > 0 && pieceTypes.indexOf(p) === pieceTypes.filter(p2=>(hourBuckets[h][p2]||0)>0).length-1));
        ctx.fillStyle = ptColor[pt];
        const r = isTop ? Math.min(4, BAR_W/2) : 0;
        ctx.beginPath();
        if (r > 0) {
          ctx.moveTo(groupX, y + r);
          ctx.arcTo(groupX, y, groupX + r, y, r);
          ctx.arcTo(groupX + BAR_W, y, groupX + BAR_W, y + r, r);
        } else {
          ctx.moveTo(groupX, y);
          ctx.lineTo(groupX + BAR_W, y);
        }
        ctx.lineTo(groupX + BAR_W, y + segH);
        ctx.lineTo(groupX, y + segH);
        ctx.closePath();
        ctx.fill();
        yOffset -= segH;
      });

      // Total label above bar
      if (total > 0) {
        ctx.fillStyle = "#c090a8";
        ctx.font = "9px 'Josefin Slab',serif";
        ctx.textAlign = "center";
        const barTop = PAD_T + CHART_H - (total/maxVal)*CHART_H;
        ctx.fillText(total, groupX + BAR_W/2, barTop - 3);
      }

      // Hour label
      ctx.fillStyle = "#c090a8";
      ctx.font = "9px 'Josefin Slab',serif";
      ctx.textAlign = "center";
      const ampm = h===0?"12a":h<12?h+"a":h===12?"12p":(h-12)+"p";
      ctx.fillText(ampm, groupX + BAR_W/2, PAD_T + CHART_H + 14);
    });

    // Axes
    ctx.strokeStyle = "#f0c8d8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, PAD_T + CHART_H);
    ctx.lineTo(cssW - PAD_R, PAD_T + CHART_H);
    ctx.stroke();
  });
}


function reassignSession(oldMachine, sessionIdx, newMachine) {
  if (!newMachine || newMachine === oldMachine) return;
  const sessions = machineReports[oldMachine];
  if (!sessions || !sessions[sessionIdx]) return;
  const session = sessions[sessionIdx];
  const fbKey = window._sessionKeys?.[oldMachine]?.[sessionIdx];

  // Add to new machine
  if (!machineReports[newMachine]) machineReports[newMachine] = [];
  machineReports[newMachine].push(session);
  if (window._fb) window._fb.saveSession(newMachine, {
    mode: session.mode, totalSec: session.totalSec, changeovers: session.changeovers,
    qtyGood: session.qtyGood, qtyBad: session.qtyBad, notes: session.notes||"",
    pieceType: session.pieceType, op: session.op,
    time: session.time instanceof Date ? session.time.toISOString() : session.time
  });

  // Remove from old machine in Firebase
  if (fbKey && window._fb) window._fb.deleteSession(oldMachine, fbKey);

  // Remove from local array
  sessions.splice(sessionIdx, 1);
  if (window._sessionKeys?.[oldMachine]) window._sessionKeys[oldMachine].splice(sessionIdx, 1);
  if (sessions.length === 0) delete machineReports[oldMachine];

  renderReports();
}


function reassignMachine(oldMachine, newMachine) {
  if (!newMachine || newMachine === oldMachine) return;

  // Move sessions
  if (machineReports[oldMachine]?.length) {
    if (!machineReports[newMachine]) machineReports[newMachine] = [];
    machineReports[oldMachine].forEach(session => {
      machineReports[newMachine].push(session);
      // Save to Firebase under new machine
      if (window._fb) window._fb.saveSession(newMachine, {
        mode: session.mode, totalSec: session.totalSec, changeovers: session.changeovers,
        qtyGood: session.qtyGood, qtyBad: session.qtyBad, notes: session.notes||"",
        pieceType: session.pieceType, op: session.op,
        time: session.time instanceof Date ? session.time.toISOString() : session.time
      });
    });
    delete machineReports[oldMachine];
  }

  // Move events
  if (machineEvents[oldMachine]?.length) {
    if (!machineEvents[newMachine]) machineEvents[newMachine] = [];
    machineEvents[oldMachine].forEach(evt => {
      machineEvents[newMachine].push(evt);
      if (window._fb) window._fb.saveMachineEvent(newMachine, {
        category: evt.category, type: evt.type, detail: evt.detail||"",
        notes: evt.notes||"", color: evt.color,
        time: evt.time instanceof Date ? evt.time.toISOString() : evt.time
      });
    });
    delete machineEvents[oldMachine];
  }

  // Update localStorage
  localSaveSession && Object.keys(machineReports).forEach(() => {});
  try {
    const ls = JSON.parse(localStorage.getItem('pt_sessions') || '{}');
    if (ls[oldMachine]) {
      if (!ls[newMachine]) ls[newMachine] = [];
      ls[newMachine].push(...ls[oldMachine]);
      delete ls[oldMachine];
      localStorage.setItem('pt_sessions', JSON.stringify(ls));
    }
  } catch(e) {}

  reportEditMode.delete(oldMachine);
  renderReports();
}


function updateQty(machine, val) {
  const sessions = machineReports[machine];
  if (!sessions?.length) return;
  sessions[sessions.length - 1].qty = parseInt(val) || 0;
  renderReports();
}


function updateEvent(machine, idx, field, value) {
  if (!machineEvents[machine]?.[idx]) return;
  machineEvents[machine][idx][field] = value;
  // Save to Firebase if available
  if (window._fb) {
    window._fb.saveMachineEvent(machine, machineEvents[machine][idx]);
  }
}


function deleteUnassignedCard(e) {
  e.stopPropagation();
  e.preventDefault();
  if (!confirm("Delete all Unassigned sessions? This cannot be undone.")) return;
  if (window._fb) {
    window._fb.deleteAllSessions('Unassigned');
    // Firebase listener will re-render automatically
  } else {
    delete machineReports['Unassigned'];
    renderReports();
  }
}


function toggleReportEdit(machine) {
  if (reportEditMode.has(machine)) {
    reportEditMode.delete(machine);
  } else {
    reportEditMode.add(machine);
  }
  renderReports();
}


function exportReportsToExcel() {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString();

  // ── Sheet 1: Sessions ──
  const sessionRows = [["Machine","Run #","Mode","Piece Category","Piece Type","Operator","Duration","Qty Good","Qty Bad","Notes","Date","Time"]];
  Object.entries(machineReports).forEach(([machine, sessions]) => {
    sessions.filter(s => isInDateRange(s.time)).forEach((s, i) => {
      const d = s.time ? new Date(s.time) : null;
      sessionRows.push([machine, i+1, s.mode||"", s.pieceCategory||"", s.pieceType||"", s.op||"", fmt(s.totalSec), s.qtyGood||0, s.qtyBad||0, s.notes||"", d ? d.toLocaleDateString() : "", d ? d.toLocaleTimeString() : ""]);
    });
  });
  const ws1 = XLSX.utils.aoa_to_sheet(sessionRows);
  ws1['!cols'] = [14,8,16,16,14,12,12,10,10,28,14,12].map(w=>({wch:w}));
  styleHeaderRow(ws1, sessionRows[0].length);
  XLSX.utils.book_append_sheet(wb, ws1, "Sessions");

  // ── Sheet 2: Events ──
  const eventRows = [["Machine","Type","Detail","Notes","Date","Time"]];
  Object.entries(machineEvents).forEach(([machine, events]) => {
    events.filter(e => isInDateRange(e.time)).forEach(e => {
      const d = e.time ? new Date(e.time) : null;
      eventRows.push([machine, e.type||"", e.detail||"", e.notes||"", d ? d.toLocaleDateString() : "", d ? d.toLocaleTimeString() : ""]);
    });
  });
  const ws2 = XLSX.utils.aoa_to_sheet(eventRows);
  ws2['!cols'] = [14,18,24,30,14,12].map(w=>({wch:w}));
  styleHeaderRow(ws2, eventRows[0].length);
  XLSX.utils.book_append_sheet(wb, ws2, "Events");

  // ── Sheet 3: Maintenance Log ──
  const maintRows = [["Type","Detail","Notes","Operator","Machine","Date","Time"]];
  maintLog.filter(e => isInDateRange(e.time)).forEach(e => {
    const d = e.time ? new Date(e.time) : null;
    maintRows.push([e.type||"", e.detail||"", e.notes||"", e.op||"", e.machine||"", d ? d.toLocaleDateString() : "", d ? d.toLocaleTimeString() : ""]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(maintRows);
  ws3['!cols'] = [18,24,30,12,14,14,12].map(w=>({wch:w}));
  styleHeaderRow(ws3, maintRows[0].length);
  XLSX.utils.book_append_sheet(wb, ws3, "Maintenance");

  // ── Sheet 4: Waiting Log ──
  const waitRows = [["Duration","Operator","Machine","Notes","Date","Time"]];
  waitLog.filter(e => isInDateRange(e.time)).forEach(e => {
    const d = e.time ? new Date(e.time) : null;
    waitRows.push([fmt(e.duration), e.op||"", e.machine||"", e.notes||"", d ? d.toLocaleDateString() : "", d ? d.toLocaleTimeString() : ""]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(waitRows);
  ws4['!cols'] = [12,12,14,30,14,12].map(w=>({wch:w}));
  styleHeaderRow(ws4, waitRows[0].length);
  XLSX.utils.book_append_sheet(wb, ws4, "Waiting");

  // ── Sheet 5: Per-Table Breakdown ──
  const tableRows = [["Machine","Session #","Mode","Piece Type","Operator","Table #","Table Type","Qty Good","Qty Bad","Elapsed at Table","Table Time","Date","Time"]];
  Object.entries(machineReports).forEach(([machine, sessions]) => {
    sessions.filter(s => isInDateRange(s.time)).forEach((s, si) => {
      const tableLog = s.tableLog || [];
      const d = s.time ? new Date(s.time) : null;
      const dateStr = d ? d.toLocaleDateString() : "";
      const timeStr = d ? d.toLocaleTimeString() : "";
      if (tableLog.length === 0) {
        // No per-table data — fallback to session totals divided by tables
        const tables = s.changeovers || 1;
        const avgGood = Math.round((s.qtyGood||0) / tables);
        const avgBad  = Math.round((s.qtyBad||0)  / tables);
        const avgSec  = Math.round((s.totalSec||0) / tables);
        for (let t = 0; t < tables; t++) {
          tableRows.push([machine, si+1, s.mode||"", s.pieceType||"", s.op||"", t+1, "Table", avgGood, avgBad, fmt((t+1)*avgSec), fmt(avgSec), dateStr, timeStr]);
        }
      } else {
        // Each tableLog entry (Changeover, Session End) now carries its own qtyGood/qtyBad
        // directly — Changeover qty is logged at the time of changeover, and Session End
        // qty is written by _finishStop before saving. Just read them straight.
        let prevElapsed = 0;
        tableLog.forEach((entry, ti) => {
          const tableTime = entry.elapsed - prevElapsed;
          tableRows.push([
            machine, si+1, s.mode||"", s.pieceType||"", s.op||"",
            ti+1, entry.type,
            entry.qtyGood||0, entry.qtyBad||0,
            fmt(entry.elapsed), fmt(tableTime),
            dateStr, timeStr
          ]);
          prevElapsed = entry.elapsed;
        });
      }
    });
  });
  const ws5 = XLSX.utils.aoa_to_sheet(tableRows);
  ws5['!cols'] = [14,10,16,18,12,9,14,10,10,16,12,14,12].map(w=>({wch:w}));
  styleHeaderRow(ws5, tableRows[0].length);
  XLSX.utils.book_append_sheet(wb, ws5, "Per-Table Breakdown");

  XLSX.writeFile(wb, `production-report-${today.replace(/\//g,'-')}.xlsx`);
}

function styleHeaderRow(ws, numCols) {
  for (let c = 0; c < numCols; c++) {
    const cell = XLSX.utils.encode_cell({r:0, c});
    if (!ws[cell]) continue;
    ws[cell].s = {
      font: { bold:true, color:{rgb:"FFFFFF"}, name:"Arial", sz:11 },
      fill: { fgColor:{rgb:"3D1A4F"} },
      alignment: { horizontal:"center", vertical:"center" }
    };
  }
}

function renderHourlyChart(sessionsPerMachine) {
  const wrap = document.getElementById("hourly-chart-wrap");
  const canvas = document.getElementById("hourly-chart");
  const legend = document.getElementById("chart-legend");

  // Collect all machines that have data
  const machines = Object.keys(sessionsPerMachine).filter(m => sessionsPerMachine[m].length > 0);
  if (machines.length === 0) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";

  // Build hourly buckets: { machine: [24 hourly totals] }
  const hourlyData = {};
  machines.forEach(m => {
    hourlyData[m] = new Array(24).fill(0);
    sessionsPerMachine[m].forEach(s => {
      const h = new Date(s.time).getHours();
      hourlyData[m][h] += (s.qtyGood || 0);
    });
  });

  // Find which hours actually have any data
  const activeHours = [];
  for (let h = 0; h < 24; h++) {
    if (machines.some(m => hourlyData[m][h] > 0)) activeHours.push(h);
  }
  // Always show at least current hour range (start of day to now)
  const nowHour = new Date().getHours();
  for (let h = 0; h <= nowHour; h++) {
    if (!activeHours.includes(h)) activeHours.push(h);
  }
  activeHours.sort((a, b) => a - b);

  // Canvas sizing
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.offsetWidth;
  const BAR_GROUP_W = Math.max(36, Math.floor((cssWidth - 60) / activeHours.length));
  const BAR_W = Math.max(4, Math.floor((BAR_GROUP_W - 6) / machines.length));
  const CHART_H = 200;
  const PAD_LEFT = 44, PAD_BOTTOM = 36, PAD_TOP = 16, PAD_RIGHT = 12;
  const cssH = CHART_H + PAD_TOP + PAD_BOTTOM;

  canvas.width  = cssWidth * dpr;
  canvas.height = cssH * dpr;
  canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssH);

  // Max value for y-axis
  const maxVal = Math.max(1, ...machines.flatMap(m => hourlyData[m]));
  const yScale = CHART_H / maxVal;

  // Grid lines
  const gridLines = 4;
  ctx.strokeStyle = "#e8f4e4";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD_TOP + CHART_H - (i / gridLines) * CHART_H;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(cssWidth - PAD_RIGHT, y);
    ctx.stroke();
    // Y labels
    ctx.fillStyle = "#b0c8a8";
    ctx.font = "10px 'Josefin Slab', serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round((i / gridLines) * maxVal), PAD_LEFT - 5, y + 3);
  }
  ctx.setLineDash([]);

  // Bars
  activeHours.forEach((h, gi) => {
    const groupX = PAD_LEFT + gi * BAR_GROUP_W + 3;
    machines.forEach((m, mi) => {
      const val = hourlyData[m][h];
      const barH = val * yScale;
      const x = groupX + mi * (BAR_W + 1);
      const y = PAD_TOP + CHART_H - barH;
      const color = MACHINE_COLORS[m] || "#aaaaaa";
      ctx.fillStyle = color;
      // Rounded top corners
      const r = Math.min(3, BAR_W / 2, barH);
      if (barH > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + BAR_W, y, x + BAR_W, y + r, r);
        ctx.lineTo(x + BAR_W, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Hour label
    const labelX = groupX + (machines.length * (BAR_W + 1)) / 2;
    ctx.fillStyle = "#90b888";
    ctx.font = "9px 'Josefin Slab', serif";
    ctx.textAlign = "center";
    const ampm = h === 0 ? "12a" : h < 12 ? h + "a" : h === 12 ? "12p" : (h - 12) + "p";
    ctx.fillText(ampm, labelX, PAD_TOP + CHART_H + 14);
  });

  // Axis line
  ctx.strokeStyle = "#c2e8b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP);
  ctx.lineTo(PAD_LEFT, PAD_TOP + CHART_H);
  ctx.lineTo(cssWidth - PAD_RIGHT, PAD_TOP + CHART_H);
  ctx.stroke();

  // Legend
  legend.innerHTML = "";
  machines.forEach(m => {
    const color = MACHINE_COLORS[m] || "#aaaaaa";
    const item = document.createElement("div");
    item.style.cssText = "display:flex;align-items:center;gap:5px;font-family:'Josefin Slab',serif;font-size:11px;color:#5a7a58;";
    item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;"></span>${m}`;
    legend.appendChild(item);
  });
}

function openPieceTypeDrill(machine, pieceType) {
  const sessions = (machineReports[machine] || [])
    .filter(s => isInDateRange(s.time) && s.pieceType === pieceType);

  document.getElementById("ptd-title").textContent = pieceType;
  document.getElementById("ptd-machine").textContent = machine + " · " + sessions.length + " session" + (sessions.length !== 1 ? "s" : "");

  const body = document.getElementById("ptd-body");
  body.innerHTML = "";

  const cap = getTableCapacity(pieceType);
  const totalGood   = sessions.reduce((s,r) => s + (r.qtyGood || 0), 0);
  const totalBad    = sessions.reduce((s,r) => s + (r.qtyBad  || 0), 0);
  // Total tables: mirror calcEfficiency logic per session
  const totalTables = sessions.reduce((s,r) => {
    const isCont = r.mode && r.mode.startsWith('continuous');
    return s + (isCont ? (r.changeovers||1) : (r.changeovers||0) + 1);
  }, 0);

  // Calc efficiency per session — include all sessions that have cap defined
  const effSessions = sessions.filter(s => cap > 0);
  const effValues   = effSessions.map(s => calcEfficiency(s.qtyGood||0, s.changeovers||0, pieceType, s.mode) ?? 0);
  const avgEff      = effValues.length > 0 ? Math.min(100, Math.round(effValues.reduce((a,b)=>a+b,0) / effValues.length)) : null;
  const bestEff     = effValues.length > 0 ? Math.min(100, Math.max(...effValues)) : null;
  const worstEff    = effValues.length > 0 ? Math.min(100, Math.min(...effValues)) : null;

  const clr = avgEff !== null ? efficiencyColor(avgEff) : { bar:"#cccccc", text:"#999999", bg:"#f8f8f8" };

  // ── AVERAGE EFFICIENCY HERO ──
  const hero = document.createElement("div");
  hero.style.cssText = `background:${clr.bg};border:1px solid ${clr.bar}44;border-radius:12px;padding:18px 20px;margin-bottom:18px;display:flex;align-items:center;gap:20px;`;
  if (avgEff !== null) {
    const barPct = Math.min(avgEff, 100);
    hero.innerHTML = `
      <div style="flex-shrink:0;text-align:center;">
        <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">Avg Efficiency</div>
        <div style="font-family:'Abril Fatface',serif;font-size:56px;color:${clr.text};line-height:1;">${avgEff}%</div>
        <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;margin-top:2px;">${cap} cap / table</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
        <div>
          <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Overall</div>
          <div style="background:#e0e8e4;border-radius:99px;height:10px;overflow:hidden;">
            <div style="height:100%;width:${barPct}%;background:${clr.bar};border-radius:99px;transition:width 0.5s;"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:4px;">
          <div style="text-align:center;">
            <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;text-transform:uppercase;letter-spacing:0.08em;">Best</div>
            <div style="font-family:'Abril Fatface',serif;font-size:22px;color:#228844;">${bestEff}%</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;text-transform:uppercase;letter-spacing:0.08em;">Worst</div>
            <div style="font-family:'Abril Fatface',serif;font-size:22px;color:#cc3333;">${worstEff}%</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Josefin Slab',serif;font-size:9px;color:#90a8a0;text-transform:uppercase;letter-spacing:0.08em;">Tables</div>
            <div style="font-family:'Abril Fatface',serif;font-size:22px;color:#7733aa;">${totalTables}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    hero.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#c090a8;">No efficiency data yet — log qty good on sessions to see scores.</div>`;
  }
  body.appendChild(hero);

  // ── TOTALS ROW ──
  const totals = document.createElement("div");
  totals.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;";
  [
    { label:"Total Good", val:totalGood, color:"#228844", bg:"#f2fbf5", border:"#b8e8c8" },
    { label:"Total Bad",  val:totalBad,  color:"#cc3333", bg:"#fff5f5", border:"#f0b8b8" },
    { label:"Sessions",   val:sessions.length, color:"#7733aa", bg:"#faf0ff", border:"#d8c0ee" },
  ].forEach(({label, val, color, bg, border}) => {
    totals.innerHTML += `
      <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px 14px;text-align:center;">
        <div style="font-family:'Josefin Slab',serif;font-size:9px;color:${color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${label}</div>
        <div style="font-family:'Abril Fatface',serif;font-size:28px;color:${color};line-height:1;">${val}</div>
      </div>`;
  });
  body.appendChild(totals);

  // ── SESSION LIST ──
  if (sessions.length > 0) {
    const listHeader = document.createElement("div");
    listHeader.style.cssText = "font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fde0ea;";
    listHeader.textContent = "Session Breakdown";
    body.appendChild(listHeader);

    const sorted = [...sessions].sort((a,b) => new Date(b.time) - new Date(a.time));
    sorted.forEach((s, i) => {
      const _sRaw = calcEfficiency(s.qtyGood||0, s.changeovers||0, pieceType, s.mode);
      const sEff = _sRaw !== null ? Math.min(100, _sRaw) : null;
      const sClr = sEff !== null ? efficiencyColor(sEff) : { bar:"#ddd", text:"#aaa", bg:"#fafafa" };
      const timeStr = new Date(s.time).toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit"});
      const dateStr = new Date(s.time).toLocaleDateString("en-US", {month:"short", day:"numeric"});

      const sRow = document.createElement("div");
      sRow.style.cssText = `display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:8px;background:${i%2===0?'#fdf5f8':'#fff'};margin-bottom:4px;`;

      // Efficiency badge
      const badge = document.createElement("div");
      badge.style.cssText = `flex-shrink:0;width:52px;text-align:center;background:${sClr.bg};border:1px solid ${sClr.bar}55;border-radius:7px;padding:5px 4px;`;
      badge.innerHTML = sEff !== null
        ? `<div style="font-family:'Abril Fatface',serif;font-size:18px;color:${sClr.text};line-height:1;">${sEff}%</div>`
        : `<div style="font-family:'Josefin Slab',serif;font-size:9px;color:#bbb;">—</div>`;
      sRow.appendChild(badge);

      // Details
      const details = document.createElement("div");
      details.style.cssText = "flex:1;min-width:0;";
      details.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
          <span style="font-family:'Josefin Slab',serif;font-size:12px;color:#3a2a38;font-weight:600;">${s.mode || 'Run'} · ${dateStr} ${timeStr}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#c090a8;">${fmt(s.totalSec||0)}</span>
        </div>
        <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#a090a8;">
          ✓ ${s.qtyGood||0} good &nbsp; ✗ ${s.qtyBad||0} bad &nbsp; · &nbsp; ${(s.mode||"").startsWith("continuous") ? (s.changeovers||0)+" laps" : (s.changeovers||0)+1+" tables"}
          ${cap ? ' &nbsp; · &nbsp; cap ' + cap + '/table' : ''}
        </div>
        ${sEff !== null ? `
        <div style="margin-top:5px;background:#e8eeea;border-radius:99px;height:4px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(sEff,100)}%;background:${sClr.bar};border-radius:99px;"></div>
        </div>` : ''}
        ${s.notes ? `<div style="font-family:'Josefin Slab',serif;font-size:10px;color:#b090a0;font-style:italic;margin-top:3px;">${s.notes}</div>` : ''}
      `;
      sRow.appendChild(details);
      body.appendChild(sRow);
    });
  } else {
    body.innerHTML += `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#c090a8;text-align:center;padding:20px;">No sessions for this piece type in the selected date range.</div>`;
  }

  openModal("pt-drill-modal");
}
