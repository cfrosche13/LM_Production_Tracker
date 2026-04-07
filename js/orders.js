// ═══════════════════════════════════════
// OPEN ORDERS
// ═══════════════════════════════════════
// (ORDER_PIECE_MAP declared in constants.js)

function mapOrderPieceType(raw) {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  // Exact match
  if (ORDER_PIECE_MAP[raw.trim()]) return ORDER_PIECE_MAP[raw.trim()];
  // Case-insensitive match
  for (const [k,v] of Object.entries(ORDER_PIECE_MAP)) {
    if (k.toUpperCase() === upper) return v;
  }
  // Fuzzy — check if any key is contained in the raw string
  for (const [k,v] of Object.entries(ORDER_PIECE_MAP)) {
    if (upper.includes(k.toUpperCase()) || k.toUpperCase().includes(upper)) return v;
  }
  return raw.trim(); // unmapped — keep original
}

// (_openOrdersData declared in state.js)

function settingsSaveOrdersUrl() {
  const url = document.getElementById("settings-orders-url")?.value.trim();
  if (!window._targets) window._targets = {};
  window._targets["__orders_url"] = url;
  if (window._fb) window._fb.saveTargets(window._targets);
  const btn = document.querySelector("button[onclick='settingsSaveOrdersUrl()']");
  if (btn) { btn.textContent = "✓ Saved"; setTimeout(() => btn.textContent = "Save URL", 2000); }
}


async function fetchOpenOrders() {
  const url = window._targets?.["__orders_url"];
  if (!url) return;
  const btn = document.getElementById("orders-refresh-btn");
  if (btn) btn.textContent = "⏳ Fetching…";

  // Try direct first, then fall back through CORS proxies
  const attempts = [
    () => fetch(url),
    () => fetch("https://corsproxy.io/?" + encodeURIComponent(url)),
    () => fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url)),
    () => fetch("https://cors-anywhere.herokuapp.com/" + url, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      if (btn) btn.textContent = "⏳ Trying " + (i === 0 ? "direct" : "proxy " + i) + "…";
      const resp = await attempts[i]();
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const buf = await resp.arrayBuffer();
      parseOrdersXLSX(buf);
      if (btn) btn.textContent = "↺ Refresh";
      console.log("Open orders fetched via attempt", i === 0 ? "direct" : "proxy " + i);
      return; // success — stop trying
    } catch(e) {
      console.warn("Attempt " + i + " failed:", e.message);
    }
  }

  // All attempts failed
  if (btn) btn.textContent = "✗ Failed — use Upload";
  setTimeout(() => { if (btn) btn.textContent = "↺ Refresh"; }, 4000);
  // Show a helpful message on the orders tab
  const lastUpd = document.getElementById("orders-last-updated");
  if (lastUpd) lastUpd.textContent = "Auto-fetch blocked — please use ⬆ Upload File";
}


function handleOrdersUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => parseOrdersXLSX(e.target.result);
  reader.readAsArrayBuffer(file);
}


function handleOrdersDrop(event) {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => parseOrdersXLSX(e.target.result);
  reader.readAsArrayBuffer(file);
}


