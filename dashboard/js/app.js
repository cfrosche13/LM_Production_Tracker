import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUlCZgxYV-vfFhWop1jX_8VVvjJYAA2-M",
  authDomain: "eg-studio-production-tracker.firebaseapp.com",
  databaseURL: "https://eg-studio-production-tracker-default-rtdb.firebaseio.com",
  projectId: "eg-studio-production-tracker",
  storageBucket: "eg-studio-production-tracker.firebasestorage.app",
  messagingSenderId: "284937225937",
  appId: "1:284937225937:web:2dcb59fe049e90d76967f0"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── CONSTANTS ──
const MACHINES       = ["30","30+","H5","Colex","Wallets","Drinkware M1","Drinkware M2"];
const PF_MACHINES    = ["30","30+","H5","Drinkware M1","Drinkware M2"];
const STAMPED_MACHINES = ["Wallets"];
const DRINKWARE_MACHINES = ["Drinkware M1","Drinkware M2"];
const PLAN_MACHINES = ["30","30+","H5","Drinkware M1","Drinkware M2"];
const DAY_SHIFT_START_HOUR = 6;   // earliest flex-in
const DAY_SHIFT_END_HOUR   = 15;  // 3pm — day/night cutoff
const MACHINE_COLORS = { "30":"#0d6748","30+":"#1a7a54","H5":"#2e9e6e","Colex":"#52b888","Wallets":"#7aca9e","Drinkware M1":"#a8ddb8","Drinkware M2":"#85c99e" };
const CHART_HOURS_START = 6;
const CHART_HOURS_END   = 23; // 6am to end of 11pm hour (covers the 11:30pm shift end)
const CHART_WINDOW_HOURS = 8; // rolling window width shown on the chart
const SHIP_CONFIRM_COLOR = "#3a6ea5";
// Shipping-pipeline stack on the hourly chart — Shipped anchors the bottom,
// light-to-dark fading upward through the earlier stages
const STATION_STACK = [
  { key: "shipped",     label: "Shipped",     color: SHIP_CONFIRM_COLOR },
  { key: "readyToShip", label: "Ready to Ship", color: "#5a8ebd" },
  { key: "sorting",     label: "Sorted",      color: "#82abd0" },
  { key: "assembly",    label: "Assembled",   color: "#aecbe3" },
  { key: "collation",   label: "Collated",    color: "#d6e6f2" },
];

// ── STATE ──
let machineReports = {};
let machineEvents  = {};
let maintLog       = [];
let waitLog        = [];
let targets        = {};
let shipConfirmData = {};
let plansData = {};
let shippingStatus = null;
let loaded         = { sessions: false, maint: false, wait: false, targets: false, shipConfirm: false, plans: false };

// ── DEMO TIME OVERRIDE ──
// Lets this dashboard be previewed as if it were a different time of day
// today (e.g. "show me 11am" when it's actually early/low-production) without
// touching real data. Pass ?demoTime=HH:MM (24h) in the URL — the live TV
// never has this param, so it always uses the real clock. Not persisted.
let _demoNowMs = null;
(function() {
  const dt = new URLSearchParams(window.location.search).get("demoTime");
  if (dt && /^\d{1,2}:\d{2}$/.test(dt)) {
    const [hh, mm] = dt.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    _demoNowMs = d.getTime();
  }
})();
function _now() { return _demoNowMs!=null ? _demoNowMs : Date.now(); }
function _nowDate() { return new Date(_now()); }

function fmt(s) {
  return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function localDateStr(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
}
function today() { return localDateStr(_nowDate()); }
function oeeColor(pct) {
  if (pct >= 85) return { bar:"#0d6748", text:"#0d6748" };
  if (pct >= 65) return { bar:"#568e7b", text:"#568e7b" };
  if (pct >= 40) return { bar:"#8aaa44", text:"#8aaa44" };
  return { bar:"#c4770a", text:"#c4770a" };
}

function yesterday() {
  const d = _nowDate(); d.setDate(d.getDate()-1);
  return localDateStr(d);
}


// ── OPEN ORDERS ──
let _dashOrders = null;

const DASH_PIECE_MAP = {
  "COIR 28X16":"Coir · 28x16","COIR 28x16":"Coir · 28x16",
  "COIR 30X18":"Coir · 30x18","COIR 30x18":"Coir · 30x18",
  "COIR 36X24":"Coir · 36x24","COIR 36x24":"Coir · 36x24",
  "COIR 60X24":"Coir · 60x24","COIR 60x24":"Coir · 60x24",
  "FLOCKED COIR 22X10":"Coir · Flocked","FLOCKED COIR 22x10":"Coir · Flocked",
  "BLOCK SIGN-6X6":"Signs · 6x6 Plock","BLOCK SIGN-6x6":"Signs · 6x6 Plock",
  "YARD SIGNS 24X18":"Signs · Yard Sign","YARD SIGNS 24x18":"Signs · Yard Sign",
  "YARD SIGN H-STAKE":"Signs · Yard Sign",
  "HANGING SIGN 11X6":"Signs · 11x6 Plock","HANGING SIGN 11x6":"Signs · 11x6 Plock",
  "PVC 28X16":"Non-Coir Mats · PVC","PVC 28x16":"Non-Coir Mats · PVC",
  "ANTI FATIGUE MAT 30X18":"Non-Coir Mats · AF Large",
  "WALLET":"Wallets · Bifold Black",
  "WALL ART 16X24":"Signs · 16x24","WALL ART 16x24":"Signs · 16x24",
  "WALL ART 12X12":"Signs · 12x12","WALL ART 12x12":"Signs · 12x12",
  "PORCH LEANER 105X46":"Signs · Leaner","PORCH LEANER 105x46":"Signs · Leaner",
};

// Map piece type to machine
const PIECE_MACHINE_MAP = {
  "Coir · 28x16":"30","Coir · 30x18":"30","Coir · 36x24":"30",
  "Coir · 60x24":"30","Coir · Flocked":"30+",
  "Non-Coir Mats · PVC":"H5","Non-Coir Mats · AF Large":"H5","Non-Coir Mats · Drying Mat":"H5",
  "Signs · 16x24":"H5","Signs · 12x12":"H5","Signs · 6x6 Plock":"H5",
  "Signs · 11x6 Plock":"H5","Signs · Yard Sign":"H5","Signs · Leaner":"H5",
  "Signs · 18' Circle":"H5","Signs · 12x8 Plock":"H5","Signs · Mantle Sign":"H5",
  "Wallets · Bifold Black":"Wallets","Wallets · Trifold Black":"Wallets",
};

function handleDashboardOrdersUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => parseDashOrders(e.target.result);
  reader.readAsArrayBuffer(file);
}
// Wire up file input inside the module (avoids global scope issues on Netlify)
document.getElementById("orders-file-input").addEventListener("change", handleDashboardOrdersUpload);

