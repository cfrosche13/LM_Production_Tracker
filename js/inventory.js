// ═══════════════════════════════════════
// INVENTORY MODULE
// ═══════════════════════════════════════

let _invMachine      = "30";
let _invAdminMode    = false;
let _invCategory     = "ink"; // "ink" | "maint" | "parts"
let _invProduct      = null;  // productId | null (drill-down into lot detail for a color)
let _invFbReadyTime  = 0;     // timestamp when Firebase first connected — gates seed banner
let _autoSeedChecked = false; // ensures auto-seed runs only once per session
let _autoPartsSeedChecked = false; // ensures spare-parts auto-seed runs only once per session
let _inkLots        = {};   // { fbKey: { machine, productId, productName, partCode, lotNumber, expDate, qtyReceived, qtyRemaining, receivedAt, receivedBy } }
let _maintStock     = {};   // { machine: { productId: { productName, partCode, qtyInStock } } }
let _partsStock     = {};   // { machine: { productId: { productName, partCode, location, qtyInStock } } }
let _invTxs         = {};   // { fbKey: transaction }
let _invCatalogAdds = {};   // { machine: { ink: [], maint: [], parts: [] } } — admin-added products
let _invPartsSearch = "";   // current Spare Parts search query (part number or keyword, searches all machines)

const INV_MACHINES = ["30","30+","H5","Colex","Drinkware"];

// Line-drawn SVG icons (not emoji) so rendering is identical across all browsers/fonts.
const INV_ICON_INK   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="vertical-align:-2px;flex-shrink:0;"><rect x="6" y="3" width="12" height="5"></rect><rect x="3" y="8" width="18" height="8" rx="1"></rect><rect x="6" y="16" width="12" height="5"></rect></svg>`;
const INV_ICON_MAINT  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;flex-shrink:0;"><line x1="6.4" y1="6.4" x2="17.6" y2="17.6"></line><circle cx="6.4" cy="6.4" r="3"></circle><circle cx="17.6" cy="17.6" r="3"></circle></svg>`;
const INV_ICON_PARTS  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="vertical-align:-2px;flex-shrink:0;"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7"></polygon><circle cx="12" cy="12" r="4"></circle></svg>`;

// ─── Panel open / close ──────────────────────────────
function openInventoryPanel() {
  document.getElementById("maint-panel-actions").style.display   = "none";
  document.getElementById("maint-panel-inventory").style.display = "";
  invSwitchMachine(_invMachine);

  // Always fetch fresh data directly from Firebase when the panel opens
  if (window._fb) {
    Promise.all([window._fb.fetchInkLots(), window._fb.fetchMaintStock(), window._fb.fetchPartsStock()])
      .then(([inkData, maintData, partsData]) => {
        _inkLots = {};
        Object.entries(inkData).forEach(([k, v]) => { if (v && v.machine) _inkLots[k] = v; });
        _maintStock = maintData || {};
        _partsStock = partsData || {};
        if (!_invFbReadyTime) _invFbReadyTime = Date.now();
        // Silently seed any machine that has no lot data — no button click required
        if (!Object.values(_inkLots).some(l => l.machine === "30"))  seed30Inventory(true);
        if (!Object.values(_inkLots).some(l => l.machine === "H5"))  seedH5Inventory(true);
        if (!Object.values(_inkLots).some(l => l.machine === "30+")) seed30PlusInventory(true);
        renderInventory();
      })
      .catch(() => {});
  }
}

function closeInventoryPanel() {
  document.getElementById("maint-panel-inventory").style.display = "none";
  document.getElementById("maint-panel-actions").style.display   = "";
  _invPartsSearch = "";
}

// ─── Machine tab switch ──────────────────────────────
function _invHighlightMachineTab(machine) {
  INV_MACHINES.forEach(m => {
    const btn = document.getElementById("inv-tab-" + m.replace("+","p"));
    if (!btn) return;
    const active = m === machine;
    btn.style.background  = active ? "#52a040" : "#f0f5ee";
    btn.style.color       = active ? "#fff"    : "#3a5a38";
    btn.style.borderColor = active ? "#3a8c32" : "#c0d8b8";
    btn.style.fontWeight  = active ? "700"     : "500";
  });
}

function invSwitchMachine(machine) {
  _invMachine  = machine;
  _invProduct  = null;
  _invHighlightMachineTab(machine);
  renderInventory();
}

// Switches the active machine tab without disturbing the current render
// (used when acting on a Spare Parts search result that belongs to a different machine)
function invPartsActionSwitch(machine) {
  if (machine === _invMachine) return;
  _invMachine = machine;
  _invHighlightMachineTab(machine);
}

// ─── Product lists (constants + admin additions) ─────
function _invGetInkProducts(machine) {
  const overrides = window._invProductOverrides || {};
  const base = (INK_INVENTORY_PRODUCTS[machine] || []).map(p => {
    const o = overrides[p.id];
    return o ? { ...p, ...o } : p;
  });
  return [...base, ...(_invCatalogAdds[machine]?.ink || [])];
}

function _invGetMaintProducts(machine) {
  const overrides = window._invProductOverrides || {};
  const base = (MAINT_INVENTORY_PRODUCTS[machine] || []).map(p => {
    const o = overrides[p.id];
    return o ? { ...p, ...o } : p;
  });
  return [...base, ...(_invCatalogAdds[machine]?.maint || [])];
}

function _invGetPartsProducts(machine) {
  const overrides = window._invProductOverrides || {};
  const base = (PARTS_INVENTORY_PRODUCTS[machine] || []).map(p => {
    const o = overrides[p.id];
    return o ? { ...p, ...o } : p;
  });
  return [...base, ...(_invCatalogAdds[machine]?.parts || [])];
}

// ─── Lot helpers ─────────────────────────────────────
function _invGetLots(machine, productId) {
  return Object.entries(_inkLots)
    .filter(([, lot]) => lot.machine === machine && lot.productId === productId)
    .map(([key, lot]) => ({ key, ...lot }))
    .sort((a, b) => {
      if (!a.expDate && !b.expDate) return 0;
      if (!a.expDate) return 1;
      if (!b.expDate) return -1;
      return new Date(a.expDate) - new Date(b.expDate);
    });
}

function _invTotalInk(machine, productId) {
  return Object.values(_inkLots)
    .filter(lot => lot.machine === machine && lot.productId === productId)
    .reduce((sum, lot) => sum + (lot.qtyRemaining || 0), 0);
}

// ─── Stock badge ─────────────────────────────────────
function _invBadge(qty) {
  const color = qty === 0 ? "#cc2222" : qty <= 2 ? "#cc6600" : "#1a7a2a";
  const bg    = qty === 0 ? "#fff0f0" : qty <= 2 ? "#fff6e0" : "#f0fff4";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;padding:3px 10px;background:${bg};border:1.5px solid ${color};border-radius:12px;font-family:'Abril Fatface',serif;font-size:15px;color:${color};">${qty}</span>`;
}

// ─── Navigation ──────────────────────────────────────
function invSelectCategory(cat) {
  _invCategory = cat;
  _invProduct  = null;
  if (cat !== "parts") _invPartsSearch = "";
  const inkTab   = document.getElementById("inv-subtab-ink");
  const maintTab = document.getElementById("inv-subtab-maint");
  const partsTab = document.getElementById("inv-subtab-parts");
  if (inkTab)  { inkTab.style.background  = cat === "ink"   ? "#52a040" : "#f0faf0"; inkTab.style.color   = cat === "ink"   ? "#fff" : "#2a5a28"; }
  if (maintTab){ maintTab.style.background= cat === "maint" ? "#c87020" : "#f8f0e0"; maintTab.style.color = cat === "maint" ? "#fff" : "#7a4400"; }
  if (partsTab){ partsTab.style.background= cat === "parts" ? "#3a5a8c" : "#eef2f8"; partsTab.style.color = cat === "parts" ? "#fff" : "#2a4468"; }
  renderInventory();
}

function invSelectProduct(productId) {
  _invProduct = productId;
  renderInventory();
}

function invGoBack() {
  _invProduct = null;
  renderInventory();
}

// ─── Render ──────────────────────────────────────────
function renderInventory() {
  const seedWrap = document.getElementById("inv-seed-wrap");
  const seedBtn  = document.getElementById("inv-seed-btn");
  const seedMsg  = document.getElementById("inv-seed-msg");
  if (seedWrap) {
    const SEEDABLE = { "30": "seed30Inventory", "H5": "seedH5Inventory", "30+": "seed30PlusInventory" };
    const fn = SEEDABLE[_invMachine];
    const hasLots = Object.values(_inkLots).some(l => l.machine === _invMachine);
    const atTop = _invCategory === "ink" && !_invProduct;
    const fbAge = _invFbReadyTime ? (Date.now() - _invFbReadyTime) : 0;
    if (_invAdminMode && fn && !hasLots && atTop && fbAge > 5000) {
      seedWrap.style.display = "";
      if (seedBtn) { seedBtn.onclick = window[fn]; seedBtn.textContent = `⬆️ Load ${_invMachine} Data`; }
      if (seedMsg) seedMsg.textContent = `No ${_invMachine} inventory found — load current stock from screenshots?`;
    } else {
      seedWrap.style.display = "none";
    }
  }

  if (_invCategory === "ink" && !_invProduct) renderInkProductList();
  else if (_invCategory === "ink" &&  _invProduct) renderInkProductDetail(_invProduct);
  else if (_invCategory === "maint")               renderMaintSection(_invMachine);
  else if (_invCategory === "parts")               renderPartsSection(_invMachine);
}

