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
const MACHINE_COLORS = { "30":"#0d6748","30+":"#1a7a54","H5":"#2e9e6e","Colex":"#52b888","Wallets":"#7aca9e","Drinkware M1":"#a8ddb8","Drinkware M2":"#85c99e" };
const OEE_IDEAL_CYCLE_DEFAULTS = { "30":94, "30+":42.5, "H5":32.5, "Colex":0, "Wallets":0, "Drinkware M1":0, "Drinkware M2":0 };
const CHART_HOURS_START = 6;
const CHART_HOURS_END   = 23; // 6am to end of 11pm hour (covers the 11:30pm shift end)
const SHIP_CONFIRM_COLOR = "#3a6ea5";

// ── STATE ──
let machineReports = {};
let machineEvents  = {};
let maintLog       = [];
let waitLog        = [];
let targets        = {};
let shipConfirmData = {};
let loaded         = { sessions: false, maint: false, wait: false, targets: false, shipConfirm: false };

function fmt(s) {
  return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function localDateStr(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
}
function today() { return localDateStr(new Date()); }
function getIdealCycle(machine) {
  if (targets["__oee_cycle_"+machine]) return targets["__oee_cycle_"+machine];
  return OEE_IDEAL_CYCLE_DEFAULTS[machine] || 0;
}
function oeeColor(pct) {
  if (pct >= 85) return { bar:"#0d6748", text:"#0d6748" };
  if (pct >= 65) return { bar:"#568e7b", text:"#568e7b" };
  if (pct >= 40) return { bar:"#8aaa44", text:"#8aaa44" };
  return { bar:"#c4770a", text:"#c4770a" };
}

function calcOEE(machine) {
  const td = today();
  const sessions = (machineReports[machine]||[]).filter(s => s.time && localDateStr(s.time)===td);
  if (!sessions.length) return null;
  const times = sessions.map(s => { const e=new Date(s.time).getTime(); return {s:e-(s.totalSec||0)*1000,e}; });
  const plannedSec = (Math.max(...times.map(t=>t.e)) - Math.min(...times.map(t=>t.s))) / 1000;
  if (plannedSec<=0) return null;
  const runSec      = sessions.reduce((a,s)=>a+(s.totalSec||0),0);
  const totalUnits  = sessions.reduce((a,s)=>a+(s.qtyGood||0)+(s.qtyBad||0),0);
  const goodUnits   = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
  const availability= Math.min(1, runSec/plannedSec);
  const idealCycle  = getIdealCycle(machine);
  const performance = (idealCycle>0 && runSec>0 && totalUnits>0) ? Math.min(1,(totalUnits*idealCycle)/runSec) : 0;
  const quality     = totalUnits>0 ? goodUnits/totalUnits : 0;
  return {
    oee:          Math.round(availability*performance*quality*100),
    availability: Math.round(availability*100),
    performance:  Math.round(performance*100),
    quality:      Math.round(quality*100),
    runSec, totalUnits, goodUnits
  };
}

function yesterday() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return localDateStr(d);
}

function calcOEEForDate(machine, dateStr) {
  const sessions = (machineReports[machine]||[]).filter(s => s.time && localDateStr(s.time)===dateStr);
  if (!sessions.length) return null;
  const times = sessions.map(s => { const e=new Date(s.time).getTime(); return {s:e-(s.totalSec||0)*1000,e}; });
  const plannedSec = (Math.max(...times.map(t=>t.e)) - Math.min(...times.map(t=>t.s))) / 1000;
  if (plannedSec<=0) return null;
  const runSec     = sessions.reduce((a,s)=>a+(s.totalSec||0),0);
  const totalUnits = sessions.reduce((a,s)=>a+(s.qtyGood||0)+(s.qtyBad||0),0);
  const goodUnits  = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
  const avail      = Math.min(1, runSec/plannedSec);
  const idealCycle = getIdealCycle(machine);
  const perf       = (idealCycle>0 && runSec>0 && totalUnits>0) ? Math.min(1,(totalUnits*idealCycle)/runSec) : 0;
  const qual       = totalUnits>0 ? goodUnits/totalUnits : 0;
  return {
    oee: Math.round(avail*perf*qual*100),
    availability: Math.round(avail*100),
    performance:  Math.round(perf*100),
    quality:      Math.round(qual*100),
    runSec, totalUnits, goodUnits
  };
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

  const today = new Date();
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
  document.getElementById("last-updated").textContent  = "Updated " + new Date().toLocaleTimeString();
  document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  renderChart(td);
  renderCards(td);
  renderPrevDay();
  document.getElementById("loading").style.display = "none";
}