function parseDashOrders(buffer) {
  if (typeof XLSX === "undefined") { console.error("SheetJS not loaded"); return; }
  const wb = XLSX.read(buffer, { type:"array", cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });

  console.log("Dashboard orders: total rows read =", rows.length);
  if (rows.length > 0) console.log("First row keys:", Object.keys(rows[0]));

  const today = _nowDate();
  const byMachine = {};
  let total = 0, aged8plus = 0, skipped = 0, fbaTotal = 0;

  rows.forEach(row => {
    // Skip blank rows — check multiple possible id columns
    const taskId = row["lmTaskID"] || row["lmTaskID "] || row["LmTaskID"] || row["taskid"];
    if (!taskId) { skipped++; return; }

    // Skip closed
    const closed = row["TaskClosed"] || row["taskclosed"];
    if (closed) return;
    const status = String(row["TaskStatus"] || row["taskstatus"] || "");
    if (status.toLowerCase().includes("closed")) return;

    const qty = parseInt(row["kid_qty"] || row["qty"] || 1) || 1;
    let machine = row["Machine"] || row["machine"] || "Unassigned";
    if (machine === "Wallet") machine = "Wallets";

    // Check FBA flag — treat as separate bucket, exclude from open orders total
    const isFBA = String(row["Is FBA Y/N"] || row["is fba y/n"] || row["IsFBA"] || "").trim().toUpperCase() === "Y";
    if (isFBA) {
      fbaTotal += qty;
      return; // don't add to open orders or byMachine
    }

    byMachine[machine] = (byMachine[machine] || 0) + qty;
    total += qty;

    const waveDate = row["WaveDate"] || row["wavedate"];
    if (waveDate instanceof Date) {
      const ageDays = Math.floor((today - waveDate) / 86400000);
      if (ageDays >= 8) aged8plus += qty;
    }
  });

  console.log("Dashboard orders: valid rows =", total, "FBA =", fbaTotal, "skipped =", skipped, "byMachine =", byMachine);
  _dashOrders = { byMachine, total, aged8plus, fbaTotal };
  renderOrdersSidebar();
}

function renderOrdersSidebar() {
  if (!_dashOrders) return;
  const { byMachine, total, aged8plus, fbaTotal } = _dashOrders;

  const totalEl = document.getElementById("h-open-total");
  const ageEl   = document.getElementById("h-open-age");
  const machEl  = document.getElementById("h-open-machines");
  const fbaEl   = document.getElementById("h-fba-total");
  if (totalEl) totalEl.textContent = total.toLocaleString();
  if (ageEl)   ageEl.textContent   = aged8plus > 0 ? aged8plus.toLocaleString() + " aged 8+ days" : "";
  if (fbaEl)   fbaEl.textContent   = fbaTotal.toLocaleString();

  if (machEl) {
    machEl.innerHTML = "";
    const order = ["30","30+","H5","Colex","Wallets","Drinkware M1","Drinkware M2","Windchimes","Other"];
    order.forEach(m => {
      const qty = byMachine[m];
      if (!qty) return;
      const row = document.createElement("div");
      row.className = "open-machine-row";
      row.innerHTML = `
        <span class="open-machine-name">${m}</span>
        <span class="open-machine-qty">${qty.toLocaleString()}</span>`;
      machEl.appendChild(row);
    });
  }
}

// ── RENDER ──
function render() {
  const td = today();

  // Header counters
  let totalPrinted=0, badPrinted=0, totalStamped=0, badStamped=0, totalDrinkware=0, badDrinkware=0;
  PF_MACHINES.forEach(m => {
    (machineReports[m]||[]).filter(s=>localDateStr(s.time)===td).forEach(s=>{
      totalPrinted += s.qtyGood||0; badPrinted += s.qtyBad||0;
    });
  });
  STAMPED_MACHINES.forEach(m => {
    (machineReports[m]||[]).filter(s=>localDateStr(s.time)===td).forEach(s=>{
      totalStamped += s.qtyGood||0; badStamped += s.qtyBad||0;
    });
  });
  DRINKWARE_MACHINES.forEach(m => {
    (machineReports[m]||[]).filter(s=>localDateStr(s.time)===td).forEach(s=>{
      totalDrinkware += s.qtyGood||0; badDrinkware += s.qtyBad||0;
    });
  });
  document.getElementById("h-printed").textContent     = totalPrinted.toLocaleString();
  document.getElementById("h-printed-bad").textContent = badPrinted ? badPrinted+" bad" : "";
  document.getElementById("h-stamped").textContent     = totalStamped.toLocaleString();
  document.getElementById("h-stamped-bad").textContent = badStamped ? badStamped+" bad" : "";
  document.getElementById("h-drinkware").textContent     = totalDrinkware.toLocaleString();
  document.getElementById("h-drinkware-bad").textContent = badDrinkware ? badDrinkware+" bad" : "";
  document.getElementById("h-ship-confirm").textContent  = ((shipConfirmData[td]||{}).total||0).toLocaleString();
  document.getElementById("last-updated").textContent  = "Updated " + _nowDate().toLocaleTimeString() + (_demoNowMs!=null ? " (demo time)" : "");
  document.getElementById("today-date").textContent = _nowDate().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  renderChart(td);
  renderCards(td);
  renderShiftProgress(td);
  renderPace(td);
  renderShippingPace();
  renderWeeklySummary();
  if (shippingStatus) renderShipping();
  document.getElementById("loading").style.display = "none";
}

// ── PLAN LOOKUP ──
function shiftHourRange(shift) {
  return shift === "day" ? [DAY_SHIFT_START_HOUR, DAY_SHIFT_END_HOUR] : [DAY_SHIFT_END_HOUR, 24];
}
function currentShift() {
  const h = _nowDate().getHours();
  return (h>=DAY_SHIFT_START_HOUR && h<DAY_SHIFT_END_HOUR) ? "day" : "night";
}

