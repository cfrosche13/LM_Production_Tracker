function getIdealCycle(machine) {
  if (window._targets && window._targets["__oee_cycle_" + machine]) return window._targets["__oee_cycle_" + machine];
  return OEE_IDEAL_CYCLE_DEFAULTS[machine] || 0;
}

// OEE = Availability × Performance × Quality
// Availability  = runTime / plannedTime   (planned = session window = last-first of day)
// Performance   = (totalUnits × idealCycle) / runTimeSec   capped at 1
// Quality       = goodUnits / totalUnits
function calcOEE(machine, dateStr) {
  // Gather sessions for this machine on this date
  const sessions = (machineReports[machine] || []).filter(s => {
    if (!s.time) return false;
    return localDateStr(s.time) === dateStr;
  });
  if (!sessions.length) return null;

  const events = (machineEvents[machine] || []).filter(e => {
    if (!e.time) return false;
    return localDateStr(e.time) === dateStr;
  });

  // Planned time = span from earliest session start to latest session end (approximate using time + totalSec)
  const sessionTimes = sessions.map(s => {
    const end = new Date(s.time).getTime();
    const start = end - (s.totalSec || 0) * 1000;
    return { start, end };
  });
  const plannedStart = Math.min(...sessionTimes.map(t => t.start));
  const plannedEnd   = Math.max(...sessionTimes.map(t => t.end));
  const plannedSec   = (plannedEnd - plannedStart) / 1000;
  if (plannedSec <= 0) return null;

  // Total run time = sum of session totalSec (excludes pauses already)
  const runSec = sessions.reduce((s, r) => s + (r.totalSec || 0), 0);

  // Downtime from machine-down events + wait log on this date
  const maintEntries = maintLog.filter(e => (e.machine || "") === machine && localDateStr(e.time) === dateStr);
  const downEvents   = maintEntries.filter(e => e.type === "Machine Down");
  // We don't store down duration directly — approximate as time between Machine Down and next Operator Fix or 0
  // Use wait log duration for planned downtime instead
  const waitEntries  = waitLog.filter(e => (e.machine || "") === machine && localDateStr(e.time) === dateStr);
  const waitSec      = waitEntries.reduce((s, e) => s + (e.duration || 0), 0);

  const availability = Math.min(1, runSec / plannedSec);

  // Performance
  const idealCycle = getIdealCycle(machine); // sec/unit
  const totalUnits = sessions.reduce((s, r) => s + (r.qtyGood || 0) + (r.qtyBad || 0), 0);
  let performance = 0;
  if (idealCycle > 0 && runSec > 0 && totalUnits > 0) {
    performance = Math.min(1, (totalUnits * idealCycle) / runSec);
  }

  // Quality
  const goodUnits  = sessions.reduce((s, r) => s + (r.qtyGood || 0), 0);
  const quality    = totalUnits > 0 ? goodUnits / totalUnits : 0;

  const oee = availability * performance * quality;

  return {
    oee: Math.round(oee * 100),
    availability: Math.round(availability * 100),
    performance: Math.round(performance * 100),
    quality: Math.round(quality * 100),
    plannedSec, runSec, totalUnits, goodUnits,
    downEvents: downEvents.length
  };
}

function oeeColor(pct) {
  if (pct >= 85) return { bar: "#22aa55", text: "#228844", bg: "#f0fbf5" };
  if (pct >= 65) return { bar: "#88bb22", text: "#558800", bg: "#f8fbee" };
  if (pct >= 40) return { bar: "#ddaa00", text: "#996600", bg: "#fdf8e8" };
  return { bar: "#ee4433", text: "#cc2200", bg: "#fff5f3" };
}

function getTableCapacity(pieceType) {
  // pieceType is stored as "Cat · Sub"
  if (window._targets && window._targets[pieceType] && window._targets[pieceType].ppt) {
    return window._targets[pieceType].ppt;
  }
  return TABLE_CAPACITY_DEFAULTS[pieceType] || 0;
}

function calcEfficiency(qtyGood, changeovers, pieceType, mode) {
  const cap = getTableCapacity(pieceType);
  if (!cap) return null;

  const isContinuous = mode && mode.startsWith('continuous');

  let tables;
  if (isContinuous) {
    // Each lap = one full pass of the table, so laps === tables run
    tables = changeovers || 1; // changeovers field stores lap count in continuous mode
  } else {
    // Stop/Go: changeovers are the swaps *between* tables
    // e.g. 3 changeovers = 4 tables (start + 3 swaps)
    tables = (changeovers || 0) + 1;
  }

  if (!tables) return null;
  const maxPossible = cap * tables;
  const raw = (qtyGood / maxPossible) * 100;
  // Cap at 100% — going over means the capacity default needs adjusting, not that efficiency > 100
  return Math.min(100, Math.round(raw));
}

function efficiencyColor(pct) {
  if (pct >= 90) return { bar: "#22aa55", text: "#228844", bg: "#f0fbf5" };
  if (pct >= 70) return { bar: "#88bb22", text: "#668800", bg: "#f8fbee" };
  if (pct >= 50) return { bar: "#ddaa00", text: "#aa7700", bg: "#fdf8e8" };
  return { bar: "#ee4433", text: "#cc2200", bg: "#fff5f3" };
}