function renderPrevDay() {
  const yd = yesterday();
  const ydLabel = new Date(yd + "T12:00:00").toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"});
  const titleEl = document.getElementById("prev-day-title");
  if (titleEl) titleEl.textContent = "Previous Day — " + ydLabel;

  // ── DEPARTMENT TOTALS ──
  const deptRow = document.getElementById("prev-dept-row");
  if (!deptRow) return;
  deptRow.innerHTML = "";

  let printGood=0, printBad=0, stampGood=0, stampBad=0;
  PF_MACHINES.forEach(m => {
    (machineReports[m]||[]).filter(s=>s.time&&localDateStr(s.time)===yd).forEach(s=>{
      printGood += s.qtyGood||0; printBad += s.qtyBad||0;
    });
  });
  STAMPED_MACHINES.forEach(m => {
    (machineReports[m]||[]).filter(s=>s.time&&localDateStr(s.time)===yd).forEach(s=>{
      stampGood += s.qtyGood||0; stampBad += s.qtyBad||0;
    });
  });

  // Dept OEE — average of machines that have data
  function deptOEE(machines) {
    const vals = machines.map(m => calcOEEForDate(m, yd)).filter(o => o && o.oee > 0);
    if (!vals.length) return null;
    return {
      oee:          Math.round(vals.reduce((a,o)=>a+o.oee,         0)/vals.length),
      availability: Math.round(vals.reduce((a,o)=>a+o.availability,0)/vals.length),
      performance:  Math.round(vals.reduce((a,o)=>a+o.performance, 0)/vals.length),
      quality:      Math.round(vals.reduce((a,o)=>a+o.quality,     0)/vals.length),
    };
  }
  const printOEE = deptOEE(PF_MACHINES);

  // Windchimes totals
  let windGood=0, windBad=0;
  (machineReports["Windchimes"]||[]).filter(s=>s.time&&localDateStr(s.time)===yd).forEach(s=>{
    windGood += s.qtyGood||0; windBad += s.qtyBad||0;
  });

  [
    { label:"Printing Dept", good:printGood, bad:printBad, oee:printOEE, color:"#0d6748", bg:"#ffffff", border:"#e0e3de" },
    { label:"Stamped Dept",  good:stampGood, bad:stampBad, oee:null,     color:"#568e7b", bg:"#ffffff", border:"#e0e3de" },
    { label:"Windchimes",    good:windGood,  bad:windBad,  oee:null,     color:"#7a9e6e", bg:"#ffffff", border:"#e0e3de" }
  ].forEach(({label,good,bad,oee,color,bg,border}) => {
    const oc = oee ? oeeColor(oee.oee) : null;
    const cell = document.createElement("div");
    cell.style.cssText = `background:${bg};border:2px solid ${border};border-radius:10px;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;gap:14px;`;
    cell.innerHTML = `
      <div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.14em;color:${color};margin-bottom:2px;">${label} — Total Good</div>
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:34px;color:${color};line-height:1;">${good.toLocaleString()}</div>
        ${bad ? `<div style="font-size:10px;color:#c4770a;margin-top:2px;">${bad} bad units</div>` : `<div style="font-size:10px;color:${color};opacity:0.5;margin-top:2px;">0 bad units</div>`}
      </div>
      ${oee ? `
      <div style="text-align:right;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:${color};opacity:0.7;margin-bottom:2px;">Dept OEE</div>
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:28px;color:${oc.text};line-height:1;">${oee.oee}%</div>
        <div style="background:#e0e3de;border-radius:99px;height:4px;overflow:hidden;margin:4px 0;">
          <div style="height:100%;width:${oee.oee}%;background:${oc.bar};border-radius:99px;"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <div style="font-size:8px;color:${color};opacity:0.8;">A: ${oee.availability}%</div>
          <div style="font-size:8px;color:${color};opacity:0.8;">P: ${oee.performance}%</div>
          <div style="font-size:8px;color:${color};opacity:0.8;">Q: ${oee.quality}%</div>
        </div>
      </div>` : `<div style="font-size:10px;color:${color};opacity:0.4;text-align:right;">No OEE data</div>`}`;
    deptRow.appendChild(cell);
  });

  // ── PER MACHINE ──
  const grid = document.getElementById("prev-machine-grid");
  if (!grid) return;
  grid.innerHTML = "";

  MACHINES.forEach(machine => {
    const sessions = (machineReports[machine]||[]).filter(s=>s.time&&localDateStr(s.time)===yd);
    const oee = calcOEEForDate(machine, yd);
    const machineColor = MACHINE_COLORS[machine]||"#568e7b";

    const card = document.createElement("div");
    card.style.cssText = "background:#ffffff;border:1px solid #e0e3de;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:5px;min-width:0;";

    if (!sessions.length) {
      card.innerHTML = `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:18px;color:${machineColor};">${machine}</div>
        <div style="font-size:10px;color:#9b9b9b;text-align:center;padding:6px 0;">No data</div>`;
      grid.appendChild(card);
      return;
    }

    // Piece type breakdown
    const pieceMap = {};
    sessions.forEach(s => {
      const pt = s.pieceType || "Unknown";
      if (!pieceMap[pt]) pieceMap[pt] = { good:0, bad:0 };
      pieceMap[pt].good += s.qtyGood||0;
      pieceMap[pt].bad  += s.qtyBad||0;
    });
    const totalGood  = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const totalBad   = sessions.reduce((a,s)=>a+(s.qtyBad||0),0);

    const oc = oee ? oeeColor(oee.oee) : null;

    // Piece type rows — sorted by qty desc
    const ptRows = Object.entries(pieceMap)
      .sort((a,b)=>b[1].good-a[1].good)
      .map(([pt,qty]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #e0e3de;">
          <span style="font-size:9px;color:#232323;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pt.split(" · ")[1]||pt}</span>
          <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:13px;color:#0d6748;margin-left:6px;">${qty.good}</span>
        </div>`).join("");

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:15px;color:${machineColor};">${machine}</div>
        ${oee ? `<div style="text-align:right;">
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:16px;color:${oc.text};">${oee.oee}%</div>
          <div style="font-size:6px;text-transform:uppercase;letter-spacing:0.08em;color:#6b6b6b;">OEE</div>
        </div>` : ""}
      </div>
      ${oee ? `<div style="background:#e0e3de;border-radius:99px;height:4px;overflow:hidden;">
        <div style="height:100%;width:${oee.oee}%;background:${oc.bar};border-radius:99px;"></div>
      </div>` : ""}
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.08em;color:#6b6b6b;border-bottom:1px solid #e0e3de;padding-bottom:3px;margin-bottom:1px;">Piece Types</div>
      <div style="display:flex;flex-direction:column;gap:1px;">${ptRows}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:1px;">
        <div style="background:#f7f8f6;border-radius:5px;padding:4px 6px;">
          <div style="font-size:6px;text-transform:uppercase;color:#6b6b6b;">Good</div>
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:13px;color:#0d6748;">${totalGood.toLocaleString()}</div>
        </div>
        <div style="background:#f7f8f6;border-radius:5px;padding:4px 6px;">
          <div style="font-size:6px;text-transform:uppercase;color:#6b6b6b;">Bad</div>
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:13px;color:${totalBad>0?"#c4770a":"#0d6748"};">${totalBad}</div>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function renderChart(td) {
  const canvas = document.getElementById("hourly-chart");
  const legend = document.getElementById("chart-legend");

  const activeMachines = MACHINES.filter(m => (machineReports[m]||[]).some(s=>localDateStr(s.time)===td));
  legend.innerHTML = activeMachines.map(m=>
    `<div class="legend-item"><div class="legend-dot" style="background:${MACHINE_COLORS[m]||'#aaa'}"></div>${m}</div>`
  ).join("") + `<div class="legend-item"><div class="legend-dot" style="background:${SHIP_CONFIRM_COLOR}"></div>Shipped</div>`;

  if (!activeMachines.length) {
    canvas.style.display = "none"; return;
  }
  canvas.style.display = "block";

  // Build hourly data across the full shift window (6am–11pm hour, covers an 11:30pm end)
  const hours = [];
  for (let h=CHART_HOURS_START; h<=CHART_HOURS_END; h++) hours.push(h);
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
  const shippedForHour = h => shippedByHour[h] || 0;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth  = canvas.parentElement.offsetWidth;
  const PAD_LEFT=48, PAD_BOTTOM=38, PAD_TOP=16, PAD_RIGHT=12;
  const CHART_H=200;
  const cssH = CHART_H + PAD_TOP + PAD_BOTTOM;
  const BAR_GROUP_W = Math.floor((cssWidth-PAD_LEFT-PAD_RIGHT) / hours.length);
  const GROUP_GAP  = 10;  // breathing room between hours
  const INNER_GAP  = 4;   // gap between the printed bar and the shipped bar within an hour
  const usableW    = Math.max(10, BAR_GROUP_W - GROUP_GAP);
  const BAR_W      = Math.max(4, Math.floor((usableW - INNER_GAP) / 2));

  canvas.width  = cssWidth*dpr;
  canvas.height = cssH*dpr;
  canvas.style.height = cssH+"px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,cssWidth,cssH);

  const stackedTotals = hours.map(h => activeMachines.reduce((a,m)=>a+(hourlyData[m][h]||0),0));
  const shippedTotals = hours.map(h => shippedForHour(h));
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

    // Shipped bar — single color
    const shipVal = shippedForHour(h);
    if (shipVal > 0) {
      const shipH = shipVal*yScale;
      ctx.fillStyle = SHIP_CONFIRM_COLOR;
      ctx.fillRect(shippedX, PAD_TOP+CHART_H-shipH, BAR_W, shipH);
    }

    // Hour label
    const label = h>12 ? (h-12)+"pm" : h===12 ? "12pm" : h+"am";
    ctx.fillStyle="#0d6748"; ctx.font="9px Helvetica,Arial,sans-serif"; ctx.textAlign="center";
    ctx.fillText(label, groupX+usableW/2, PAD_TOP+CHART_H+14);
  });
}

function renderCards(td) {
  const grid = document.getElementById("cards-grid");
  grid.innerHTML = "";

  MACHINES.forEach(machine => {
    const sessions = (machineReports[machine]||[]).filter(s=>localDateStr(s.time)===td);
    const oee = calcOEE(machine);
    const hasMechDown = maintLog.some(e=>(e.machine||"")=== machine && e.type==="Machine Down" && localDateStr(e.time)===td);

    const card = document.createElement("div");
    card.className = "machine-card" + (hasMechDown?" has-down":"");

    const totalRunSec    = sessions.reduce((a,s)=>a+(s.totalSec||0),0);
    const totalGood      = sessions.reduce((a,s)=>a+(s.qtyGood||0),0);
    const totalBad       = sessions.reduce((a,s)=>a+(s.qtyBad||0),0);
    const totalTables    = sessions.reduce((a,s)=>{
      const isCont = s.mode&&s.mode.startsWith("continuous");
      return a + (isCont ? (s.changeovers||1) : (s.changeovers||0)+1);
    },0);
    const machineColor   = MACHINE_COLORS[machine]||"#aaaaaa";

    if (!sessions.length && !oee) {
      // Hide cards with no data
      return;
    }

    const oc = oee ? oeeColor(oee.oee) : null;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-machine-name" style="color:${machineColor};">${machine}</div>
        ${oee ? `
        <div class="card-oee-block">
          <div class="card-oee-pct" style="color:${oc.text};">${oee.oee}%</div>
          <div class="card-oee-label">OEE</div>
        </div>` : ""}
      </div>

      ${oee ? `
      <div class="oee-bar-wrap">
        <div class="oee-bar" style="width:${oee.oee}%;background:${oc.bar};"></div>
      </div>
      <div class="apq-row">
        <div class="apq-cell">
          <div class="apq-label">Availability</div>
          <div class="apq-val" style="color:#568e7b;">${oee.availability}%</div>
        </div>
        <div class="apq-cell">
          <div class="apq-label">Performance</div>
          <div class="apq-val" style="color:#0d6748;">${oee.performance}%</div>
        </div>
        <div class="apq-cell">
          <div class="apq-label">Quality</div>
          <div class="apq-val" style="color:#0d6748;">${oee.quality}%</div>
        </div>
      </div>` : `<div style="font-size:10px;color:#555;font-style:italic;">No ideal cycle time set — OEE unavailable</div>`}

      <div class="stats-row">
        <div class="stat-cell">
          <div class="stat-label">Run Time</div>
          <div class="stat-val">${fmt(totalRunSec)}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Tables</div>
          <div class="stat-val" style="color:${machineColor};">${totalTables}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-cell">
          <div class="stat-label">Good Units</div>
          <div class="stat-val qty-good">${totalGood.toLocaleString()}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Bad Units</div>
          <div class="stat-val qty-bad">${totalBad}</div>
        </div>
      </div>

      ${hasMechDown ? `<div class="down-badge">⚠️ Machine Down Today</div>` : ""}
    `;
    grid.appendChild(card);
  });
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

// Auto-refresh chart every 5 minutes
setInterval(() => { if (Object.values(loaded).every(Boolean)) render(); }, 5*60*1000);
window.addEventListener("resize", () => { if (Object.values(loaded).every(Boolean)) renderChart(today()); });