// ── PACE (% to plan, scaled to elapsed shift time) ──
// Same underlying metric as the LM_Print_Track_Report reporting app's "pace"
// feature: compare actual production to what SHOULD be done by now (full
// target scaled by how much of the shift has elapsed) instead of the full
// shift target, which always looks like a miss early in a shift.
// Computed per group (Print Floor machines share one elapsed-time clock,
// Drinkware machines share their own) — matches the reporting app's math —
// but displayed per machine on this dashboard.
const PACE_GROUPS = {
  standard:  PLAN_MACHINES.filter(m => !DRINKWARE_MACHINES.includes(m)), // 30, 30+, H5
  drinkware: DRINKWARE_MACHINES,                                         // Drinkware M1, M2
};
function paceGroupFor(machine) {
  return DRINKWARE_MACHINES.includes(machine) ? "drinkware" : "standard";
}
// Shift's normal clock-end hour (fractional allowed) — the far edge of the
// pace clock. Elapsed fraction is capped at 1 once this passes, so extended/
// overtime hours just compare actual to the full target, same as before.
function shiftClockEndHour(shift) {
  return shift === "day" ? DAY_SHIFT_END_HOUR : 23.5; // 3pm Day / 11:30pm Night
}
// Earliest session across every machine in a pace group, for the given date
// + shift — the pace clock's "0%" anchor (first real tally, not scheduled
// start time).
function groupFirstTallyMs(group, td, shift) {
  const [hStart, hEnd] = shiftHourRange(shift);
  let earliest = null;
  PACE_GROUPS[group].forEach(machine => {
    (machineReports[machine]||[]).forEach(s => {
      if (!s.time || localDateStr(s.time)!==td) return;
      const t = new Date(s.time);
      const h = t.getHours();
      if (h<hStart || h>=hEnd) return;
      const ms = t.getTime();
      if (earliest==null || ms<earliest) earliest = ms;
    });
  });
  return earliest;
}
// 0..1 fraction of the shift elapsed so far, or null if this group hasn't
// tallied anything yet this shift (pace is neutral/unavailable until then).
function shiftElapsedFraction(group, td, shift) {
  const startMs = groupFirstTallyMs(group, td, shift);
  if (startMs==null) return null;
  const dayStart = new Date(td+"T00:00:00").getTime();
  const endMs = dayStart + shiftClockEndHour(shift)*3600*1000;
  const now = Math.min(_now(), endMs);
  if (now<=startMs) return 0;
  return Math.min(1, (now-startMs)/(endMs-startMs));
}
// 5-tier color scale matching the reporting app's thresholds (lower-tier
// inclusive: <=60 red, 61-70 orange, 71-80 yellow, 81-90 yellow-green, 91+ green).
function paceColor(pct) {
  if (pct<=60) return "#c4770a";
  if (pct<=70) return "#d69a4a";
  if (pct<=80) return "#c9b93a";
  if (pct<=90) return "#8aaa44";
  return "#0d6748";
}
// Animation duration in seconds — shorter = faster/more energetic motion.
// Scales continuously with pct (clamped 15-140%) so the motion itself reads
// as a real speed gauge, not a stepped swap between states.
function paceAnimDuration(pct) {
  const p = Math.max(15, Math.min(140, pct==null ? 15 : pct));
  const t = (p-15)/(140-15);
  return (2.6 - t*(2.6-0.45)).toFixed(2);
}
// ── FLAME GAUGE ──
// Replaces the earlier "which animal" approach (turtle/hare/horse) — a
// single 🔥 icon that continuously grows and heats up with pace instead of
// swapping characters, so there's no species left to misread as not-fast-enough.
// Explicit calibration checkpoints (owner-specified, 2026-09-11), interpolated
// piecewise-linear between them — a real color-temperature journey rather
// than one smooth gradient, so the shift actually reads as distinct zones:
//   100%+ : full hot orange flame, largest size
//   75%   : still orange, but only as big/bright as the OLD curve showed at
//           41% — the mid-high range was too generous before
//   60%   : mid-transition into purple/cold
//   50%   : blue, tiny
//   <=25% : fully gray/desaturated — smoldering, near-out
// (hue is a hue-rotate() degree applied to the flame's natural orange-red;
// gray/sat/bright are grayscale()/saturate()/brightness() percentages/factors)
const FLAME_STOPS = [
  { pct: 100, size: 112, hue: 0,   gray: 0,   sat: 1.8, bright: 1.4  },
  { pct: 75,  size: 50,  hue: 0,   gray: 45,  sat: 0.9, bright: 0.9  },
  { pct: 60,  size: 40,  hue: 280, gray: 25,  sat: 1.0, bright: 0.85 },
  { pct: 50,  size: 32,  hue: 200, gray: 15,  sat: 1.0, bright: 0.85 },
  { pct: 25,  size: 24,  hue: 200, gray: 100, sat: 0,   bright: 0.7  },
];
function _flameLerp(pctIn) {
  const pct = pctIn==null ? 0 : pctIn;
  if (pct >= FLAME_STOPS[0].pct) return FLAME_STOPS[0];
  if (pct <= FLAME_STOPS[FLAME_STOPS.length-1].pct) return FLAME_STOPS[FLAME_STOPS.length-1];
  for (let i=0; i<FLAME_STOPS.length-1; i++) {
    const a = FLAME_STOPS[i], b = FLAME_STOPS[i+1];
    if (pct<=a.pct && pct>=b.pct) {
      const t = (a.pct-pct)/(a.pct-b.pct); // 0 at a, 1 at b
      const lerp = (x,y) => x+(y-x)*t;
      return { size:lerp(a.size,b.size), hue:lerp(a.hue,b.hue), gray:lerp(a.gray,b.gray), sat:lerp(a.sat,b.sat), bright:lerp(a.bright,b.bright) };
    }
  }
  return FLAME_STOPS[FLAME_STOPS.length-1];
}
function flameSize(pct) { return Math.round(_flameLerp(pct).size); }
// Color-only (no size) — reused for both the flame icon itself and its glow
// halo behind it, so the halo always matches the flame's current color.
function flameFilter(pct) {
  const f = _flameLerp(pct);
  return `hue-rotate(${f.hue.toFixed(0)}deg) grayscale(${f.gray.toFixed(0)}%) saturate(${f.sat.toFixed(2)}) brightness(${f.bright.toFixed(2)})`;
}

