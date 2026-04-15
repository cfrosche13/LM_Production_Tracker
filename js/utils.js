function makeOption(val, label) {
  const o = document.createElement("option"); o.value = val; o.textContent = label; return o;
}
function refreshTopSubtype() {
  const sel = document.getElementById("global-subtype");
  sel.innerHTML = "";
  (PIECE_TYPES[document.getElementById("global-category").value]||[]).forEach(t => sel.appendChild(makeOption(t,t)));
}
function refreshModalSubtype() {
  const sel = document.getElementById("f-piecetype");
  sel.innerHTML = "";
  (PIECE_TYPES[document.getElementById("f-category").value]||[]).forEach(t => sel.appendChild(makeOption(t,t)));
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function setReportDateToday() {
  const t = todayStr();
  document.getElementById("report-date-from").value = t;
  document.getElementById("report-date-to").value   = t;
  renderReports();
}

function setReportDateYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  document.getElementById("report-date-from").value = y;
  document.getElementById("report-date-to").value   = y;
  renderReports();
}

function localDateStr(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function isInDateRange(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  const dStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  const from = document.getElementById("report-date-from")?.value;
  const to   = document.getElementById("report-date-to")?.value;
  if (!from && !to) return true;
  if (from && to)   return dStr >= from && dStr <= to;
  if (from)         return dStr >= from;
  if (to)           return dStr <= to;
  return true;
}

function fmt(s) {
  s = Math.floor(s || 0);
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function fmtDate(d) {
  return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) + " · " + d.toLocaleDateString([],{month:"short",day:"numeric"});
}
function openModal(id)  { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

function esc(str) { return (str||"").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
