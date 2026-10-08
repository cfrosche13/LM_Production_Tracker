// ═══════════════════════════════════════
// PRINT SUMMARY FROM AN ORDER DETAIL EXPORT (added 2026-10-08)
// ═══════════════════════════════════════
// Owner's "bandaid" while work is hard to see in Tempo: load a Power BI
// "Order Detail" export (.xlsx) and get, per machine, every SKU with its
// size / material and total qty to print, plus a summary by material size.
// Print opens one page per machine + a summary page (Save as PDF works).
// Nothing is saved to Firebase -- it only lives in this browser tab.
//
// Columns used (matched by header name): Machine, Shortened name, item_id,
// ITEM_NAME, kid_qty, container_no; optional WaveDate, ColorType.
// Rows with no Machine (the export's "Total" row and its filter footer) are
// skipped. Wallets and Windchimes are left out (owner: never in reporting).

let _odData = null;      // { fileName, rows, waves, filters, skipped, totalRow }
let _odOpenMachine = ""; // machine whose SKU list is expanded on screen

const OD_MACHINE_ORDER = ["30", "30+", "H5", "Colex", "Drinkware"];
const OD_EXCLUDE = /wallet|wind ?chime/i;

function odPickFile() {
  const inp = document.getElementById("od-file");
  if (inp) { inp.value = ""; inp.click(); }
}

function odLoadFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const status = document.getElementById("od-status");
  if (status) status.textContent = "Reading " + file.name + "…";
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      _odData = _odParse(raw, file.name);
      _odOpenMachine = "";
      renderOrderDetailSummary();
    } catch (err) {
      _odData = null;
      renderOrderDetailSummary();
      if (status) status.textContent = "✗ Couldn't read that file: " + (err && err.message ? err.message : err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function _odParse(raw, fileName) {
  if (!raw.length) throw new Error("the sheet is empty");
  const need = ["Machine", "Shortened name", "item_id", "kid_qty"];
  const missing = need.filter(c => !(c in raw[0]));
  if (missing.length) throw new Error("missing column(s): " + missing.join(", ") + " — is this an Order Detail export?");
  const rows = [], waves = new Set();
  let filters = "", skipped = 0, totalRow = null;
  raw.forEach(r => {
    const first = String(r.WaveDate || "").trim();
    if (/^Applied filters/i.test(first)) { filters = first.replace(/^Applied filters:\s*/i, ""); return; }
    if (/^Total$/i.test(first)) { totalRow = Number(r.kid_qty) || 0; return; }
    const machine = String(r.Machine || "").trim();
    if (!machine) return;
    const name = String(r.ITEM_NAME || "").replace(/\s{2,}/g, " ").trim();
    if (OD_EXCLUDE.test(machine) || OD_EXCLUDE.test(name) || OD_EXCLUDE.test(String(r["Shortened name"] || ""))) { skipped++; return; }
    const qty = Number(r.kid_qty) || 0;
    rows.push({
      machine, qty, name,
      size: String(r["Shortened name"] || "").trim() || "(no size)",
      sku: String(r.item_id || "").trim(),
      container: String(r.container_no || "").trim(),
      color: String(r.ColorType || "").trim(),
    });
    // Power BI's export has no date style, so the date can arrive as an Excel
    // serial number instead of a Date.
    let w = r.WaveDate;
    if (typeof w === "number" && w > 20000) {
      const p = XLSX.SSF.parse_date_code(w);
      w = p ? new Date(p.y, p.m - 1, p.d) : null;
    } else if (!(w instanceof Date)) {
      const t = w ? new Date(w) : null;
      w = t && !isNaN(t) ? t : null;
    }
    if (w) waves.add((w.getMonth() + 1) + "/" + w.getDate() + "/" + w.getFullYear());
  });
  if (!rows.length) throw new Error("no order lines with a Machine found");
  return { fileName, rows, waves: [...waves].sort(), filters, skipped, totalRow };
}

// { machine: { qty, skus:Set, containers:Set, colors:Set, sizes: { size: { qty, containers:Set, skus: { sku: {name, qty, containers:Set} } } } } }
function _odGroup(rows) {
  const g = {};
  rows.forEach(r => {
    const m = g[r.machine] || (g[r.machine] = { qty: 0, skus: new Set(), containers: new Set(), colors: new Set(), sizes: {} });
    m.qty += r.qty; m.skus.add(r.sku); m.containers.add(r.container); if (r.color) m.colors.add(r.color);
    const s = m.sizes[r.size] || (m.sizes[r.size] = { qty: 0, containers: new Set(), skus: {} });
    s.qty += r.qty; s.containers.add(r.container);
    const k = s.skus[r.sku] || (s.skus[r.sku] = { name: r.name, qty: 0, containers: new Set() });
    k.qty += r.qty; k.containers.add(r.container);
  });
  return g;
}
function _odMachines(g) {
  const keys = Object.keys(g);
  return OD_MACHINE_ORDER.filter(m => keys.includes(m)).concat(keys.filter(m => !OD_MACHINE_ORDER.includes(m)).sort());
}
function _odSizesSorted(m) {
  return Object.entries(m.sizes).sort((a, b) => b[1].qty - a[1].qty);
}
function _odSkusSorted(s) {
  return Object.entries(s.skus).sort((a, b) => b[1].qty - a[1].qty || a[0].localeCompare(b[0]));
}
const _odN = n => Number(n).toLocaleString();

// SKU table for one machine (shared by the screen and the print pages).
function _odMachineTable(m) {
  let h = `<table class="od-table"><thead><tr><th>Size / material</th><th>SKU</th><th>Item name</th><th class="r">Containers</th><th class="r">Total qty</th></tr></thead><tbody>`;
  _odSizesSorted(m).forEach(([size, s]) => {
    _odSkusSorted(s).forEach(([sku, k]) => {
      h += `<tr><td>${esc(size)}</td><td class="b">${esc(sku)}</td><td>${esc(k.name)}</td><td class="r">${_odN(k.containers.size)}</td><td class="r b">${_odN(k.qty)}</td></tr>`;
    });
    h += `<tr class="sub"><td>${esc(size)} subtotal</td><td>${Object.keys(s.skus).length} SKUs</td><td></td><td class="r">${_odN(s.containers.size)}</td><td class="r">${_odN(s.qty)}</td></tr>`;
  });
  h += `<tr class="tot"><td>Machine total</td><td>${m.skus.size} SKUs</td><td></td><td class="r">${_odN(m.containers.size)}</td><td class="r">${_odN(m.qty)}</td></tr>`;
  return h + `</tbody></table>`;
}

// Material size × machine grid (summary page).
function _odSizeGrid(g, machines) {
  const sizes = {};
  machines.forEach(mk => Object.entries(g[mk].sizes).forEach(([size, s]) => {
    const row = sizes[size] || (sizes[size] = { total: 0, skus: new Set(), by: {} });
    row.total += s.qty; row.by[mk] = s.qty; Object.keys(s.skus).forEach(k => row.skus.add(k));
  }));
  const order = Object.entries(sizes).sort((a, b) => b[1].total - a[1].total);
  let h = `<table class="od-table od-grid"><thead><tr><th>Material size</th><th class="r">SKUs</th>${machines.map(m => `<th class="r">${esc(m)}</th>`).join("")}<th class="r">Total qty</th></tr></thead><tbody>`;
  order.forEach(([size, r]) => {
    h += `<tr><td class="b">${esc(size)}</td><td class="r">${r.skus.size}</td>${machines.map(m => `<td class="r">${r.by[m] ? _odN(r.by[m]) : "—"}</td>`).join("")}<td class="r b">${_odN(r.total)}</td></tr>`;
  });
  const allSkus = new Set(); machines.forEach(m => g[m].skus.forEach(k => allSkus.add(k)));
  h += `<tr class="tot"><td>All sizes</td><td class="r">${allSkus.size}</td>${machines.map(m => `<td class="r">${_odN(g[m].qty)}</td>`).join("")}<td class="r">${_odN(machines.reduce((t, m) => t + g[m].qty, 0))}</td></tr>`;
  return h + `</tbody></table>`;
}

function renderOrderDetailSummary() {
  const wrap = document.getElementById("od-results");
  const status = document.getElementById("od-status");
  const printBtn = document.getElementById("od-print-btn");
  const clearBtn = document.getElementById("od-clear-btn");
  if (!wrap) return;
  if (!_odData) {
    wrap.innerHTML = "";
    if (status) status.textContent = "Load a Power BI Order Detail export to see what each machine needs to print.";
    if (printBtn) printBtn.style.display = "none";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }
  const d = _odData, g = _odGroup(d.rows), machines = _odMachines(g);
  const total = d.rows.reduce((t, r) => t + r.qty, 0);
  if (printBtn) printBtn.style.display = "";
  if (clearBtn) clearBtn.style.display = "";
  if (status) {
    status.innerHTML = `<b>${esc(d.fileName)}</b> · ${d.waves.length ? "waved " + esc(d.waves.join(", ")) + " · " : ""}${_odN(d.rows.length)} lines · <b>${_odN(total)} pcs</b>` +
      (d.totalRow != null && d.totalRow !== total + 0 && !d.skipped ? ` · <span style="color:#cc3333">⚠ export's Total row says ${_odN(d.totalRow)}</span>` : "") +
      (d.skipped ? ` · ${d.skipped} wallet/windchime lines left out` : "");
  }
  let h = `<div style="display:grid;grid-template-columns:repeat(${Math.min(machines.length, 4)},1fr);gap:10px;margin-bottom:12px;">`;
  machines.forEach(mk => {
    const m = g[mk], on = _odOpenMachine === mk;
    const sizes = _odSizesSorted(m).map(([s, v]) => `<div style="display:flex;justify-content:space-between;gap:6px;"><span>${esc(s)}</span><b>${_odN(v.qty)}</b></div>`).join("");
    h += `<div onclick="odToggleMachine('${esc(mk)}')" title="Click to see every SKU"
      style="cursor:pointer;background:#fff;border:${on ? "3px solid #1e6b40" : "1px solid #c2e8d0"};border-radius:10px;padding:${on ? "10px 12px" : "12px 14px"};">
      <div style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#2e8b57;text-transform:uppercase;letter-spacing:0.1em;">Machine ${esc(mk)}${on ? " ▾ showing" : ""}</div>
      <div style="font-family:'Abril Fatface',serif;font-size:26px;color:#1a3a28;line-height:1.1;">${_odN(m.qty)}</div>
      <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#7aaa88;margin-bottom:6px;">pcs · ${m.skus.size} SKUs · ${_odN(m.containers.size)} containers</div>
      <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#1a2a18;display:flex;flex-direction:column;gap:2px;">${sizes}</div>
    </div>`;
  });
  h += `</div>`;
  if (_odOpenMachine && g[_odOpenMachine]) {
    h += `<div style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;color:#1e6b40;margin:4px 0 6px;">Machine ${esc(_odOpenMachine)} — every SKU</div>` + _odMachineTable(g[_odOpenMachine]);
  } else {
    h += `<div style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;color:#2e8b57;text-transform:uppercase;letter-spacing:0.12em;margin:6px 0;">By material size</div>` + _odSizeGrid(g, machines);
  }
  wrap.innerHTML = h;
}

function odToggleMachine(mk) {
  _odOpenMachine = _odOpenMachine === mk ? "" : mk;
  renderOrderDetailSummary();
}

function odClear() {
  _odData = null;
  _odOpenMachine = "";
  renderOrderDetailSummary();
}

// One page per machine, then the summary page. Uses the browser's print
// dialog, so "Save as PDF" gives the same PDF the owner asked for.
function odPrint() {
  if (!_odData) return;
  const d = _odData, g = _odGroup(d.rows), machines = _odMachines(g);
  const total = d.rows.reduce((t, r) => t + r.qty, 0);
  const now = new Date();
  const meta = `Source: ${esc(d.fileName)}${d.waves.length ? " · Waved " + esc(d.waves.join(", ")) : ""} · Printed ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  let body = "";
  machines.forEach(mk => {
    const m = g[mk];
    const strip = _odSizesSorted(m).map(([s, v]) => `${esc(s)}: <b>${_odN(v.qty)}</b>`).join(" &nbsp;|&nbsp; ");
    body += `<section class="page"><h1>Machine ${esc(mk)}</h1><div class="meta">${meta}</div>
      <div class="big">Total to print: ${_odN(m.qty)} pcs · ${m.skus.size} SKUs · ${_odN(m.containers.size)} containers${m.colors.size ? " · " + esc([...m.colors].join(", ")) : ""}</div>
      <div class="strip">${strip}</div>${_odMachineTable(m)}</section>`;
  });
  let byMachine = `<table class="od-table"><thead><tr><th>Machine</th><th>Material size</th><th class="r">SKUs</th><th class="r">Containers</th><th class="r">Total qty</th></tr></thead><tbody>`;
  machines.forEach(mk => {
    const m = g[mk];
    _odSizesSorted(m).forEach(([s, v]) => {
      byMachine += `<tr><td>${esc(mk)}</td><td>${esc(s)}</td><td class="r">${Object.keys(v.skus).length}</td><td class="r">${_odN(v.containers.size)}</td><td class="r">${_odN(v.qty)}</td></tr>`;
    });
    byMachine += `<tr class="sub"><td>${esc(mk)} total</td><td></td><td class="r">${m.skus.size}</td><td class="r">${_odN(m.containers.size)}</td><td class="r">${_odN(m.qty)}</td></tr>`;
  });
  const allC = new Set(d.rows.map(r => r.container)), allS = new Set(d.rows.map(r => r.sku));
  byMachine += `<tr class="tot"><td>Grand total</td><td></td><td class="r">${allS.size}</td><td class="r">${_odN(allC.size)}</td><td class="r">${_odN(total)}</td></tr></tbody></table>`;
  body += `<section class="page"><h1>Summary by Material Size</h1><div class="meta">${meta}</div>${_odSizeGrid(g, machines)}
    <h2>By machine</h2>${byMachine}
    ${d.filters ? `<div class="meta" style="margin-top:14px;white-space:pre-line">Export filters: ${esc(d.filters)}</div>` : ""}
    ${d.skipped ? `<div class="meta">${d.skipped} wallet/windchime lines left out.</div>` : ""}</section>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Your browser blocked the print window — allow pop-ups for this site and try again."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print Summary - ${esc(d.fileName)}</title><style>
    @page { size: letter; margin: 0.45in; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a2a18; margin: 0; }
    .page { page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; break-after: auto; }
    h1 { font-size: 20px; color: #1b5e3a; margin: 0 0 2px; }
    h2 { font-size: 13px; color: #1b5e3a; margin: 16px 0 4px; }
    .meta { font-size: 9px; color: #666; margin-bottom: 8px; }
    .big { font-size: 13px; font-weight: 700; color: #1b5e3a; }
    .strip { font-size: 10px; margin: 2px 0 8px; }
    ${_odTableCss()}
    .od-grid td, .od-grid th { padding: 5px 6px; font-size: 11px; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

function _odTableCss() {
  return `.od-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .od-table th { background: #1b5e3a; color: #fff; text-align: left; padding: 3px 6px; font-weight: 700; }
    .od-table td { padding: 2px 6px; border-bottom: 1px solid #d5ddd8; }
    .od-table .r { text-align: right; }
    .od-table .b { font-weight: 700; }
    .od-table tr.sub td { background: #f3f6f4; font-weight: 700; }
    .od-table tr.tot td { background: #e8f3ec; font-weight: 700; font-size: 12px; border-top: 1.5px solid #1b5e3a; }`;
}

// Same table look on screen (once, at load).
(function () {
  const st = document.createElement("style");
  st.textContent = _odTableCss() + `
    #od-results .od-table { font-family: 'Josefin Slab', serif; font-size: 11px; background: #fff; }
    #od-results .od-table td, #od-results .od-table th { padding: 4px 8px; }`;
  document.head.appendChild(st);
})();