// ── SHIPPING PACE (bottom half of the takeover) ──
// Shipping has no committed plan to compare against, so the "expected by
// now" baseline is the 5-day same-shift average for that station
// (shippingStatus.shiftBreakdown.avg5, already computed server-side by
// shipping_status_sync.py) scaled down by how much of the SCHEDULED shift
// has elapsed — same scaling technique as the production pace cards above,
// just anchored to the shift's clock start/end rather than a first tally
// (collation/assembly/sorting/ready-to-ship don't have a clean "first tally"
// of their own to anchor to).
const SHIP_STATIONS = [
  { key: "collation",   label: "Collated" },
  { key: "assembly",    label: "Assembled" },
  { key: "sorting",     label: "Sorted" },
  { key: "readyToShip", label: "Ready to Ship" },
];
function shipElapsedFraction(shift) {
  const [hStart] = shiftHourRange(shift);
  const dayStart = new Date(today()+"T00:00:00").getTime();
  const startMs = dayStart + hStart*3600*1000;
  const endMs   = dayStart + shiftClockEndHour(shift)*3600*1000;
  const now = Math.min(_now(), endMs);
  if (now<=startMs) return 0;
  return Math.min(1, (now-startMs)/(endMs-startMs));
}
function renderShippingPace() {
  const grid  = document.getElementById("ship2-grid");
  const title = document.getElementById("ship2-shift-title");
  if (!grid) return;

  const sb = shippingStatus && shippingStatus.shiftBreakdown;
  if (!sb) { grid.innerHTML = `<div style="font-size:12px;color:#9b9b9b;grid-column:1/-1;">Waiting on shipping data…</div>`; return; }

  const shift = sb.shift === "night" ? "night" : "day";
  if (title) title.textContent = shift==="day" ? "Day Shift" : "Night Shift";
  const frac = shipElapsedFraction(shift);

  grid.innerHTML = "";
  SHIP_STATIONS.forEach(({key,label}) => {
    const actual   = (sb.current && sb.current[key]) || 0;
    const avg5     = sb.avg5 && sb.avg5[key];
    const expected = (avg5!=null) ? Math.round(avg5*frac) : null;
    const pct      = (expected!=null && expected>0) ? Math.round(actual/expected*100) : null;
    const color    = pct!=null ? paceColor(pct) : "#c8cbc6";
    const dur      = paceAnimDuration(pct);
    const size     = flameSize(pct);
    const filt     = flameFilter(pct);
    const label2   = pct!=null ? pct+"%" : (avg5==null ? "No History" : "0%");
    const accessory = (pct==null || pct<=25)
      ? '<div class="ship2-smoke">💨</div>'
      : (pct>=100 ? '<div class="ship2-sparks"><span></span><span></span><span></span></div>' : "");

    const card = document.createElement("div");
    card.className = "ship2-card";
    card.style.setProperty("--pc-color", color);
    card.style.setProperty("--dur", dur+"s");
    card.innerHTML = `
      <div class="ship2-name" style="color:#0d6748;">${label}</div>
      <div class="ship2-icon-wrap">
        ${accessory}
        <div class="ship2-glow" style="width:${Math.round(size*1.3)}px;height:${Math.round(size*1.3)}px;filter:blur(8px) ${filt};"></div>
        <div class="ship2-icon" style="font-size:${size}px;filter:${filt};">🔥</div>
      </div>
      <div class="ship2-actual">${actual.toLocaleString()}</div>
      <div class="ship2-of">of ${expected!=null ? expected.toLocaleString() : "—"} typical by now</div>
      <div class="ship2-pct">${label2}</div>
    `;
    grid.appendChild(card);
  });
}
function findPlanRecord(dateStr, shift, group) {
  const suffix = group === "drinkware" ? "_drinkware" : "";
  const baseKey = `committed-plan_${dateStr}_${shift}${suffix}`;
  return plansData[baseKey] || plansData[baseKey+"_mid"] || null;
}
function machinePlan(machine, dateStr, shift) {
  const group = DRINKWARE_MACHINES.includes(machine) ? "drinkware" : "standard";
  const rec = findPlanRecord(dateStr, shift, group);
  if (!rec || !rec.machineLoad || rec.machineLoad[machine]==null) return null;
  return rec.machineLoad[machine];
}
function machinePlanWholeDay(machine, dateStr) {
  const day = machinePlan(machine, dateStr, "day");
  const night = machinePlan(machine, dateStr, "night");
  if (day==null && night==null) return null;
  return (day||0) + (night||0);
}
function leadingPieceType(sessions) {
  const map = {};
  sessions.forEach(s => {
    const pt = s.pieceType || "Unknown";
    map[pt] = (map[pt]||0) + (s.qtyGood||0);
  });
  const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  if (!entries.length || entries[0][1]<=0) return null;
  return { label: entries[0][0].split(" · ")[1] || entries[0][0], qty: entries[0][1] };
}

// ── WEEKLY SUMMARY ──
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat"];
function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  d.setDate(d.getDate() + (day===0 ? -6 : 1-day));
  d.setHours(0,0,0,0);
  return d;
}
function weekDates(monday) {
  const dates = [];
  for (let i=0;i<6;i++) { const d=new Date(monday); d.setDate(d.getDate()+i); dates.push(localDateStr(d)); }
  return dates;
}

function renderWeeklySummary() {
  const thisMonday = mondayOf(_nowDate());
  const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate()-7);
  renderWeekRow("week-this-grid", weekDates(thisMonday));
  renderWeekRow("week-last-grid", weekDates(lastMonday));
}

function renderWeekRow(gridId, dateStrs) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  const todayStr = today();

  dateStrs.forEach((dateStr, i) => {
    const box = document.createElement("div");
    box.style.cssText = "background:#ffffff;border:1px solid #e0e3de;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;";

    if (dateStr > todayStr) {
      box.innerHTML = `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:15px;color:#9b9b9b;">${DAY_LABELS[i]}</div>
        <div style="font-size:11px;color:#c8c8c8;text-align:center;padding:14px 0;">—</div>`;
      grid.appendChild(box);
      return;
    }

    const machineTiles = PLAN_MACHINES.map(m => {
      const actual = (machineReports[m]||[]).filter(s=>s.time&&localDateStr(s.time)===dateStr).reduce((a,s)=>a+(s.qtyGood||0),0);
      const plan = machinePlanWholeDay(m, dateStr);
      const pct  = (plan!=null && plan>0) ? Math.round(actual/plan*100) : null;
      const pc   = pct!=null ? oeeColor(pct) : null;
      return `
        <div style="background:#f7f8f6;border-radius:6px;padding:5px 6px;min-width:0;">
          <div style="font-size:10px;font-weight:700;color:${MACHINE_COLORS[m]||'#555'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m}</div>
          <div style="font-size:13px;font-weight:800;color:#232323;white-space:nowrap;">${actual.toLocaleString()}/${plan!=null?plan.toLocaleString():"—"}</div>
          <div style="font-size:9px;color:${pc?pc.text:'#9b9b9b'};">${pct!=null?pct+"% to plan":"no plan"}</div>
        </div>`;
    }).join("");

    const shipTotal = (shipConfirmData[dateStr]||{}).total || 0;
    const shipTile = `
      <div style="background:#eef3f8;border-radius:6px;padding:5px 6px;min-width:0;">
        <div style="font-size:10px;font-weight:700;color:${SHIP_CONFIRM_COLOR};">Shipped</div>
        <div style="font-size:16px;font-weight:800;color:${SHIP_CONFIRM_COLOR};">${shipTotal.toLocaleString()}</div>
      </div>`;

    box.innerHTML = `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:15px;color:#0d6748;">${DAY_LABELS[i]}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;flex:1;">
        ${machineTiles}${shipTile}
      </div>`;
    grid.appendChild(box);
  });
}