function renderCategoryPicker() {
  const el = document.getElementById("inv-content");
  if (!el) return;
  const machine = _invMachine;
  const inkProducts   = _invGetInkProducts(machine);
  const inkTotal      = inkProducts.reduce((s, p) => s + _invTotalInk(machine, p.id), 0);
  const inkLotCount   = inkProducts.reduce((s, p) => s + _invGetLots(machine, p.id).length, 0);
  const maintProducts = _invGetMaintProducts(machine);
  const maintTotal    = maintProducts.reduce((s, p) => s + ((_maintStock[machine]||{})[p.id]?.qtyInStock||0), 0);

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:8px 0;">
      <button onclick="invSelectCategory('ink')"
        style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:18px 20px;background:#f0faf0;border:2px solid #b8e0b8;border-radius:12px;cursor:pointer;text-align:left;">
        <div>
          <div style="font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#1a4a2a;">🖨️ Ink Inventory</div>
          <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#5a8a5a;margin-top:4px;">${inkLotCount} lot${inkLotCount!==1?'s':''} · ${inkProducts.length} color${inkProducts.length!==1?'s':''}</div>
        </div>
        ${_invBadge(inkTotal)}
      </button>
      <button onclick="invSelectCategory('maint')"
        style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:18px 20px;background:#fff8f0;border:2px solid #f0d8a0;border-radius:12px;cursor:pointer;text-align:left;">
        <div>
          <div style="font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#7a3300;">🔧 Maintenance Supplies</div>
          <div style="font-family:'Josefin Slab',serif;font-size:11px;color:#9a6a30;margin-top:4px;">${maintProducts.length} product${maintProducts.length!==1?'s':''} tracked</div>
        </div>
        ${_invBadge(maintTotal)}
      </button>
    </div>
  `;
}

function renderInkProductList() {
  const machine = _invMachine;
  const el = document.getElementById("inv-content");
  if (!el) return;
  const products = _invGetInkProducts(machine);

  let html = `<div style="margin-bottom:10px;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3a8c32;padding-bottom:6px;border-bottom:2px solid #c2e8b8;">${INV_ICON_INK} Ink — ${esc(machine)}</div>`;

  if (!products.length) {
    html += `<div class="inv-empty">No ink products configured for this machine.</div>`;
    if (_invAdminMode) html += `<button class="inv-add-product-btn" onclick="openAddProductModal('ink','${esc(machine)}')">+ Add Ink Product</button>`;
    el.innerHTML = html;
    return;
  }

  html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
  products.forEach(prod => {
    const total      = _invTotalInk(machine, prod.id);
    const lots       = _invGetLots(machine, prod.id);
    const activeLots = lots.filter(l => (l.qtyRemaining||0) > 0).length;
    const usable     = activeLots > 0;
    html += `
      <div style="padding:12px 14px;background:#f8fdf8;border:1.5px solid #c8e8c8;border-radius:10px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button onclick="invSelectProduct('${esc(prod.id)}')" style="flex:1;display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;text-align:left;padding:0;min-width:0;">
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;color:#1a2e1c;">${esc(prod.name)}</div>
              <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#88aa88;margin-top:1px;">${activeLots} lot${activeLots!==1?'s':''} · tap for detail</div>
            </div>
            ${_invBadge(total)}
          </button>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="inv-btn inv-btn-receive" onclick="openReceiveInkModal('${esc(prod.id)}')">+ Receive</button>
            <button class="inv-btn inv-btn-use" onclick="openUseInkModal('${esc(prod.id)}')" ${!usable?'disabled':''}>− Use</button>
          </div>
          ${_invAdminMode ? `<button class="inv-btn inv-btn-admin" onclick="openEditProductModal('ink','${esc(prod.id)}','${esc(machine)}')">✎ Edit</button>` : ''}
        </div>
      </div>
    `;
  });
  html += `</div>`;

  if (_invAdminMode) html += `<button class="inv-add-product-btn" onclick="openAddProductModal('ink','${esc(machine)}')">+ Add Ink Product</button>`;
  el.innerHTML = html;
}

function renderInkProductDetail(productId) {
  const machine = _invMachine;
  const el = document.getElementById("inv-content");
  if (!el) return;
  const prod = _invGetInkProducts(machine).find(p => p.id === productId);
  if (!prod) { invGoBack(); return; }

  const lots    = _invGetLots(machine, productId);
  const total   = _invTotalInk(machine, productId);
  const usable  = lots.filter(l => (l.qtyRemaining||0) > 0);

  let html = `
    <div style="margin-bottom:14px;">
      <button onclick="invGoBack()" style="font-family:'Josefin Slab',serif;font-size:12px;color:#3a8c32;background:none;border:none;cursor:pointer;padding:0 0 8px 0;">← Ink</button>
    </div>
    <div class="inv-product-row">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Josefin Slab',serif;font-size:16px;font-weight:700;color:#1a2e1c;">${esc(prod.name)}</div>
          <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#88aa88;margin-top:2px;">
            ${prod.partCode ? `Part #: ${esc(prod.partCode)}` : `<span style="color:#e87820;">⚠️ Part # needed</span>`}
          </div>
        </div>
        ${_invBadge(total)}
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="inv-btn inv-btn-receive" onclick="openReceiveInkModal('${esc(prod.id)}')">+ Receive</button>
          <button class="inv-btn inv-btn-use" onclick="openUseInkModal('${esc(prod.id)}')" ${usable.length===0?'disabled':''}>− Use</button>
        </div>
        ${_invAdminMode ? `<button class="inv-btn inv-btn-admin" onclick="openEditProductModal('ink','${esc(prod.id)}','${esc(machine)}')">✎ Edit</button>` : ''}
      </div>
  `;

  if (lots.length > 0) {
    html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e0ece0;display:flex;flex-direction:column;gap:5px;">`;
    lots.forEach((lot, i) => {
      const isFirst  = i === 0 && (lot.qtyRemaining||0) > 0;
      const exp      = lot.expDate ? new Date(lot.expDate) : null;
      const expStr   = exp ? exp.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "No exp.";
      const expWarn  = exp && (exp - Date.now()) < 90 * 86400000;
      const depleted = (lot.qtyRemaining||0) === 0;
      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:7px;background:${depleted?'#f8f8f8':'#f0faf0'};border:1px solid ${depleted?'#e0e0e0':'#b8ddb8'};flex-wrap:wrap;">
          ${isFirst ? `<span class="inv-use-first-badge">USE FIRST</span>` : ''}
          <span style="font-family:'Josefin Slab',serif;font-size:12px;color:${depleted?'#aaa':'#2a4a2a'};flex:1;min-width:80px;">Lot: <strong>${esc(lot.lotNumber)}</strong></span>
          <span style="font-family:'Josefin Slab',serif;font-size:11px;color:${expWarn?'#cc5500':(depleted?'#bbb':'#5a7a5a')};">Exp: ${expStr}</span>
          <span style="font-family:'Josefin Slab',serif;font-size:12px;font-weight:700;color:${depleted?'#ccc':'#1a6a1a'};">${lot.qtyRemaining} left</span>
          ${_invAdminMode ? `<button class="inv-btn inv-btn-admin" onclick="openAdjustLotModal('${lot.key}')">↕️ Adjust</button>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="margin-top:8px;font-family:'Josefin Slab',serif;font-size:11px;color:#bbb;font-style:italic;">No inventory received yet.</div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

function renderMaintSection(machine) {
  const el = document.getElementById("inv-content");
  if (!el) return;
  const products = _invGetMaintProducts(machine);

  let html = `<div style="margin-bottom:10px;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#e87820;padding-bottom:6px;border-bottom:2px solid #f0d8b8;">${INV_ICON_MAINT} Maintenance — ${esc(machine)}</div>`;

  if (!products.length) {
    html += `<div class="inv-empty">No maintenance products configured for this machine.</div>`;
    if (_invAdminMode) html += `<button class="inv-add-product-btn" onclick="openAddProductModal('maint','${esc(machine)}')">+ Add Maintenance Product</button>`;
    el.innerHTML = html;
    return;
  }

  html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
  products.forEach(prod => {
    const qty = ((_maintStock[machine]||{})[prod.id]?.qtyInStock || 0);
    html += `
      <div class="inv-product-row">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;color:#1a2e1c;">${esc(prod.name)}</div>
            <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#88aa88;margin-top:1px;">
              ${prod.partCode ? `Part #: ${esc(prod.partCode)}` : `<span style="color:#e87820;">⚠️ Part # needed</span>`}
            </div>
          </div>
          ${_invBadge(qty)}
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="inv-btn inv-btn-receive" onclick="openReceiveMaintModal('${esc(prod.id)}')">+ Receive</button>
            <button class="inv-btn inv-btn-use" onclick="openUseMaintModal('${esc(prod.id)}')" ${qty===0?'disabled':''}>− Use</button>
          </div>
          ${_invAdminMode ? `<button class="inv-btn inv-btn-admin" onclick="openEditProductModal('maint','${esc(prod.id)}','${esc(machine)}')">✎ Edit</button>` : ''}
        </div>
      </div>
    `;
  });
  html += `</div>`;

  if (_invAdminMode) html += `<button class="inv-add-product-btn" onclick="openAddProductModal('maint','${esc(machine)}')">+ Add Maintenance Product</button>`;
  el.innerHTML = html;
}

function _invPartsSearchBoxHtml() {
  const q = _invPartsSearch;
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <input type="text" id="inv-parts-search" value="${esc(q)}" oninput="invPartsSearchInput(this.value)"
        placeholder="🔍 Search part number or keyword (all machines)..."
        style="flex:1;font-family:'Josefin Slab',serif;font-size:13px;padding:8px 12px;border:1.5px solid #c8d8f0;border-radius:8px;background:#fff;color:#1a2e1c;box-sizing:border-box;">
      ${q ? `<button onclick="invPartsClearSearch()" style="font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;padding:8px 12px;border-radius:8px;border:1px solid #ddd;background:#f8f8f8;color:#888;cursor:pointer;white-space:nowrap;">✕ Clear</button>` : ''}
    </div>
  `;
}

function invPartsSearchInput(val) {
  _invPartsSearch = val;
  const input = document.getElementById("inv-parts-search");
  const selStart = input ? input.selectionStart : null;
  renderPartsSection(_invMachine);
  const newInput = document.getElementById("inv-parts-search");
  if (newInput) {
    newInput.focus();
    if (selStart !== null) newInput.setSelectionRange(selStart, selStart);
  }
}

function invPartsClearSearch() {
  _invPartsSearch = "";
  renderPartsSection(_invMachine);
}

const INV_PARTS_CONDITIONS = ["New", "Defective", "Repaired"];

function _invConditionBadge(condition, machine, productId) {
  const styles = {
    New:       { color:"#1a7a2a", bg:"#f0fff4", border:"#1a7a2a" },
    Defective: { color:"#cc2222", bg:"#fff0f0", border:"#cc2222" },
    Repaired:  { color:"#2a4468", bg:"#eef2f8", border:"#3a5a8c" },
  };
  const s = styles[condition] || styles.New;
  return `<button onclick="invCyclePartsCondition('${esc(machine)}','${esc(productId)}')" title="Click to change condition"
    style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;padding:3px 0;width:78px;flex-shrink:0;text-align:center;border-radius:12px;border:1.5px solid ${s.border};background:${s.bg};color:${s.color};cursor:pointer;white-space:nowrap;">${esc(condition)}</button>`;
}

function invCyclePartsCondition(machine, productId) {
  const rec     = (_partsStock[machine]||{})[productId] || {};
  const prod    = _invGetPartsProducts(machine).find(p => p.id === productId);
  const current = rec.condition || "New";
  const next    = INV_PARTS_CONDITIONS[(INV_PARTS_CONDITIONS.indexOf(current) + 1) % INV_PARTS_CONDITIONS.length];

  const updated = {
    productName: prod?.name || rec.productName || "",
    partCode:    prod?.partCode || rec.partCode || "",
    location:    prod?.location || rec.location || "",
    qtyInStock:  rec.qtyInStock || 0,
    condition:   next,
  };
  if (!_partsStock[machine]) _partsStock[machine] = {};
  _partsStock[machine][productId] = updated;
  if (window._fb) window._fb.savePartsStock(machine, productId, updated);

  const tx = { type:"condition_change", machine, category:"parts", productId, productName:updated.productName, partCode:updated.partCode||"", location:updated.location||"", qty:0, op: document.getElementById("global-operator")?.value || "—", timestamp:new Date().toISOString(), notes:`Condition changed to ${next}` };
  if (window._fb) window._fb.saveInvTransaction(tx);

  renderInventory();
}

function _invPartsRow(prod, machine, showMachineBadge) {
  const rec       = (_partsStock[machine]||{})[prod.id];
  const qty       = rec?.qtyInStock || 0;
  const condition = rec?.condition || "New";
  const nameLine = showMachineBadge
    ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
         <span style="font-family:'Josefin Slab',serif;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#3a5a8c;color:#fff;">${esc(machine)}</span>
         <div style="font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;color:#1a2e1c;">${esc(prod.name)}</div>
       </div>`
    : `<div style="font-family:'Josefin Slab',serif;font-size:14px;font-weight:700;color:#1a2e1c;">${esc(prod.name)}</div>`;
  return `
    <div class="inv-product-row">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          ${nameLine}
          <div style="font-family:'Josefin Slab',serif;font-size:10px;color:#88aa88;margin-top:2px;">
            ${prod.location ? `📍 ${esc(prod.location)}` : `<span style="color:#e87820;">⚠️ Location needed</span>`}
            ${prod.partCode ? ` · Part #: ${esc(prod.partCode)}` : ` · <span style="color:#e87820;">⚠️ Part # needed</span>`}
          </div>
        </div>
        ${_invConditionBadge(condition, machine, prod.id)}
        ${_invBadge(qty)}
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="inv-btn inv-btn-receive" onclick="invPartsActionSwitch('${esc(machine)}');openReceivePartsModal('${esc(prod.id)}')">+ Receive</button>
          <button class="inv-btn inv-btn-use" onclick="invPartsActionSwitch('${esc(machine)}');openUsePartsModal('${esc(prod.id)}')" ${qty===0?'disabled':''}>− Use</button>
        </div>
        ${_invAdminMode ? `<button class="inv-btn inv-btn-admin" onclick="invPartsActionSwitch('${esc(machine)}');openEditProductModal('parts','${esc(prod.id)}','${esc(machine)}')">✎ Edit</button>` : ''}
      </div>
    </div>
  `;
}

function renderPartsSection(machine) {
  const el = document.getElementById("inv-content");
  if (!el) return;
  const q = _invPartsSearch.trim().toLowerCase();

  // ── Cross-machine search ──
  if (q) {
    const matches = [];
    INV_MACHINES.forEach(m => {
      _invGetPartsProducts(m).forEach(prod => {
        const hay = (prod.name + " " + (prod.partCode||"") + " " + (prod.location||"")).toLowerCase();
        if (hay.includes(q)) matches.push({ prod, machine: m });
      });
    });

    let html = _invPartsSearchBoxHtml();
    html += `<div style="margin-bottom:10px;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3a5a8c;padding-bottom:6px;border-bottom:2px solid #c8d8f0;">${INV_ICON_PARTS} Spare Parts — ${matches.length} match${matches.length!==1?'es':''}</div>`;

    if (!matches.length) {
      html += `<div class="inv-empty">No spare parts match "${esc(_invPartsSearch)}".</div>`;
      el.innerHTML = html;
      return;
    }

    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    matches.forEach(({ prod, machine }) => { html += _invPartsRow(prod, machine, true); });
    html += `</div>`;
    el.innerHTML = html;
    return;
  }

  // ── Normal single-machine browse ──
  const products = _invGetPartsProducts(machine);

  let html = _invPartsSearchBoxHtml();
  html += `<div style="margin-bottom:10px;font-family:'Josefin Slab',serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3a5a8c;padding-bottom:6px;border-bottom:2px solid #c8d8f0;">${INV_ICON_PARTS} Spare Parts — ${esc(machine)}</div>`;

  if (!products.length) {
    html += `<div class="inv-empty">No spare parts configured for this machine.</div>`;
    html += `<button class="inv-add-product-btn" onclick="openAddProductModal('parts','${esc(machine)}')">+ Add Spare Part</button>`;
    el.innerHTML = html;
    return;
  }

  html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
  products.forEach(prod => { html += _invPartsRow(prod, machine, false); });
  html += `</div>`;

  html += `<button class="inv-add-product-btn" onclick="openAddProductModal('parts','${esc(machine)}')">+ Add Spare Part</button>`;
  el.innerHTML = html;
}

// ─── Admin mode toggle ───────────────────────────────
function toggleInvAdminMode() {
  _invAdminMode = !_invAdminMode;
  const btn = document.getElementById("inv-admin-btn");
  if (btn) {
    btn.textContent      = _invAdminMode ? "✓ Admin ON" : "Admin Mode";
    btn.style.background = _invAdminMode ? "#1a4a2a"   : "#fff";
    btn.style.color      = _invAdminMode ? "#88ee88"   : "#3a6a3a";
    btn.style.borderColor= _invAdminMode ? "#2a7a3a"   : "#b0d0b0";
  }
  renderInventory();
}

// ─── RECEIVE INK MODAL ───────────────────────────────
function openReceiveInkModal(productId) {
  const machine  = _invMachine;
  const products = _invGetInkProducts(machine);
  const sel = document.getElementById("rinv-product");
  sel.innerHTML = products.map(p =>
    `<option value="${esc(p.id)}">${esc(p.name)}${p.partCode ? ' — ' + esc(p.partCode) : ''}</option>`
  ).join("");
  if (productId) sel.value = productId;
  document.getElementById("rinv-lot").value            = "";
  document.getElementById("rinv-exp").value            = "";
  document.getElementById("rinv-qty").value            = "";
  document.getElementById("rinv-notes").value          = "";
  document.getElementById("rinv-machine-display").textContent = machine;
  document.getElementById("rinv-existing-msg").style.display = "none";
  document.getElementById("rinv-operator").value =
    document.getElementById("global-operator")?.value || "";
  openModal("inv-receive-ink-modal");
}

function rinvCheckLot() {
  const machine   = _invMachine;
  const productId = document.getElementById("rinv-product").value;
  const lotNum    = document.getElementById("rinv-lot").value.trim();
  const msgEl     = document.getElementById("rinv-existing-msg");
  const qtyEl     = document.getElementById("rinv-existing-qty");
  if (!lotNum) { msgEl.style.display = "none"; return; }
  const existing = Object.values(_inkLots).find(lot =>
    lot.machine === machine && lot.productId === productId && lot.lotNumber === lotNum
  );
  if (existing) {
    qtyEl.textContent       = existing.qtyRemaining;
    msgEl.style.display     = "";
  } else {
    msgEl.style.display     = "none";
  }
}

function submitReceiveInk() {
  const machine   = _invMachine;
  const productId = document.getElementById("rinv-product").value;
  const lotNum    = document.getElementById("rinv-lot").value.trim();
  const expDate   = document.getElementById("rinv-exp").value;
  const qty       = parseInt(document.getElementById("rinv-qty").value) || 0;
  const op        = document.getElementById("rinv-operator").value.trim() ||
                    document.getElementById("global-operator")?.value || "—";
  const notes     = document.getElementById("rinv-notes").value.trim();

  if (!lotNum)  { alert("Please enter a lot number."); return; }
  if (qty <= 0) { alert("Please enter a quantity greater than 0."); return; }

  const prod = _invGetInkProducts(machine).find(p => p.id === productId);
  if (!prod) return;
  const now = new Date().toISOString();

  const existingKey = Object.keys(_inkLots).find(k => {
    const l = _inkLots[k];
    return l.machine === machine && l.productId === productId && l.lotNumber === lotNum;
  });

  if (existingKey) {
    const lot     = _inkLots[existingKey];
    const updated = { ...lot, qtyRemaining: (lot.qtyRemaining || 0) + qty, qtyReceived: (lot.qtyReceived || 0) + qty };
    _inkLots[existingKey] = updated;
    if (window._fb) window._fb.updateInkLot(existingKey, updated);
    const tx = { type:"receive_ink", machine, category:"ink", productId, productName:prod.name, partCode:prod.partCode||"", lotNumber:lotNum, expDate:lot.expDate||"", qty, op, timestamp:now, notes, action:"add_to_existing_lot" };
    if (window._fb) window._fb.saveInvTransaction(tx);
  } else {
    const newLot = { machine, category:"ink", productId, productName:prod.name, partCode:prod.partCode||"", lotNumber:lotNum, expDate, qtyReceived:qty, qtyRemaining:qty, receivedAt:now, receivedBy:op };
    const tmpKey = "_new_" + now;
    _inkLots[tmpKey] = newLot;
    if (window._fb) window._fb.saveInkLot(newLot);
    const tx = { type:"receive_ink", machine, category:"ink", productId, productName:prod.name, partCode:prod.partCode||"", lotNumber:lotNum, expDate, qty, op, timestamp:now, notes, action:"new_lot" };
    if (window._fb) window._fb.saveInvTransaction(tx);
  }

  closeModal("inv-receive-ink-modal");
  renderInventory();
}

// ─── USE INK MODAL ───────────────────────────────────
function openUseInkModal(productId) {
  const machine  = _invMachine;
  const products = _invGetInkProducts(machine).filter(p => _invTotalInk(machine, p.id) > 0);
  const sel = document.getElementById("uinv-product");
  sel.innerHTML = products.map(p =>
    `<option value="${esc(p.id)}">${esc(p.name)} (${_invTotalInk(machine, p.id)} available)</option>`
  ).join("");
  if (productId && products.find(p => p.id === productId)) sel.value = productId;
  document.getElementById("uinv-machine-display").textContent = machine;
  uinvRenderLots();
  openModal("inv-use-ink-modal");
}

function uinvRenderLots() {
  const machine   = _invMachine;
  const productId = document.getElementById("uinv-product")?.value;
  const container = document.getElementById("uinv-lots-container");
  if (!container || !productId) return;
  const lots = _invGetLots(machine, productId).filter(l => (l.qtyRemaining || 0) > 0);
  if (!lots.length) {
    container.innerHTML = `<div style="font-family:'Josefin Slab',serif;font-size:12px;color:#aaa;padding:8px 0;">No available lots for this product.</div>`;
    return;
  }
  container.innerHTML = "";
  lots.forEach((lot, i) => {
    const exp = lot.expDate
      ? new Date(lot.expDate).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
      : "No exp.";
    const isFirst = i === 0;
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;background:${isFirst?'#edf9ed':'#f8f8f8'};border:1.5px solid ${isFirst?'#52a040':'#d8d8d8'};margin-bottom:6px;box-sizing:border-box;`;
    row.innerHTML = `
      <input type="number" min="0" max="${lot.qtyRemaining}" value="0" data-lot-key="${lot.key}"
        style="width:52px;font-family:'Abril Fatface',serif;font-size:18px;color:#1a6a1a;border:1.5px solid #b8d8b8;border-radius:6px;padding:4px 6px;text-align:center;background:#fff;flex-shrink:0;">
      <span style="font-family:'Josefin Slab',serif;font-size:13px;font-weight:700;color:#1a2e1c;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Lot ${esc(lot.lotNumber)}</span>
      <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#5a7a5a;flex-shrink:0;white-space:nowrap;">${exp}</span>
      <span style="font-family:'Josefin Slab',serif;font-size:11px;color:#88aa88;flex-shrink:0;">${lot.qtyRemaining} left</span>
      ${isFirst ? `<span style="font-family:'Josefin Slab',serif;font-size:9px;font-weight:700;color:#fff;background:#228833;border-radius:4px;padding:2px 6px;flex-shrink:0;white-space:nowrap;">USE FIRST</span>` : ''}
    `;
    container.appendChild(row);
  });
}

function submitUseInk() {
  const machine   = _invMachine;
  const productId = document.getElementById("uinv-product").value;
  const prod      = _invGetInkProducts(machine).find(p => p.id === productId);
  const now       = new Date().toISOString();

  const inputs = document.querySelectorAll('#uinv-lots-container input[data-lot-key]');
  const usages = [];

  for (const input of inputs) {
    const qty = parseInt(input.value) || 0;
    if (qty <= 0) continue;
    const lot = _inkLots[input.dataset.lotKey];
    if (!lot) continue;
    if (qty > (lot.qtyRemaining || 0)) {
      alert(`Lot ${lot.lotNumber} only has ${lot.qtyRemaining} available.`);
      return;
    }
    usages.push({ key: input.dataset.lotKey, lot, qty });
  }

  if (usages.length === 0) { alert("Enter a quantity for at least one lot."); return; }

  usages.forEach(({ key, lot, qty }) => {
    const updated = { ...lot, qtyRemaining: lot.qtyRemaining - qty };
    _inkLots[key] = updated;
    if (window._fb) window._fb.updateInkLot(key, updated);
    const tx = { type:"use_ink", machine, category:"ink", productId, productName:prod?.name||"", partCode:prod?.partCode||"", lotNumber:lot.lotNumber, expDate:lot.expDate||"", qty, op:"—", timestamp:now, notes:"" };
    if (window._fb) window._fb.saveInvTransaction(tx);
  });

  closeModal("inv-use-ink-modal");
  renderInventory();
}

// ─── RECEIVE MAINTENANCE MODAL ───────────────────────
function openReceiveMaintModal(productId) {
  const machine  = _invMachine;
  const products = _invGetMaintProducts(machine);
  const sel = document.getElementById("rmnt-product");
  sel.innerHTML = products.map(p =>
    `<option value="${esc(p.id)}">${esc(p.name)}${p.partCode ? ' — ' + esc(p.partCode) : ''}</option>`
  ).join("");
  if (productId) sel.value = productId;
  document.getElementById("rmnt-qty").value   = "";
  document.getElementById("rmnt-notes").value = "";
  document.getElementById("rmnt-machine-display").textContent = machine;
  document.getElementById("rmnt-operator").value =
    document.getElementById("global-operator")?.value || "";
  openModal("inv-receive-maint-modal");
}

function submitReceiveMaint() {
  const machine   = _invMachine;
  const productId = document.getElementById("rmnt-product").value;
  const qty       = parseInt(document.getElementById("rmnt-qty").value) || 0;
  const op        = document.getElementById("rmnt-operator").value.trim() ||
                    document.getElementById("global-operator")?.value || "—";
  const notes     = document.getElementById("rmnt-notes").value.trim();

  if (qty <= 0) { alert("Please enter a quantity greater than 0."); return; }

  const prod = _invGetMaintProducts(machine).find(p => p.id === productId);
  if (!prod) return;
  const now = new Date().toISOString();

  if (!_maintStock[machine])             _maintStock[machine] = {};
  if (!_maintStock[machine][productId])  _maintStock[machine][productId] = { productName:prod.name, partCode:prod.partCode||"", qtyInStock:0 };
  _maintStock[machine][productId].qtyInStock = (_maintStock[machine][productId].qtyInStock || 0) + qty;
  if (window._fb) window._fb.saveMaintStock(machine, productId, { productName:prod.name, partCode:prod.partCode||"", qtyInStock:_maintStock[machine][productId].qtyInStock });

  const tx = { type:"receive_maint", machine, category:"maintenance", productId, productName:prod.name, partCode:prod.partCode||"", qty, op, timestamp:now, notes };
  if (window._fb) window._fb.saveInvTransaction(tx);

  closeModal("inv-receive-maint-modal");
  renderInventory();
}

// ─── USE MAINTENANCE MODAL ───────────────────────────
function openUseMaintModal(productId) {
  const machine  = _invMachine;
  const products = _invGetMaintProducts(machine).filter(p =>
    ((_maintStock[machine] || {})[p.id]?.qtyInStock || 0) > 0
  );
  const sel = document.getElementById("umnt-product");
  sel.innerHTML = products.map(p => {
    const qty = (_maintStock[machine] || {})[p.id]?.qtyInStock || 0;
    return `<option value="${esc(p.id)}">${esc(p.name)} (${qty} in stock)</option>`;
  }).join("");
  if (productId && products.find(p => p.id === productId)) sel.value = productId;
  document.getElementById("umnt-qty").value   = "";
  document.getElementById("umnt-notes").value = "";
  document.getElementById("umnt-machine-display").textContent = machine;
  document.getElementById("umnt-operator").value =
    document.getElementById("global-operator")?.value || "";
  openModal("inv-use-maint-modal");
}

function submitUseMaint() {
  const machine   = _invMachine;
  const productId = document.getElementById("umnt-product").value;
  const qty       = parseInt(document.getElementById("umnt-qty").value) || 0;
  const op        = document.getElementById("umnt-operator").value.trim() ||
                    document.getElementById("global-operator")?.value || "—";
  const notes     = document.getElementById("umnt-notes").value.trim();

  if (qty <= 0) { alert("Please enter a quantity greater than 0."); return; }

  const inStock = (_maintStock[machine] || {})[productId]?.qtyInStock || 0;
  if (qty > inStock) { alert(`Only ${inStock} in stock.`); return; }

  const prod = _invGetMaintProducts(machine).find(p => p.id === productId);
  const now  = new Date().toISOString();

  _maintStock[machine][productId].qtyInStock = inStock - qty;
  if (window._fb) window._fb.saveMaintStock(machine, productId, {
    productName: prod?.name || "", partCode: prod?.partCode || "",
    qtyInStock: _maintStock[machine][productId].qtyInStock
  });

  const tx = { type:"use_maint", machine, category:"maintenance", productId, productName:prod?.name||"", partCode:prod?.partCode||"", qty, op, timestamp:now, notes };
  if (window._fb) window._fb.saveInvTransaction(tx);

  closeModal("inv-use-maint-modal");
  renderInventory();
}

// ─── RECEIVE SPARE PART MODAL ────────────────────────
function openReceivePartsModal(productId) {
  const machine  = _invMachine;
  const products = _invGetPartsProducts(machine);
  const sel = document.getElementById("rpts-product");
  sel.innerHTML = products.map(p =>
    `<option value="${esc(p.id)}">${esc(p.name)}${p.location ? ' — ' + esc(p.location) : ''}</option>`
  ).join("");
  if (productId) sel.value = productId;
  document.getElementById("rpts-qty").value   = "";
  document.getElementById("rpts-notes").value = "";
  document.getElementById("rpts-machine-display").textContent = machine;
  document.getElementById("rpts-operator").value =
    document.getElementById("global-operator")?.value || "";
  openModal("inv-receive-parts-modal");
}

function submitReceiveParts() {
  const machine   = _invMachine;
  const productId = document.getElementById("rpts-product").value;
  const qty       = parseInt(document.getElementById("rpts-qty").value) || 0;
  const op        = document.getElementById("rpts-operator").value.trim() ||
                    document.getElementById("global-operator")?.value || "—";
  const notes     = document.getElementById("rpts-notes").value.trim();

  if (qty <= 0) { alert("Please enter a quantity greater than 0."); return; }

  const prod = _invGetPartsProducts(machine).find(p => p.id === productId);
  if (!prod) return;
  const now = new Date().toISOString();

  if (!_partsStock[machine])             _partsStock[machine] = {};
  if (!_partsStock[machine][productId])  _partsStock[machine][productId] = { productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qtyInStock:0, condition:"New" };
  _partsStock[machine][productId].qtyInStock = (_partsStock[machine][productId].qtyInStock || 0) + qty;
  if (window._fb) window._fb.savePartsStock(machine, productId, {
    productName: prod.name, partCode: prod.partCode||"", location: prod.location||"",
    qtyInStock: _partsStock[machine][productId].qtyInStock,
    condition: _partsStock[machine][productId].condition || "New",
  });

  const tx = { type:"receive_parts", machine, category:"parts", productId, productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qty, op, timestamp:now, notes };
  if (window._fb) window._fb.saveInvTransaction(tx);

  closeModal("inv-receive-parts-modal");
  renderInventory();
}

// ─── USE SPARE PART MODAL ─────────────────────────────
function openUsePartsModal(productId) {
  const machine  = _invMachine;
  const products = _invGetPartsProducts(machine).filter(p =>
    ((_partsStock[machine] || {})[p.id]?.qtyInStock || 0) > 0
  );
  const sel = document.getElementById("upts-product");
  sel.innerHTML = products.map(p => {
    const qty = (_partsStock[machine] || {})[p.id]?.qtyInStock || 0;
    return `<option value="${esc(p.id)}">${esc(p.name)} (${qty} in stock)</option>`;
  }).join("");
  if (productId && products.find(p => p.id === productId)) sel.value = productId;
  document.getElementById("upts-qty").value   = "";
  document.getElementById("upts-notes").value = "";
  document.getElementById("upts-machine-display").textContent = machine;
  document.getElementById("upts-operator").value =
    document.getElementById("global-operator")?.value || "";
  openModal("inv-use-parts-modal");
}

function submitUseParts() {
  const machine   = _invMachine;
  const productId = document.getElementById("upts-product").value;
  const qty       = parseInt(document.getElementById("upts-qty").value) || 0;
  const op        = document.getElementById("upts-operator").value.trim() ||
                    document.getElementById("global-operator")?.value || "—";
  const notes     = document.getElementById("upts-notes").value.trim();

  if (qty <= 0) { alert("Please enter a quantity greater than 0."); return; }

  const inStock = (_partsStock[machine] || {})[productId]?.qtyInStock || 0;
  if (qty > inStock) { alert(`Only ${inStock} in stock.`); return; }

  const prod = _invGetPartsProducts(machine).find(p => p.id === productId);
  const now  = new Date().toISOString();

  _partsStock[machine][productId].qtyInStock = inStock - qty;
  if (window._fb) window._fb.savePartsStock(machine, productId, {
    productName: prod?.name || "", partCode: prod?.partCode || "", location: prod?.location || "",
    qtyInStock: _partsStock[machine][productId].qtyInStock,
    condition: _partsStock[machine][productId].condition || "New",
  });

  const tx = { type:"use_parts", machine, category:"parts", productId, productName:prod?.name||"", partCode:prod?.partCode||"", location:prod?.location||"", qty, op, timestamp:now, notes };
  if (window._fb) window._fb.saveInvTransaction(tx);

  closeModal("inv-use-parts-modal");
  renderInventory();
}

// ─── ADMIN: Edit Product ─────────────────────────────
function _invGetProductsForCategory(category, machine) {
  if (category === "ink")   return _invGetInkProducts(machine);
  if (category === "parts") return _invGetPartsProducts(machine);
  return _invGetMaintProducts(machine);
}

function openEditProductModal(category, productId, machine) {
  const products = _invGetProductsForCategory(category, machine);
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  document.getElementById("eprod-category").value  = category;
  document.getElementById("eprod-productid").value = productId;
  document.getElementById("eprod-machine").value   = machine;
  document.getElementById("eprod-name").value      = prod.name;
  document.getElementById("eprod-partcode").value  = prod.partCode || "";
  const locField = document.getElementById("eprod-location");
  if (locField) {
    locField.value = prod.location || "";
    locField.closest(".mf").style.display = category === "parts" ? "" : "none";
  }
  openModal("inv-edit-product-modal");
}

function submitEditProduct() {
  const category  = document.getElementById("eprod-category").value;
  const productId = document.getElementById("eprod-productid").value;
  const machine   = document.getElementById("eprod-machine").value;
  const name      = document.getElementById("eprod-name").value.trim();
  const partCode  = document.getElementById("eprod-partcode").value.trim();
  const location  = document.getElementById("eprod-location")?.value.trim() || "";
  if (!name) { alert("Product name is required."); return; }

  if (!window._invProductOverrides) window._invProductOverrides = {};
  const data = category === "parts" ? { name, partCode, location } : { name, partCode };
  window._invProductOverrides[productId] = data;
  if (window._fb) window._fb.saveInvProduct(category, machine, productId, data);

  closeModal("inv-edit-product-modal");
  renderInventory();
}

// ─── ADMIN: Add Product ──────────────────────────────
function openAddProductModal(category, machine) {
  document.getElementById("aprod-category").value = category;
  document.getElementById("aprod-machine").value  = machine;
  document.getElementById("aprod-name").value     = "";
  document.getElementById("aprod-partcode").value = "";
  const locField = document.getElementById("aprod-location");
  if (locField) {
    locField.value = "";
    locField.closest(".mf").style.display = category === "parts" ? "" : "none";
  }
  openModal("inv-add-product-modal");
}

function submitAddProduct() {
  const category = document.getElementById("aprod-category").value;
  const machine  = document.getElementById("aprod-machine").value;
  const name     = document.getElementById("aprod-name").value.trim();
  const partCode = document.getElementById("aprod-partcode").value.trim();
  const location = document.getElementById("aprod-location")?.value.trim() || "";
  if (!name) { alert("Product name is required."); return; }

  const id = [category, machine.replace(/\+/g,"p"), name.replace(/\s+/g,"_").toLowerCase(), Date.now()].join("_");
  const data = category === "parts" ? { name, partCode, location } : { name, partCode };
  const newProd = { id, ...data };
  if (!_invCatalogAdds[machine]) _invCatalogAdds[machine] = { ink:[], maint:[], parts:[] };
  if (category === "ink")        _invCatalogAdds[machine].ink.push(newProd);
  else if (category === "parts") _invCatalogAdds[machine].parts.push(newProd);
  else                           _invCatalogAdds[machine].maint.push(newProd);
  if (window._fb) window._fb.saveInvProduct(category, machine, id, data);

  closeModal("inv-add-product-modal");
  renderInventory();
}

// ─── ADMIN: Adjust Lot ───────────────────────────────
function openAdjustLotModal(lotKey) {
  const lot = _inkLots[lotKey];
  if (!lot) return;
  document.getElementById("adjlot-key").value        = lotKey;
  document.getElementById("adjlot-info").textContent = `${lot.productName} — Lot ${lot.lotNumber}`;
  document.getElementById("adjlot-qty").value         = lot.qtyRemaining || 0;
  document.getElementById("adjlot-qty-display").textContent = lot.qtyRemaining || 0;
  openModal("inv-adjust-lot-modal");
}

function adjlotStep(delta) {
  const input = document.getElementById("adjlot-qty");
  const newQty = Math.max(0, (parseInt(input.value) || 0) + delta);
  input.value = newQty;
  document.getElementById("adjlot-qty-display").textContent = newQty;
}

function submitAdjustLot() {
  const lotKey = document.getElementById("adjlot-key").value;
  const newQty = parseInt(document.getElementById("adjlot-qty").value);
  if (isNaN(newQty) || newQty < 0) { alert("Please enter a valid quantity (0 or more)."); return; }

  const lot = _inkLots[lotKey];
  if (!lot) return;
  const op  = document.getElementById("global-operator")?.value || "admin";
  const now = new Date().toISOString();
  const diff = newQty - (lot.qtyRemaining || 0);

  const updated = { ...lot, qtyRemaining: newQty };
  _inkLots[lotKey] = updated;
  if (window._fb) window._fb.updateInkLot(lotKey, updated);

  const tx = { type:"admin_adjust", machine:lot.machine, category:"ink", productId:lot.productId, productName:lot.productName, partCode:lot.partCode||"", lotNumber:lot.lotNumber, qty:diff, op, timestamp:now, notes:"Admin quantity adjustment" };
  if (window._fb) window._fb.saveInvTransaction(tx);

  closeModal("inv-adjust-lot-modal");
  renderInventory();
}

// ─── Deterministic seed key (prevents duplicates on re-seed) ────
function _seedKey(machine, productId, lotNumber) {
  return ("seed_" + machine + "_" + productId + "_" + lotNumber).replace(/[^a-zA-Z0-9]/g, "_");
}

// ─── Firebase listeners ──────────────────────────────
document.addEventListener("fbReady", () => {
  _invFbReadyTime = Date.now();
  window._fb.listenInkLots(data => {
    _inkLots = {};
    Object.entries(data).forEach(([k, v]) => { if (v && v.machine) _inkLots[k] = v; });

    // Auto-seed: if Firebase has no data for a machine, seed it silently (runs once per session)
    if (!_autoSeedChecked) {
      _autoSeedChecked = true;
      if (!Object.values(_inkLots).some(l => l.machine === "30"))   seed30Inventory(true);
      if (!Object.values(_inkLots).some(l => l.machine === "H5"))   seedH5Inventory(true);
      if (!Object.values(_inkLots).some(l => l.machine === "30+")) seed30PlusInventory(true);
    }

    const panel = document.getElementById("maint-panel-inventory");
    if (panel && panel.style.display !== "none") renderInventory();
  });
  window._fb.listenMaintStock(data => {
    _maintStock = data || {};
    if (document.getElementById("maint-panel-inventory")?.style.display !== "none") renderInventory();
  });
  window._fb.listenPartsStock(data => {
    _partsStock = data || {};
    if (!_autoPartsSeedChecked) {
      _autoPartsSeedChecked = true;
      if (!Object.keys(_partsStock["30"]  || {}).length) seed30PartsInventory(true);
      if (!Object.keys(_partsStock["30+"] || {}).length) seed30PlusPartsInventory(true);
    }
    if (document.getElementById("maint-panel-inventory")?.style.display !== "none") renderInventory();
  });
  window._fb.listenInvTransactions(data => {
    _invTxs = data || {};
  });
  window._fb.listenInvCatalog(data => {
    if (!data) return;
    if (!window._invProductOverrides) window._invProductOverrides = {};
    Object.entries(data).forEach(([machine, cats]) => {
      if (!_invCatalogAdds[machine]) _invCatalogAdds[machine] = { ink:[], maint:[], parts:[] };
      ["ink","maint","parts"].forEach(cat => {
        if (!cats[cat]) return;
        Object.entries(cats[cat]).forEach(([pid, prod]) => {
          window._invProductOverrides[pid] = prod;
          const isInBase = cat === "ink"
            ? (INK_INVENTORY_PRODUCTS[machine] || []).some(p => p.id === pid)
            : cat === "parts"
              ? (PARTS_INVENTORY_PRODUCTS[machine] || []).some(p => p.id === pid)
              : (MAINT_INVENTORY_PRODUCTS[machine] || []).some(p => p.id === pid);
          if (!isInBase) {
            const list = _invCatalogAdds[machine][cat];
            const idx  = list.findIndex(p => p.id === pid);
            const entry = { id:pid, ...prod };
            if (idx >= 0) list[idx] = entry; else list.push(entry);
          }
        });
      });
    });
    if (document.getElementById("maint-panel-inventory")?.style.display !== "none") renderInventory();
  });
});

// ─── Seed initial 30 inventory ───────────────────────
function seed30Inventory(auto) {
  if (!window._fb) { if (!auto) alert("Not connected to Firebase. Please log in first."); return; }

  const now = new Date().toISOString();
  const op  = "Initial Seed";

  const inkLots = [
    // Cyan (duplicate case variants combined)
    { productId:"30_cyan",    productName:"Cyan/Blue", partCode:"45206770", lotNumber:"21955y",  expDate:"2027-04-14", qtyReceived:6,  qtyRemaining:6  },
    { productId:"30_cyan",    productName:"Cyan/Blue", partCode:"45206770", lotNumber:"22700y",  expDate:"2027-05-13", qtyReceived:4,  qtyRemaining:4  },
    // Magenta (duplicate lots combined)
    { productId:"30_magenta", productName:"Magenta",   partCode:"45206771", lotNumber:"20462y",  expDate:"2027-02-04", qtyReceived:3,  qtyRemaining:3  },
    { productId:"30_magenta", productName:"Magenta",   partCode:"45206771", lotNumber:"22048y",  expDate:"2027-04-20", qtyReceived:3,  qtyRemaining:3  },
    { productId:"30_magenta", productName:"Magenta",   partCode:"45206771", lotNumber:"22978Y",  expDate:"2027-06-13", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30_magenta", productName:"Magenta",   partCode:"45206771", lotNumber:"20468Y",  expDate:"2027-07-29", qtyReceived:1,  qtyRemaining:1  },
    { productId:"30_magenta", productName:"Magenta",   partCode:"45206771", lotNumber:"24068Y",  expDate:"2027-07-29", qtyReceived:1,  qtyRemaining:1  },
    // Yellow (duplicate lots combined)
    { productId:"30_yellow",  productName:"Yellow",    partCode:"45206772", lotNumber:"20002y",  expDate:"2027-01-16", qtyReceived:4,  qtyRemaining:4  },
    { productId:"30_yellow",  productName:"Yellow",    partCode:"45206772", lotNumber:"21227Y",  expDate:"2027-03-10", qtyReceived:4,  qtyRemaining:4  },
    { productId:"30_yellow",  productName:"Yellow",    partCode:"45206772", lotNumber:"22463y",  expDate:"2027-05-05", qtyReceived:2,  qtyRemaining:2  },
    // Black (duplicate lots combined)
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"18428y",  expDate:"2026-11-08", qtyReceived:11, qtyRemaining:11 },
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"19262y",  expDate:"2026-12-19", qtyReceived:3,  qtyRemaining:3  },
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"19941y",  expDate:"2027-01-14", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"22059Y",  expDate:"2027-04-20", qtyReceived:1,  qtyRemaining:1  },
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"44025R",  expDate:"2027-05-11", qtyReceived:4,  qtyRemaining:4  },
    { productId:"30_black",   productName:"Black",     partCode:"45206773", lotNumber:"44641r",  expDate:"2027-06-04", qtyReceived:2,  qtyRemaining:2  },
    // White
    { productId:"30_white",   productName:"White",     partCode:"45206774", lotNumber:"44520R",  expDate:"2027-06-04", qtyReceived:1,  qtyRemaining:1  },
    { productId:"30_white",   productName:"White",     partCode:"45206774", lotNumber:"45074r",  expDate:"2027-06-25", qtyReceived:1,  qtyRemaining:1  },
    { productId:"30_white",   productName:"White",     partCode:"45206774", lotNumber:"44501R",  expDate:"2027-07-22", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30_white",   productName:"White",     partCode:"45206774", lotNumber:"45501R",  expDate:"2027-07-22", qtyReceived:5,  qtyRemaining:5  },
  ];

  inkLots.forEach(lot => {
    const key  = _seedKey("30", lot.productId, lot.lotNumber);
    const full = { ...lot, machine:"30", category:"ink", receivedAt:now, receivedBy:op };
    _inkLots[key] = full;
    window._fb.setInkLot(key, full);
    const tx = { type:"receive_ink", machine:"30", category:"ink", productId:lot.productId, productName:lot.productName, partCode:lot.partCode, lotNumber:lot.lotNumber, expDate:lot.expDate, qty:lot.qtyReceived, op, timestamp:now, notes:"Initial inventory seed", action:"new_lot" };
    window._fb.saveInvTransaction(tx);
  });

  if (!auto) { alert("30 inventory seeded successfully!"); renderInventory(); }
}