function parseOrdersXLSX(buffer) {
  // Use SheetJS if available, otherwise show instructions
  if (typeof XLSX === "undefined") {
    console.warn("SheetJS not loaded");
    return;
  }
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // DEBUG — log all column headers and first row to console so we can see exact names
  if (rows.length > 0) {
    console.log("=== OPEN ORDERS DEBUG ===");
    console.log("Column headers:", Object.keys(rows[0]));
    console.log("First row sample:", rows[0]);
    // Find any column that looks FBA-related
    const fbaLike = Object.keys(rows[0]).filter(k => k.toString().toUpperCase().includes("FBA"));
    console.log("FBA-related columns found:", fbaLike);
    if (fbaLike.length > 0) {
      console.log("Sample FBA values (first 5 rows):", rows.slice(0,5).map(r => fbaLike.map(k => k + "=" + r[k])));
    }
  }

  const today = new Date();
  const byType = {};
  const aging = { "0-1 Days":0, "2-3 Days":0, "4-7 Days":0, "8+ Days":0 };
  let total = 0;
  let fbaTotal = 0;
  let dsTotal  = 0;
  let regTotal = 0;

  rows.forEach(row => {
    const confirm = row["ConfirmDate"];
    const closed  = row["TaskClosed"];
    if (confirm || closed) return; // already done

    const rawType = row["BlankLine"] || row["item_id"] || "";
    const mapped  = mapOrderPieceType(rawType);
    const qty     = parseInt(row["kid_qty"] || row["qty"] || 1) || 1;
    const waveDate = row["WaveDate"];

    // FBA flag — column "Is FBA Y/N" with value "Y" or "N"
    const fbaVal = (row["Is FBA Y/N"] || row["IS FBA Y/N"] || row["fba"] || row["FBA"] || "").toString().trim().toUpperCase();
    const isFBA  = fbaVal === "Y" || fbaVal === "YES" || fbaVal === "TRUE" || fbaVal === "1";

    // Order type classification
    // DS(DS) = drop ship | DS(FAIRE) = reg | REG(...) = reg | ASAP(...) = reg
    const orderType = (row["OrderType"] || row["ordertype"] || row["order_type"] || "").toString().trim().toUpperCase();
    const isDS  = orderType.includes("DS(DS)");
    const isReg = !isFBA && (
      orderType.includes("REG(")  ||
      orderType.includes("ASAP(") ||
      orderType.includes("DS(FAIRE)")
    );

    if (mapped) {
      byType[mapped] = (byType[mapped] || 0) + qty;
      total += qty;
      if (isFBA) fbaTotal += qty;
      if (isDS)  dsTotal  += qty;
      if (isReg) regTotal += qty;
    }

    // Aging — WaveDate comes in as Excel serial number when cellDates isn't converting it
    if (waveDate) {
      let wd;
      if (waveDate instanceof Date) {
        wd = waveDate;
      } else if (typeof waveDate === "number") {
        // Excel serial date: days since 1900-01-01 (with Lotus 1-2-3 leap year bug)
        wd = new Date((waveDate - 25569) * 86400 * 1000);
      } else if (typeof waveDate === "string" && waveDate.trim()) {
        wd = new Date(waveDate);
      }
      if (wd && !isNaN(wd)) {
        const ageDays = Math.floor((today - wd) / 86400000);
        if      (ageDays <= 1) aging["0-1 Days"] += qty;
        else if (ageDays <= 3) aging["2-3 Days"] += qty;
        else if (ageDays <= 7) aging["4-7 Days"] += qty;
        else                   aging["8+ Days"]  += qty;
      }
    }
  });

  _openOrdersData = { byType, aging, total, fbaTotal, dsTotal, regTotal, fetchedAt: new Date().toISOString() };

  // Save to Firebase so all devices receive the update in real time
  if (window._fb) {
    window._fb.saveOrders({
      byType, aging, total, fbaTotal, dsTotal, regTotal,
      fetchedAt: new Date().toISOString()
    });
  }

  renderOpenOrders();

  const btn = document.getElementById("orders-refresh-btn");
  if (btn) btn.textContent = "↺ Refresh";
}


function renderOpenOrders() {
  const empty   = document.getElementById("orders-empty");
  const summary = document.getElementById("orders-summary");
  const agingEl = document.getElementById("orders-aging");
  const byTypeEl= document.getElementById("orders-by-type");
  const lastUpd = document.getElementById("orders-last-updated");

  const dropzone = document.getElementById("orders-dropzone");
  if (!_openOrdersData) {
    if (empty) empty.style.display = "";
    if (dropzone) dropzone.style.display = "";
    if (summary) summary.innerHTML = "";
    if (agingEl) agingEl.innerHTML = "";
    if (byTypeEl) byTypeEl.innerHTML = "";
    return;
  }
  if (empty) empty.style.display = "none";
  if (dropzone) dropzone.style.display = "none";

  const { byType, aging, total, fbaTotal, dsTotal, regTotal, fetchedAt } = _openOrdersData;
  const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
  if (lastUpd) lastUpd.textContent = "☁ Synced · " + fetchedDate.toLocaleDateString([], {month:"short", day:"numeric"}) + " " + fetchedDate.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

  // Today's printed totals per piece type
  const td = localDateStr(new Date());
  const printedToday = {};
  Object.entries(machineReports).forEach(([machine, sessions]) => {
    sessions.filter(s => localDateStr(s.time) === td).forEach(s => {
      const pt = s.pieceType || "";
      printedToday[pt] = (printedToday[pt] || 0) + (s.qtyGood || 0);
    });
  });

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

  // ── By piece type vs printed today ──
  if (byTypeEl) {
    byTypeEl.innerHTML = "";
    const sorted = Object.entries(byType).sort((a,b)=>b[1]-a[1]);
    sorted.forEach(([pt, openQty]) => {
      const printed = printedToday[pt] || 0;
      const ratio   = openQty > 0 ? Math.min(100, Math.round(printed/openQty*100)) : 0;
      const barColor = ratio >= 80 ? "#228844" : ratio >= 50 ? "#aa7700" : "#cc3333";
      const row = document.createElement("div");
      row.style.cssText = "background:#fff;border:1px solid #c2e8b8;border-radius:8px;padding:10px 14px;";
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-family:'Josefin Slab',serif;font-size:12px;color:#1a2a18;font-weight:700;">${pt}</span>
          <div style="display:flex;gap:16px;align-items:center;">
            <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#cc3333;">⬤ ${openQty.toLocaleString()} open</span>
            <span style="font-family:'Josefin Slab',serif;font-size:10px;color:#228844;">⬤ ${printed.toLocaleString()} printed today</span>
            <span style="font-family:'Abril Fatface',serif;font-size:16px;color:${barColor};">${ratio}%</span>
          </div>
        </div>
        <div style="background:#e8f5ee;border-radius:99px;height:6px;overflow:hidden;">
          <div style="height:100%;width:${ratio}%;background:${barColor};border-radius:99px;transition:width 0.4s;"></div>
        </div>`;
      byTypeEl.appendChild(row);
    });
  }
}