function renderChart(td) {
  const canvas = document.getElementById("hourly-chart");
  const legend = document.getElementById("chart-legend");

  const activeMachines = MACHINES.filter(m => (machineReports[m]||[]).some(s=>localDateStr(s.time)===td));
  legend.innerHTML = activeMachines.map(m=>
    `<div class="legend-item"><div class="legend-dot" style="background:${MACHINE_COLORS[m]||'#aaa'}"></div>${m}</div>`
  ).join("") + STATION_STACK.map(s=>
    `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${s.label}</div>`
  ).join("");

  if (!activeMachines.length) {
    canvas.style.display = "none"; return;
  }
  canvas.style.display = "block";

  // Rolling window: current hour at the right edge, up to 7 hours back --
  // never extends earlier than CHART_HOURS_START (6am), since 12am-6am is
  // never a working window. Early in the day this just shows fewer columns
  // (e.g. only 6-7am at 7am) rather than padding with dead hours.
  const effectiveEnd = Math.min(CHART_HOURS_END, Math.max(CHART_HOURS_START, _nowDate().getHours()));
  const windowStart = Math.max(CHART_HOURS_START, effectiveEnd - (CHART_WINDOW_HOURS - 1));
  const hours = [];
  for (let h=windowStart; h<=effectiveEnd; h++) hours.push(h);
  const hourlyData = {};
  activeMachines.forEach(m => {
    hourlyData[m] = {};
    hours.forEach(h => hourlyData[m][h] = 0);
    (machineReports[m]||[]).filter(s=>localDateStr(s.time)===td).forEach(s => {
      const h = new Date(s.time).getHours();
      if (h>=CHART_HOURS_START && h<=CHART_HOURS_END) hourlyData[m][h] += (s.qtyGood||0);
    });
  });
  const shippedByHour = (shipConfirmData[td]||{}).byHour || [];
  const stationByHour = key => (((shippingStatus||{})[key]||{}).byHour) || {};
  // Per-station hourly value for a given stack segment key ("shipped" reuses shipConfirmData)
  const stackForHour = (key, h) => key === "shipped" ? (shippedByHour[h]||0) : (stationByHour(key)[h]||0);

  const dpr = window.devicePixelRatio || 1;
  const cssWidth  = canvas.parentElement.offsetWidth;
  // Canvas height comes from its flex-allocated space (see CSS: #hourly-chart { flex:1 })
  // rather than a fixed constant, so it fills whatever room the rotating view gives it.
  const cssH = canvas.clientHeight || 260;
  const PAD_LEFT=48, PAD_BOTTOM=38, PAD_TOP=16, PAD_RIGHT=12;
  const CHART_H = Math.max(80, cssH - PAD_TOP - PAD_BOTTOM);
  const BAR_GROUP_W = Math.floor((cssWidth-PAD_LEFT-PAD_RIGHT) / hours.length);
  const GROUP_GAP  = 10;  // breathing room between hours
  const INNER_GAP  = 4;   // gap between the printed bar and the shipped bar within an hour
  const usableW    = Math.max(10, BAR_GROUP_W - GROUP_GAP);
  const BAR_W      = Math.max(4, Math.floor((usableW - INNER_GAP) / 2));

  canvas.width  = cssWidth*dpr;
  canvas.height = cssH*dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,cssWidth,cssH);

  const stackedTotals = hours.map(h => activeMachines.reduce((a,m)=>a+(hourlyData[m][h]||0),0));
  const shippedTotals = hours.map(h => STATION_STACK.reduce((a,s)=>a+stackForHour(s.key,h),0));
  const maxVal = Math.max(1, ...stackedTotals, ...shippedTotals);
  const yScale = CHART_H/maxVal;
  const gridLines = 5;

  ctx.strokeStyle="#e0e3de"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  for (let i=0;i<=gridLines;i++) {
    const y = PAD_TOP+CHART_H-(i/gridLines)*CHART_H;
    ctx.beginPath(); ctx.moveTo(PAD_LEFT,y); ctx.lineTo(cssWidth-PAD_RIGHT,y); ctx.stroke();
    ctx.fillStyle="#0d6748"; ctx.font="bold 10px Helvetica,Arial,sans-serif"; ctx.textAlign="right";
    ctx.fillText(Math.round((i/gridLines)*maxVal), PAD_LEFT-5, y+3);
  }
  ctx.setLineDash([]);

  hours.forEach((h,gi) => {
    const groupX = PAD_LEFT + gi*BAR_GROUP_W + GROUP_GAP/2;
    const printedX = groupX;
    const shippedX = groupX + BAR_W + INNER_GAP;

    // Stacked printed bar — one segment per machine
    let cumulative = 0;
    activeMachines.forEach(m => {
      const val = hourlyData[m][h] || 0;
      if (val <= 0) return;
      const yBottom = PAD_TOP + CHART_H - cumulative*yScale;
      const yTop    = yBottom - val*yScale;
      ctx.fillStyle = MACHINE_COLORS[m]||"#aaa";
      ctx.fillRect(printedX, yTop, BAR_W, yBottom-yTop);
      cumulative += val;
    });

    // Shipping pipeline bar — stacked, light-to-dark blue, Collated at bottom up to Shipped
    let shipCumulative = 0;
    STATION_STACK.forEach(s => {
      const val = stackForHour(s.key, h);
      if (val <= 0) return;
      const yBottom = PAD_TOP + CHART_H - shipCumulative*yScale;
      const yTop    = yBottom - val*yScale;
      ctx.fillStyle = s.color;
      ctx.fillRect(shippedX, yTop, BAR_W, yBottom-yTop);
      shipCumulative += val;
    });

    // Hour label
    const label = h>12 ? (h-12)+"pm" : h===12 ? "12pm" : h+"am";
    ctx.fillStyle="#0d6748"; ctx.font="9px Helvetica,Arial,sans-serif"; ctx.textAlign="center";
    ctx.fillText(label, groupX+usableW/2, PAD_TOP+CHART_H+14);
  });
}

function renderCards(td) {
  renderShiftCards("cards-grid-day", td, "day");
  renderShiftCards("cards-grid-night", td, "night");
}