// ─── Seed initial H5 inventory ───────────────────────
function seedH5Inventory(auto) {
  if (!window._fb) { if (!auto) alert("Not connected to Firebase. Please log in first."); return; }

  const now = new Date().toISOString();
  const op  = "Initial Seed";

  // ── Ink lots ──
  const inkLots = [
    // Cyan
    { productId:"h5_cyan",    productName:"Cyan",          partCode:"45165670", lotNumber:"21159y",  expDate:"2026-12-08", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_cyan",    productName:"Cyan",          partCode:"45165670", lotNumber:"21159Y",  expDate:"2026-12-08", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_cyan",    productName:"Cyan",          partCode:"45165670", lotNumber:"23557y",  expDate:"2027-04-07", qtyReceived:2, qtyRemaining:2 },
    { productId:"h5_cyan",    productName:"Cyan",          partCode:"45165670", lotNumber:"23841Y",  expDate:"2027-04-21", qtyReceived:1, qtyRemaining:1 },
    // Light Cyan
    { productId:"h5_lcyan",   productName:"Light Cyan",    partCode:"45165674", lotNumber:"22391y",  expDate:"2027-02-03", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_lcyan",   productName:"Light Cyan",    partCode:"45165674", lotNumber:"44607R",  expDate:"2027-03-11", qtyReceived:2, qtyRemaining:2 },
    { productId:"h5_lcyan",   productName:"Light Cyan",    partCode:"45165674", lotNumber:"23133Y",  expDate:"2027-03-23", qtyReceived:1, qtyRemaining:1 },
    // Magenta
    { productId:"h5_magenta", productName:"Magenta",       partCode:"45174464", lotNumber:"21676y",  expDate:"2027-01-05", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_magenta", productName:"Magenta",       partCode:"45174464", lotNumber:"23401y",  expDate:"2027-04-01", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_magenta", productName:"Magenta",       partCode:"45174464", lotNumber:"23401Y",  expDate:"2027-04-01", qtyReceived:2, qtyRemaining:2 },
    // Light Magenta
    { productId:"h5_lmag",    productName:"Light Magenta", partCode:"45174466", lotNumber:"21806Y",  expDate:"2027-01-09", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_lmag",    productName:"Light Magenta", partCode:"45174466", lotNumber:"44455R",  expDate:"2027-03-04", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_lmag",    productName:"Light Magenta", partCode:"45174466", lotNumber:"23756y",  expDate:"2027-04-13", qtyReceived:1, qtyRemaining:1 },
    // Yellow
    { productId:"h5_yellow",  productName:"Yellow",        partCode:"45174465", lotNumber:"22397y",  expDate:"2027-02-03", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_yellow",  productName:"Yellow",        partCode:"45174465", lotNumber:"44472r",  expDate:"2027-03-04", qtyReceived:2, qtyRemaining:2 },
    // Light Yellow
    { productId:"h5_lyel",    productName:"Light Yellow",  partCode:"45174467", lotNumber:"44633r",  expDate:"2027-06-11", qtyReceived:1, qtyRemaining:1 },
    // Black
    { productId:"h5_black",   productName:"Black",         partCode:"45165673", lotNumber:"21797y",  expDate:"2027-01-08", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_black",   productName:"Black",         partCode:"45165673", lotNumber:"22170y",  expDate:"2027-01-26", qtyReceived:2, qtyRemaining:2 },
    { productId:"h5_black",   productName:"Black",         partCode:"45165673", lotNumber:"23010y",  expDate:"2027-03-13", qtyReceived:2, qtyRemaining:2 },
    // Light Black
    { productId:"h5_lblack",  productName:"Light Black",   partCode:"45165677", lotNumber:"18511y",  expDate:"2026-08-13", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_lblack",  productName:"Light Black",   partCode:"45165677", lotNumber:"44626R",  expDate:"2027-03-11", qtyReceived:1, qtyRemaining:1 },
    // White Ink
    { productId:"h5_white",   productName:"White Ink",     partCode:"45165678", lotNumber:"44619R",  expDate:"2027-06-04", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_white",   productName:"White Ink",     partCode:"45165678", lotNumber:"44619r",  expDate:"2027-06-11", qtyReceived:1, qtyRemaining:1 },
    { productId:"h5_white",   productName:"White Ink",     partCode:"45165678", lotNumber:"145107R", expDate:"2027-07-15", qtyReceived:2, qtyRemaining:2 },
  ];

  inkLots.forEach(lot => {
    const key  = _seedKey("H5", lot.productId, lot.lotNumber);
    const full = { ...lot, machine:"H5", category:"ink", receivedAt:now, receivedBy:op };
    _inkLots[key] = full;
    window._fb.setInkLot(key, full);
    const tx = { type:"receive_ink", machine:"H5", category:"ink", productId:lot.productId, productName:lot.productName, partCode:lot.partCode, lotNumber:lot.lotNumber, expDate:lot.expDate, qty:lot.qtyReceived, op, timestamp:now, notes:"Initial inventory seed", action:"new_lot" };
    window._fb.saveInvTransaction(tx);
  });

  // ── Maintenance stock ──
  const maintItems = [
    { productId:"h5m_fan236",   productName:"2.36 Fan Filter",          partCode:"P4970-A",  qtyInStock:3 },
    { productId:"h5m_efi",      productName:"EFI Consumable, 4\"",      partCode:"P7442-A",  qtyInStock:9 },
    { productId:"h5m_fanguard", productName:"Fan Guard, 40mm",          partCode:"45125188", qtyInStock:3 },
    { productId:"h5m_40mm",     productName:"Filter Elem 40mm",         partCode:"45118474", qtyInStock:1 },
    { productId:"h5m_lts",      productName:"Long Term Storage",        partCode:"45225793", qtyInStock:1 },
    { productId:"h5m_rollf",    productName:"Roll Filter (secondary)",  partCode:"45090057", qtyInStock:0 },
    { productId:"h5m_clean",    productName:"UV Maintenance Fluid",     partCode:"45225794", qtyInStock:3 },
  ];

  maintItems.forEach(item => {
    window._fb.saveMaintStock("H5", item.productId, { productName:item.productName, partCode:item.partCode, qtyInStock:item.qtyInStock });
    if (item.qtyInStock > 0) {
      const tx = { type:"receive_maint", machine:"H5", category:"maintenance", productId:item.productId, productName:item.productName, partCode:item.partCode, qty:item.qtyInStock, op, timestamp:now, notes:"Initial inventory seed" };
      window._fb.saveInvTransaction(tx);
    }
  });

  if (!auto) { alert("H5 inventory seeded successfully!"); renderInventory(); }
}

function seed30PlusInventory(auto) {
  if (!window._fb) { if (!auto) alert("Not connected to Firebase. Please log in first."); return; }

  const now = new Date().toISOString();
  const op  = "Initial Seed";

  const inkLots = [
    // Cyan
    { productId:"30p_cyan",    productName:"Cyan/Blue", partCode:"45249539", lotNumber:"21196y", expDate:"2026-09-09", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_cyan",    productName:"Cyan/Blue", partCode:"45249539", lotNumber:"44711r", expDate:"2026-12-11", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_cyan",    productName:"Cyan/Blue", partCode:"45249539", lotNumber:"44711R", expDate:"2026-12-11", qtyReceived:3,  qtyRemaining:3  },
    { productId:"30p_cyan",    productName:"Cyan/Blue", partCode:"45249539", lotNumber:"22994Y", expDate:"2026-12-16", qtyReceived:3,  qtyRemaining:3  },
    // Magenta (duplicate lots from old app combined)
    { productId:"30p_magenta", productName:"Magenta",   partCode:"45249540", lotNumber:"21558y", expDate:"2026-09-23", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_magenta", productName:"Magenta",   partCode:"45249540", lotNumber:"21558Y", expDate:"2026-09-23", qtyReceived:3,  qtyRemaining:3  },
    { productId:"30p_magenta", productName:"Magenta",   partCode:"45249540", lotNumber:"44714R", expDate:"2026-12-11", qtyReceived:4,  qtyRemaining:4  },
    // Yellow (duplicate lots combined)
    { productId:"30p_yellow",  productName:"Yellow",    partCode:"45249541", lotNumber:"22109y", expDate:"2027-01-22", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_yellow",  productName:"Yellow",    partCode:"45249541", lotNumber:"21109Y", expDate:"2027-01-22", qtyReceived:6,  qtyRemaining:6  },
    { productId:"30p_yellow",  productName:"Yellow",    partCode:"45249541", lotNumber:"23089Y", expDate:"2027-03-19", qtyReceived:3,  qtyRemaining:3  },
    // White (duplicate lots combined)
    { productId:"30p_white",   productName:"White",     partCode:"45249543", lotNumber:"44723R", expDate:"2026-12-11", qtyReceived:10, qtyRemaining:10 },
    // Black (duplicate lots combined)
    { productId:"30p_black",   productName:"Black",     partCode:"45249542", lotNumber:"21306Y", expDate:"2026-09-15", qtyReceived:6,  qtyRemaining:6  },
    { productId:"30p_black",   productName:"Black",     partCode:"45249542", lotNumber:"23053y", expDate:"2026-12-16", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_black",   productName:"Black",     partCode:"45249542", lotNumber:"23053Y", expDate:"2026-12-16", qtyReceived:2,  qtyRemaining:2  },
    { productId:"30p_black",   productName:"Black",     partCode:"45249542", lotNumber:"21497Y", expDate:"2027-02-06", qtyReceived:3,  qtyRemaining:3  },
  ];

  inkLots.forEach(lot => {
    const key  = _seedKey("30+", lot.productId, lot.lotNumber);
    const full = { ...lot, machine:"30+", category:"ink", receivedAt:now, receivedBy:op };
    _inkLots[key] = full;
    window._fb.setInkLot(key, full);
    const tx = { type:"receive_ink", machine:"30+", category:"ink", productId:lot.productId, productName:lot.productName, partCode:lot.partCode, lotNumber:lot.lotNumber, expDate:lot.expDate, qty:lot.qtyReceived, op, timestamp:now, notes:"Initial inventory seed", action:"new_lot" };
    window._fb.saveInvTransaction(tx);
  });

  const maintItems = [
    { productId:"30pm_lampfilter", productName:"Lamp Filters (new after install)", partCode:"22202007", qtyInStock:3 },
    { productId:"30pm_solvent",    productName:"Solvent",                          partCode:"45225795", qtyInStock:2 },
  ];

  maintItems.forEach(item => {
    window._fb.saveMaintStock("30+", item.productId, { productName:item.productName, partCode:item.partCode, qtyInStock:item.qtyInStock });
    const tx = { type:"receive_maint", machine:"30+", category:"maintenance", productId:item.productId, productName:item.productName, partCode:item.partCode, qty:item.qtyInStock, op, timestamp:now, notes:"Initial inventory seed" };
    window._fb.saveInvTransaction(tx);
  });

  if (!auto) { alert("30+ inventory seeded successfully!"); renderInventory(); }
}

// ─── Seed initial 30 spare parts inventory ───────────
function seed30PartsInventory(auto) {
  if (!window._fb) { if (!auto) alert("Not connected to Firebase. Please log in first."); return; }

  const now = new Date().toISOString();
  const op  = "Initial Seed";

  const partsQty = {
    "30pt_oldwhiteprinthead":2,  "30pt_carriageliftrail":1, "30pt_inkpump":1,           "30pt_inkclamps":2,
    "30pt_usbcable":1,           "30pt_inklinecaps":22,     "30pt_screwthreads":4,      "30pt_socketheadcap":23,
    "30pt_inklineconnectors":5,  "30pt_maletofemaleconn":22,"30pt_screws_1":22,         "30pt_taigon":1,
    "30pt_cleartubing":1,        "30pt_inktubeaccessories":1,"30pt_printheadframe":2,   "30pt_bulkinkfilter":1,
    "30pt_lampfilterframe":2,    "30pt_anticrashcable":1,   "30pt_screws_2":0,          "30pt_cinchclamp":22,
  };

  PARTS_INVENTORY_PRODUCTS["30"].forEach(prod => {
    const qty = partsQty[prod.id] || 0;
    if (!_partsStock["30"]) _partsStock["30"] = {};
    _partsStock["30"][prod.id] = { productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qtyInStock:qty, condition:"New" };
    window._fb.savePartsStock("30", prod.id, _partsStock["30"][prod.id]);
    if (qty > 0) {
      const tx = { type:"receive_parts", machine:"30", category:"parts", productId:prod.id, productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qty, op, timestamp:now, notes:"Initial inventory seed" };
      window._fb.saveInvTransaction(tx);
    }
  });

  if (!auto) { alert("30 spare parts inventory seeded successfully!"); renderInventory(); }
}

// ─── Seed initial 30+ spare parts inventory ──────────
function seed30PlusPartsInventory(auto) {
  if (!window._fb) { if (!auto) alert("Not connected to Firebase. Please log in first."); return; }

  const now = new Date().toISOString();
  const op  = "Initial Seed";

  const partsQty = {
    "30ppt_oldpcba16c":1,        "30ppt_oldprintheadmount":2, "30ppt_cinchclamps":22,      "30ppt_inklinem2f":22,
    "30ppt_socketheadcap":22,    "30ppt_inklinecaps":22,      "30ppt_inklineconnector":22, "30ppt_inklineopener":1,
    "30ppt_asmcablecarriage":1,  "30ppt_ionicbarpower":1,     "30ppt_linearencodermount":1,"30ppt_lockwashers":5,
    "30ppt_washers":5,           "30ppt_bearingscarriage":1,  "30ppt_heightsolenoid":1,    "30ppt_filter2":8,
    "30ppt_screws":0,            "30ppt_printheadframe":1,    "30ppt_cablesubboard":1,     "30ppt_oldprinthead":1,
    "30ppt_oldlamp":1,
  };

  PARTS_INVENTORY_PRODUCTS["30+"].forEach(prod => {
    const qty = partsQty[prod.id] || 0;
    if (!_partsStock["30+"]) _partsStock["30+"] = {};
    _partsStock["30+"][prod.id] = { productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qtyInStock:qty, condition:"New" };
    window._fb.savePartsStock("30+", prod.id, _partsStock["30+"][prod.id]);
    if (qty > 0) {
      const tx = { type:"receive_parts", machine:"30+", category:"parts", productId:prod.id, productName:prod.name, partCode:prod.partCode||"", location:prod.location||"", qty, op, timestamp:now, notes:"Initial inventory seed" };
      window._fb.saveInvTransaction(tx);
    }
  });

  if (!auto) { alert("30+ spare parts inventory seeded successfully!"); renderInventory(); }
}

// ─── Export to Excel ─────────────────────────────────
function exportInventoryExcel() {
  const wb    = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString().replace(/\//g, "-");

  // Sheet 1 — Current Ink Stock
  const inkRows = [["Machine","Product","Part Code","Lot Number","Expiration","Qty Remaining","Received Date","Received By"]];
  Object.values(_inkLots)
    .sort((a,b) => (a.machine+a.productName).localeCompare(b.machine+b.productName) || new Date(a.expDate||0) - new Date(b.expDate||0))
    .forEach(lot => {
      const exp = lot.expDate   ? new Date(lot.expDate).toLocaleDateString()   : "";
      const rec = lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString() : "";
      inkRows.push([lot.machine, lot.productName, lot.partCode||"", lot.lotNumber, exp, lot.qtyRemaining||0, rec, lot.receivedBy||""]);
    });
  const ws1 = XLSX.utils.aoa_to_sheet(inkRows);
  ws1["!cols"] = [10,18,14,16,14,12,16,14].map(w => ({ wch:w }));
  XLSX.utils.book_append_sheet(wb, ws1, "Ink Stock");

  // Sheet 2 — Current Maintenance Stock
  const maintRows = [["Machine","Product","Part Code","Qty In Stock"]];
  Object.entries(_maintStock).sort(([a],[b]) => a.localeCompare(b)).forEach(([machine, prods]) => {
    Object.values(prods).sort((a,b) => (a.productName||"").localeCompare(b.productName||"")).forEach(data => {
      maintRows.push([machine, data.productName||"", data.partCode||"", data.qtyInStock||0]);
    });
  });
  const ws2 = XLSX.utils.aoa_to_sheet(maintRows);
  ws2["!cols"] = [10,30,14,12].map(w => ({ wch:w }));
  XLSX.utils.book_append_sheet(wb, ws2, "Maintenance Stock");

  // Sheet 3 — Current Spare Parts Stock
  const partsRows = [["Machine","Location","Description","Part Number","Condition","Qty In Stock"]];
  Object.entries(_partsStock).sort(([a],[b]) => a.localeCompare(b)).forEach(([machine, prods]) => {
    Object.values(prods).sort((a,b) => (a.location||"").localeCompare(b.location||"")).forEach(data => {
      partsRows.push([machine, data.location||"", data.productName||"", data.partCode||"", data.condition||"New", data.qtyInStock||0]);
    });
  });
  const ws3 = XLSX.utils.aoa_to_sheet(partsRows);
  ws3["!cols"] = [10,10,30,14,12,12].map(w => ({ wch:w }));
  XLSX.utils.book_append_sheet(wb, ws3, "Spare Parts Stock");

  // Sheet 4 — Full Transaction History
  const TYPE_LABELS = { receive_ink:"Receive Ink", use_ink:"Use Ink", receive_maint:"Receive Supply", use_maint:"Use Supply", receive_parts:"Receive Part", use_parts:"Use Part", condition_change:"Condition Change", admin_adjust:"Admin Adjust" };
  const txRows = [["Date","Time","Type","Machine","Category","Product","Part Code","Lot Number","Exp Date","Qty","Operator","Notes"]];
  Object.values(_invTxs)
    .sort((a,b) => new Date(a.timestamp||0) - new Date(b.timestamp||0))
    .forEach(tx => {
      const d = tx.timestamp ? new Date(tx.timestamp) : null;
      txRows.push([
        d ? d.toLocaleDateString() : "",
        d ? d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "",
        TYPE_LABELS[tx.type] || tx.type,
        tx.machine||"", tx.category||"", tx.productName||"", tx.partCode||"",
        tx.lotNumber||"", tx.expDate||"", tx.qty||0, tx.op||"", tx.notes||""
      ]);
    });
  const ws4 = XLSX.utils.aoa_to_sheet(txRows);
  ws4["!cols"] = [12,10,16,10,14,20,14,14,12,8,12,28].map(w => ({ wch:w }));
  XLSX.utils.book_append_sheet(wb, ws4, "Transaction History");

  XLSX.writeFile(wb, `inventory-${today}.xlsx`);
}