function renderShiftCards(gridId, td, shift) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  const yd = yesterday();
  const [hStart, hEnd] = shiftHourRange(shift);
  const inShift = s => { const h = new Date(s.time).getHours(); return h>=hStart && h<hEnd; };

  PLAN_MACHINES.forEach(machine => {
    const sessions = (machineReports[machine]||[]).filter(s=>localDateStr(s.time)===td).filter(inShift);
    const hasMechDown = maintLog.some(e=>(e.machine||"")=== machine && e.type==="Machine Down" && localDateStr(e.time)===td);
    const machineColor = MACHINE_COLORS[machine]||"#aaaaaa";

    const plan    = machinePlan(machine, td, shift);
    const printed = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const pct     = (plan!=null && plan>0) ? Math.round(printed/plan*100) : null;
    const pc      = pct!=null ? oeeColor(pct) : null;

    const totalTables = sessions.reduce((a,s)=>{
      const isCont = s.mode&&s.mode.startsWith("continuous");
      return a + (isCont ? (s.changeovers||1) : (s.changeovers||0)+1);
    },0);
    const leading = leadingPieceType(sessions);

    const ySessions = (machineReports[machine]||[]).filter(s=>s.time&&localDateStr(s.time)===yd).filter(inShift);
    const yTotal = ySessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const yPlan  = machinePlan(machine, yd, shift);
    const yPct   = (yPlan!=null && yPlan>0) ? Math.round(yTotal/yPlan*100) : null;
    const yPc    = yPct!=null ? oeeColor(yPct) : null;

    if (!sessions.length && plan==null && !yTotal) return; // nothing to show for this shift

    const card = document.createElement("div");
    card.className = "machine-card" + (hasMechDown?" has-down":"");

    card.innerHTML = `
      <div class="card-header">
        <div class="card-machine-name" style="color:${machineColor};">${machine}</div>
      </div>

      <div class="oee-bar-wrap">
        <div class="oee-bar" style="width:${pct!=null?Math.min(100,pct):0}%;background:${pct!=null?pc.bar:'transparent'};"></div>
      </div>

      <div class="apq-row">
        <div class="apq-cell">
          <div class="apq-label">Plan</div>
          <div class="apq-val" style="color:#568e7b;">${plan!=null ? plan.toLocaleString() : "—"}</div>
        </div>
        <div class="apq-cell">
          <div class="apq-label">Printed</div>
          <div class="apq-val" style="color:#0d6748;">${printed.toLocaleString()}</div>
        </div>
        <div class="apq-cell">
          <div class="apq-label">% to Plan</div>
          <div class="apq-val" style="color:${pct!=null?pc.text:'#9b9b9b'};">${pct!=null ? pct+"%" : "—"}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-cell">
          <div class="stat-label">Tables Run</div>
          <div class="stat-val" style="color:${machineColor};">${totalTables}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Leading Piece</div>
          <div class="stat-val" style="font-size:11px;">${leading ? leading.label+" ("+leading.qty+")" : "—"}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-cell">
          <div class="stat-label">Yesterday Total</div>
          <div class="stat-val">${yTotal.toLocaleString()}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Yesterday % to Plan</div>
          <div class="stat-val" style="color:${yPct!=null?yPc.text:'#9b9b9b'};">${yPct!=null ? yPct+"%" : "—"}</div>
        </div>
      </div>

      ${hasMechDown ? `<div class="down-badge">⚠️ Machine Down Today</div>` : ""}
    `;
    grid.appendChild(card);
  });
}

// Pinned strip (shown on all 3 rotating views, below Needs Attention) — just
// the % to plan bar for the shift currently running, no other card data.
function renderShiftProgress(td) {
  const wrap = document.getElementById("shift-progress-items");
  if (!wrap) return;

  const shift = currentShift();
  const [hStart, hEnd] = shiftHourRange(shift);
  const inShift = s => { const h = new Date(s.time).getHours(); return h>=hStart && h<hEnd; };

  wrap.innerHTML = "";
  PLAN_MACHINES.forEach(machine => {
    const sessions = (machineReports[machine]||[]).filter(s=>localDateStr(s.time)===td).filter(inShift);
    const plan     = machinePlan(machine, td, shift);
    const printed  = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const pct      = (plan!=null && plan>0) ? Math.round(printed/plan*100) : null;
    const pc       = pct!=null ? oeeColor(pct) : null;
    const barColor = MACHINE_COLORS[machine] || "#aaaaaa"; // same color the hourly chart uses for this machine

    // Always show all 5 machines — this banner is pinned above all 3 rotating
    // views (Machine Summary, Weekly Performance, Shipping Status), not just
    // Machine Summary, so hiding a machine to match that one view's card grid
    // just looked like a missing bar on the other two.

    const item = document.createElement("div");
    item.className = "spg-item";
    item.innerHTML = `
      <div class="spg-name-row">
        <div class="spg-name" style="color:${barColor};">${machine}</div>
        <div class="spg-pct" style="color:${pct!=null?pc.text:'#9b9b9b'};">${pct!=null ? pct+"%" : "—"}</div>
      </div>
      <div class="spg-bar-wrap">
        <div class="spg-bar" style="width:${pct!=null?Math.min(100,pct):0}%;background:${pct!=null?barColor:'transparent'};"></div>
      </div>
    `;
    wrap.appendChild(item);
  });
}

// VIEW: Pace slide — first pass (plain numbers/bars), "fun" visual TBD.
function renderPace(td) {
  const grid  = document.getElementById("pace2-grid");
  const title = document.getElementById("pace2-shift-title");
  if (!grid) return;

  const shift = currentShift();
  const [hStart, hEnd] = shiftHourRange(shift);
  const inShift = s => { const h = new Date(s.time).getHours(); return h>=hStart && h<hEnd; };
  if (title) title.textContent = shift==="day" ? "Day Shift" : "Night Shift";

  grid.innerHTML = "";
  PLAN_MACHINES.forEach(machine => {
    const group    = paceGroupFor(machine);
    const frac     = shiftElapsedFraction(group, td, shift);
    const plan     = machinePlan(machine, td, shift);
    const sessions = (machineReports[machine]||[]).filter(s=>localDateStr(s.time)===td).filter(inShift);
    const printed  = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const expected = (plan!=null && frac!=null) ? Math.round(plan*frac) : null;
    const pct      = (expected!=null && expected>0) ? Math.round(printed/expected*100) : null;
    const color    = pct!=null ? paceColor(pct) : "#c8cbc6";
    const dur      = paceAnimDuration(pct);
    const size     = flameSize(pct);
    const filt     = flameFilter(pct);
    const leading  = leadingPieceType(sessions);
    const accessory = (pct==null || pct<=25)
      ? '<div class="pace2-smoke">💨</div>'
      : (pct>=100 ? '<div class="pace2-sparks"><span></span><span></span><span></span></div>' : "");

    // Bottom badge is the raw % to the FULL shift plan (not pace) — the icon/
    // animation above stays pace-driven; this number answers a different
    // question ("how's the whole shift looking") side by side with it.
    const planPct = (plan!=null && plan>0) ? Math.round(printed/plan*100) : null;
    const planLabel = planPct!=null ? planPct+"% to plan" : (plan==null ? "No Plan" : "0% to plan");

    const card = document.createElement("div");
    card.className = "pace2-card";
    card.style.setProperty("--pc-color", color);
    card.style.setProperty("--dur", dur+"s");
    card.innerHTML = `
      <div class="pace2-name" style="color:${MACHINE_COLORS[machine]||'#555'};">${machine}</div>
      <div class="pace2-icon-wrap">
        ${accessory}
        <div class="pace2-glow" style="width:${Math.round(size*1.3)}px;height:${Math.round(size*1.3)}px;filter:blur(8px) ${filt};"></div>
        <div class="pace2-icon" style="font-size:${size}px;filter:${filt};">🔥</div>
      </div>
      <div class="pace2-nums">
        <span class="pace2-actual">${printed.toLocaleString()}</span>
        <span class="pace2-of">of ${expected!=null ? expected.toLocaleString() : "—"} expected by now</span>
      </div>
      <div class="pace2-leading">${leading ? "Leading: "+leading.label+" ("+leading.qty+")" : ""}</div>
      <div class="pace2-pct">${planLabel}</div>
    `;
    grid.appendChild(card);
  });
}

// Pieces printed this shift across the print-floor machines -- used as the
// "input" side of the Collation completion bar (Collation's own output feeds
// Assembly, Assembly's feeds Sorting, Sorting's feeds Ready to Ship).
function printedThisShift(shift) {
  const td = today();
  const [hStart, hEnd] = shiftHourRange(shift);
  let total = 0;
  PF_MACHINES.forEach(m => {
    (machineReports[m]||[]).forEach(s => {
      if (!s.time || localDateStr(s.time) !== td) return;
      const h = new Date(s.time).getHours();
      if (h >= hStart && h < hEnd) total += (s.qtyGood||0);
    });
  });
  return total;
}

function renderCompletionBar(id, input, output) {
  const barEl    = document.getElementById("bar-"+id);
  const pctEl    = document.getElementById("pct-"+id);
  const pctCell  = document.getElementById("pctcell-"+id);
  const inputEl  = document.getElementById("input-"+id);
  if (!barEl) return;
  if (inputEl) inputEl.textContent = (input||0).toLocaleString();

  if (!input) {
    barEl.style.width = "0%"; barEl.style.background = "#e0e3de";
    if (pctEl)   { pctEl.textContent = "—"; pctEl.style.color = "#9b9b9b"; }
    if (pctCell) { pctCell.textContent = "no input yet"; pctCell.style.color = "#9b9b9b"; }
    return;
  }
  const pct = Math.round((output/input)*100);
  const pc  = oeeColor(pct);
  barEl.style.width = Math.min(100,pct)+"%";
  barEl.style.background = pc.bar;
  if (pctEl)   { pctEl.textContent = pct+"%"; pctEl.style.color = pc.text; }
  if (pctCell) { pctCell.textContent = pct+"%"; pctCell.style.color = pc.text; }
}

function renderAvg5Cell(id, avg) {
  const el = document.getElementById("avg5-"+id);
  if (el) el.textContent = (avg||0).toLocaleString();
}

function titleCaseType(s) {
  return (s||"").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());
}

function renderExceptions() {
  if (!shippingStatus) return;
  const exc = shippingStatus.exceptions;
  const banner  = document.getElementById("exceptions-banner");
  const titleEl = document.getElementById("exceptions-banner-title");
  const chipsEl = document.getElementById("exceptions-chips");
  if (!banner || !titleEl || !chipsEl || !exc) return;

  if (!exc.count) {
    banner.classList.add("clear");
    titleEl.textContent = "✓ No Exceptions Flagged Today";
    chipsEl.innerHTML = "";
    return;
  }

  banner.classList.remove("clear");
  titleEl.textContent = "⚠ Needs Attention — " + exc.count + " Flagged Today (" + exc.qty + " pcs)";
  chipsEl.innerHTML = "";
  (exc.items||[]).forEach(it => {
    const chip = document.createElement("div");
    chip.className = "exception-chip";
    const pjSpan = document.createElement("span");
    pjSpan.className = "pj";
    pjSpan.textContent = it.pjCode || "No PJ yet";
    chip.appendChild(pjSpan);
    chip.appendChild(document.createTextNode(titleCaseType(it.type) + " (" + it.qty + ")"));
    chipsEl.appendChild(chip);
  });
}

function renderTopMaterials(stationKey, station) {
  const el = document.getElementById("materials-"+stationKey);
  if (!el) return;
  el.innerHTML = "";
  ((station&&station.topMaterials)||[]).forEach(mat => {
    const row = document.createElement("div");
    row.className = "top-materials-row";
    const nameEl = document.createElement("span");
    nameEl.className = "top-materials-name";
    nameEl.textContent = mat.name;
    const qtyEl = document.createElement("span");
    qtyEl.className = "top-materials-qty";
    qtyEl.textContent = mat.qty.toLocaleString();
    row.appendChild(nameEl);
    row.appendChild(qtyEl);
    el.appendChild(row);
  });
}

function renderShipping() {
  if (!shippingStatus) return;
  renderExceptions();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = (val||0).toLocaleString(); };

  // Today's top piece types per station (whole day, not shift-scoped)
  renderTopMaterials("collation",   shippingStatus.collation);
  renderTopMaterials("assembly",    shippingStatus.assembly);
  renderTopMaterials("sorting",     shippingStatus.sorting);
  renderTopMaterials("readyToShip", shippingStatus.readyToShip);

  const sb = shippingStatus.shiftBreakdown;
  if (sb) {
    const shiftName = sb.shift === "day" ? "Day Shift" : "Night Shift";
    const titleEl = document.getElementById("ship-shift-title");
    if (titleEl) titleEl.textContent = shiftName;
    const curLabelEl = document.getElementById("ship-cur-label");
    if (curLabelEl) curLabelEl.textContent = shiftName + " · Today vs. Yesterday";

    setVal("ship-cur-collation", sb.current.collation);
    setVal("ship-cur-assembly",  sb.current.assembly);
    setVal("ship-cur-sorting",   sb.current.sorting);
    setVal("ship-cur-ready",     sb.current.readyToShip);

    setVal("ship-prev-collation", sb.previous.collation);
    setVal("ship-prev-assembly",  sb.previous.assembly);
    setVal("ship-prev-sorting",   sb.previous.sorting);
    setVal("ship-prev-ready",     sb.previous.readyToShip);

    const printedShift = printedThisShift(sb.shift);
    renderCompletionBar("collation",   printedShift,        sb.current.collation);
    renderCompletionBar("assembly",    sb.current.collation, sb.current.assembly);
    renderCompletionBar("sorting",     sb.current.assembly,  sb.current.sorting);
    renderCompletionBar("readyToShip", sb.current.sorting,   sb.current.readyToShip);

    if (sb.avg5) {
      renderAvg5Cell("collation",   sb.avg5.collation);
      renderAvg5Cell("assembly",    sb.avg5.assembly);
      renderAvg5Cell("sorting",     sb.avg5.sorting);
      renderAvg5Cell("readyToShip", sb.avg5.readyToShip);
    }
  }

  const updatedEl = document.getElementById("shipping-updated");
  if (updatedEl && shippingStatus.updatedAt) {
    updatedEl.textContent = "Updated " + new Date(shippingStatus.updatedAt).toLocaleTimeString();
  }
}

// ── FIREBASE LISTENERS ──
function showLoadError(path, err) {
  console.error("Dashboard: failed to load '"+path+"' —", err);
  const loadingEl = document.getElementById("loading");
  const msgEl = document.getElementById("loading-msg");
  if (msgEl) msgEl.textContent = "Couldn't load \"" + path + "\" (" + (err && err.message ? err.message : err) + ") — check Firebase rules allow unauthenticated reads on this path.";
  if (loadingEl) loadingEl.classList.add("load-error");
}

function safeRender() {
  try {
    render();
  } catch (err) {
    showLoadError("render", err);
  }
}

onValue(ref(db,"sessions"), snap => {
  const data = snap.val()||{};
  machineReports = {};
  Object.entries(data).forEach(([machine,sessions]) => {
    machineReports[machine] = Object.values(sessions).map(s=>({...s, time: s.time ? new Date(s.time) : null}));
  });
  loaded.sessions = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("sessions", err));

onValue(ref(db,"maintLog"), snap => {
  const data = snap.val()||{};
  maintLog = Object.values(data).map(e=>({...e, time: e.time ? new Date(e.time) : null}));
  loaded.maint = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("maintLog", err));

onValue(ref(db,"waitLog"), snap => {
  waitLog = Object.values(snap.val()||{});
  loaded.wait = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("waitLog", err));

onValue(ref(db,"targets"), snap => {
  targets = snap.val()||{};
  loaded.targets = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("targets", err));

onValue(ref(db,"shipConfirm"), snap => {
  shipConfirmData = snap.val()||{};
  loaded.shipConfirm = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("shipConfirm", err));

onValue(ref(db,"printtrack-plans"), snap => {
  plansData = snap.val()||{};
  loaded.plans = true;
  if (Object.values(loaded).every(Boolean)) safeRender();
}, err => showLoadError("printtrack-plans", err));

// Open Orders — populated automatically by a scheduled script; the manual
// upload button above still works too and will simply be overwritten by the
// next automated update.
onValue(ref(db,"dashboardOpenOrders"), snap => {
  const data = snap.val();
  if (!data) return;
  _dashOrders = data;
  renderOrdersSidebar();
});

// Shipping status — live queue-depth snapshot from the coworker's Postgres
// database, populated automatically by a scheduled script (shipping_status_sync.py)
onValue(ref(db,"shippingStatus"), snap => {
  shippingStatus = snap.val();
  renderShipping();
  renderShippingPace();
  // The hourly chart's shipping-pipeline stack depends on this data too, but
  // this listener is independent of the main "loaded" gate, so the chart
  // needs an explicit redraw here rather than waiting on the next render().
  if (Object.values(loaded).every(Boolean)) renderChart(today());
}, err => console.error("shippingStatus load failed:", err));

// Auto-refresh chart every 5 minutes
setInterval(() => { if (Object.values(loaded).every(Boolean)) render(); }, 5*60*1000);
window.addEventListener("resize", () => { if (Object.values(loaded).every(Boolean)) renderChart(today()); });

// ── VIEW ROTATION — the chart stays fixed; this cycles the section below it every 10s ──
// A view can be "pinned" per-browser (localStorage, not shared/synced) so one
// coworker can park on a single screen — e.g. Weekly Performance on their own
// laptop — while the TV (a separate browser/device) keeps rotating normally.
// Pace repeats between every other slide (MS, Pace, Weekly, Pace, Shipping, Pace).
const DASH_VIEWS = ["view-today", "view-pace", "view-weekly", "view-pace", "view-shipping", "view-pace"];
const DASH_VIEW_PIN_KEY = "dashViewPin";
let _dashViewIndex = 0;
let _dashViewPin = "auto";
try {
  const saved = localStorage.getItem(DASH_VIEW_PIN_KEY);
  if (saved === "auto" || DASH_VIEWS.includes(saved)) _dashViewPin = saved;
} catch(e) {}

function setDashViewPin(pin) {
  _dashViewPin = pin;
  try { localStorage.setItem(DASH_VIEW_PIN_KEY, pin); } catch(e) {}
  _applyDashViewPin();
  _renderViewPinButtons();
}
// Exposed on window: this is a module script, so top-level functions aren't
// global by default, but index.html's view-pin buttons call this via inline onclick.
window.setDashViewPin = setDashViewPin;
// Pace isn't a real "view-*" element — it's a full swap of #content-main
// (chart, Needs Attention, Shift Progress, view-pin controls, the 3 regular
// views) for #content-pace. #sidebar is a sibling of #content, so it's
// untouched either way.
function _setPaceActive(active) {
  const main = document.getElementById("content-main");
  const pace = document.getElementById("content-pace");
  if (main) main.style.display = active ? "none" : "";
  if (pace) pace.classList.toggle("active", active);
  // The hourly chart's canvas measures its own size (offsetWidth/clientHeight)
  // to draw — those are 0 while #content-main is display:none, so any data
  // refresh that lands while Pace is showing draws an empty/broken chart that
  // then stays broken (nothing else redraws it) until this fires again.
  // Redraw as soon as the chart is visible again to guarantee a real size.
  if (!active && Object.values(loaded).every(Boolean)) renderChart(today());
}
function _applyDashViewPin() {
  if (_dashViewPin === "auto") return; // rotation interval below takes it from here
  DASH_VIEWS.forEach((id, i) => {
    const el = document.getElementById(id); // null for "view-pace" — no-ops below
    if (el) el.classList.toggle("active", id === _dashViewPin);
    if (id === _dashViewPin) _dashViewIndex = i; // keeps rotation in sync if unpinned later
  });
  _setPaceActive(_dashViewPin === "view-pace");
}
function _renderViewPinButtons() {
  document.querySelectorAll(".view-pin-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === _dashViewPin);
  });
}
function rotateDashView() {
  if (_dashViewPin !== "auto") return; // pinned on this browser — don't rotate here
  const currentId = DASH_VIEWS[_dashViewIndex];
  const current = document.getElementById(currentId); // null when currentId is "view-pace"
  if (current) current.classList.remove("active");

  _dashViewIndex = (_dashViewIndex + 1) % DASH_VIEWS.length;
  const nextId = DASH_VIEWS[_dashViewIndex];
  const next = document.getElementById(nextId); // null when nextId is "view-pace"
  if (next) next.classList.add("active");

  _setPaceActive(nextId === "view-pace");
}
_applyDashViewPin();
_renderViewPinButtons();
// Asymmetric timing: 13s on each real view (Machine Summary/Weekly/Shipping
// Status), 7s on each Pace interlude — self-rescheduling instead of a fixed
// setInterval so each slide can get its own duration.
function _scheduleDashRotate() {
  const currentId = DASH_VIEWS[_dashViewIndex];
  const delay = currentId === "view-pace" ? 7000 : 13000;
  setTimeout(() => { rotateDashView(); _scheduleDashRotate(); }, delay);
}
_scheduleDashRotate();
