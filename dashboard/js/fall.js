// ══════════════════════════════════════════
//  FALL DECORATIONS for EGDash (goes with css/fall.css)
//  Motion stays in open space (the sidebar edge, the gaps above and below cards)
//  and always passes BEHIND the cards, so it never covers the numbers.
//  - Sidebar:          a spider drops down on its thread now and then
//  - Machine Summary:  every so often a little mummy pops up from behind a random card, facing left
//                      or right, looks around, and ducks back down (no running, no turning).
//                      Was a squirrel until 2026-10-08 (owner wanted something spookier, same motion).
//  - Weekly:           a line of dancing skeletons standing on top of the This Week calendar boxes
//                      (img/dancing-skeletons.gif, Pixabay, by MXJ_files, free under the Pixabay Content License)
//  - Shipping Status:  a sleeping black kitten on a pumpkin fills the open space below the
//                      4 station cards (img/pumpkin-cat.gif, Pixabay "pumpkin cat relax" by MissKaLem,
//                      free under the Pixabay Content License)
//  - Production by Hour chart: bars colored like the owner's candy corn art (EG_CHART_THEME)
//  Self-contained: remove this file + its <script> tag to take it out.
// ══════════════════════════════════════════
(function () {
  // Production by Hour chart as candy corn (read by renderChart in js/app.js).
  // Colors sampled from the owner's candy corn artwork (Desktop\candy corn.png, 2026-09-24):
  //   Printed = the orange candy corn: yellows at the bottom -> oranges -> cream tip
  //   Shipping = the purple candy corn: salmon at the bottom -> lavender -> purple -> peach tip
  // Each machine / shipping stage gets its own shade so every category still shows.
  window.EG_CHART_THEME = {
    machineColors: { "30": "#f1bd02", "30+": "#f9c91d", "H5": "#f5a524", "Colex": "#f08120",
                     "Wallets": "#e8710c", "Drinkware M1": "#f6d9a0", "Drinkware M2": "#efe6c4" },
    stationColors: { shipped: "#e79d82", readyToShip: "#aa91ab", sorting: "#46408a", assembly: "#7d6fb0" },
    outline: "rgba(0,0,0,0.5)",
    axisColor: "#c9b39b",                    // spooky theme: muted bone on the dark background
    gridColor: "rgba(247,196,143,0.18)",     // faint light-orange dashes
  };

  // Spooky theme (css/spooky.css): the dashboard's status colors are dark shades
  // meant for a white page, so swap each for a brighter shade of the same color.
  // Same meaning (green = on track, orange = behind); read by themeColor() in js/app.js.
  window.EG_STATUS_COLOR_SWAP = {
    "#0d6748": "#4cc38a",   // on track (dark green -> bright green)
    "#568e7b": "#7cc4ab",
    "#8aaa44": "#b5d46a",
    "#c9b93a": "#e6d25a",
    "#d69a4a": "#ffb766",
    "#c4770a": "#ff8c2e",   // behind / down (orange -> bright orange)
    "#c8cbc6": "#8a8090",   // no data yet
  };

  const style = document.createElement("style");
  style.textContent = `
  /* Sidebar spider */
  #fall-spider { position: fixed; left: 19px; top: -26px; width: 1px; height: 0; background: rgba(247,196,143,0.6);
    pointer-events: none; z-index: 60; animation: fall-spider-drop 16s ease-in-out infinite; }
  #fall-spider svg { position: absolute; left: -15px; bottom: -27px; width: 30px;
    filter: drop-shadow(0 0 2px rgba(247,196,143,0.8)); }   /* soft rim so the dark spider shows on the dark theme */
  #fall-spider .legs { animation: fall-wiggle 0.5s ease-in-out infinite alternate; transform-origin: 16px 14px; }
  @keyframes fall-spider-drop {
    0%, 12%   { height: 0; }
    35%       { height: 42vh; }
    40%       { height: 39vh; }
    45%, 68%  { height: 41vh; }
    88%, 100% { height: 0; }
  }
  @keyframes fall-wiggle { from { transform: scaleX(1); } to { transform: scaleX(0.85); } }

  /* Machine Summary: mummy — travels behind the cards */
  #view-today { position: relative; }
  #view-today .machine-card { position: relative; z-index: 1; }            /* cards sit in front of him */
  #fall-creature-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
  #fall-creature { position: absolute; left: 0; top: 0; width: 58px; visibility: hidden; }
  #fall-creature.show { visibility: visible; }
  #fall-creature.left .face { transform: scaleX(-1); }
  #fall-creature svg { display: block; width: 100%; overflow: visible; }
  #fall-creature .whole { transform-origin: 40px 58px; transition: transform 0.35s ease; }
  #fall-creature .tail { transform-origin: 34px 21px; }                      /* loose bandage behind his head */
  #fall-creature .eye { filter: drop-shadow(0 0 2px #ffcf4a) drop-shadow(0 0 4px #ff8c2e); }
  #fall-creature.sitting .whole { transform: rotate(-5deg); }                /* leans in, arms out */
  #fall-creature.sitting .tail { animation: fall-tail-sit 1.4s ease-in-out infinite alternate; }
  #fall-creature.sitting .head { animation: fall-look 1.5s ease-in-out infinite; transform-origin: 44px 34px; }
  @keyframes fall-tail-sit { from { transform: rotate(-4deg); } to { transform: rotate(6deg); } }
  @keyframes fall-look { 0%,60%,100% { transform: rotate(0deg); } 70%,90% { transform: rotate(-10deg); } }

  /* Shipping Status: kitten on a pumpkin, in the bottom-right corner of the open space under the cards */
  #fall-pumpkin-cat { flex: 1; min-height: 0; display: flex; align-items: flex-end; justify-content: flex-end; pointer-events: none; }
  #fall-pumpkin-cat img { height: 100%; max-height: 380px; width: auto; }

  /* Weekly: a chorus line of dancing skeletons standing on the top edge of the This Week calendar,
     beside the "This Week" label (moved down from the title line 2026-10-08, where they ran into
     the Shift Progress bars). The GIF is tiled as a repeating background, so it fills any width. */
  #fall-skeleton-label { position: relative; }
  #fall-skeletons { position: absolute; left: 110px; right: 0; bottom: -22px; height: 56px; pointer-events: none;
    background: url(img/dancing-skeletons.gif) repeat-x left bottom / auto 56px;
    /* hide every other pair so there's a gap between them (owner: "that's a lot") */
    -webkit-mask-image: repeating-linear-gradient(to right, #000 0 56px, transparent 56px 112px);
            mask-image: repeating-linear-gradient(to right, #000 0 56px, transparent 56px 112px); }

  /* Chart key: pumpkins instead of circles (each pumpkin keeps its series color) */
  #chart-legend .legend-dot.fall-pumpkin { width: 18px; height: 18px; background: none !important;
    box-shadow: none !important; border-radius: 0; }
  #chart-legend .legend-dot.fall-pumpkin svg { display: block; width: 100%; height: 100%; }

  /* A plain 0 becomes a dark blinking eye (sized to the text around it) */
  .fall-eye { display: inline-block; width: 1.25em; height: 0.84em; vertical-align: -0.1em; }
  .fall-eye svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .fall-eye .lid { transform-origin: 12px 8px; animation: fall-blink 5s infinite; animation-delay: var(--blink-delay, 0s); }
  .fall-eye .iris { animation: fall-glance 7s ease-in-out infinite; animation-delay: var(--blink-delay, 0s); }
  @keyframes fall-blink { 0%, 90%, 100% { transform: scaleY(1); } 93%, 95% { transform: scaleY(0.08); } }
  @keyframes fall-glance { 0%, 30%, 100% { transform: translateX(0); } 40%, 60% { transform: translateX(-2.2px); } 70%, 85% { transform: translateX(2.2px); } }

  @media (prefers-reduced-motion: reduce) { #fall-spider, #fall-pumpkin-cat, #fall-skeletons { display: none; } }`;
  document.head.appendChild(style);

  const SPIDER_SVG = `
  <svg viewBox="0 0 32 30" xmlns="http://www.w3.org/2000/svg">
    <g class="legs" stroke="#2b1a10" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M12 12 L4 6 L1 12"/><path d="M12 14 L3 13 L0 19"/>
      <path d="M12 16 L4 19 L2 26"/><path d="M13 18 L7 24 L6 29"/>
      <path d="M20 12 L28 6 L31 12"/><path d="M20 14 L29 13 L32 19"/>
      <path d="M20 16 L28 19 L30 26"/><path d="M19 18 L25 24 L26 29"/>
    </g>
    <ellipse cx="16" cy="18" rx="6" ry="7" fill="#2b1a10"/>
    <circle cx="16" cy="10" r="4" fill="#2b1a10"/>
    <circle cx="14.5" cy="10" r="1" fill="#ff7a1a"/><circle cx="17.5" cy="10" r="1" fill="#ff7a1a"/>
  </svg>`;

  const CREATURE_SVG = `<div class="face">
  <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg"><g class="whole">
    <path class="tail" d="M35 19 C27 16 22 23 13 20 C16 26 25 27 34 25 Z" fill="#d9ccb0"/>
    <rect x="27" y="34" width="26" height="28" rx="9" fill="#e8dcc4"/>
    <rect x="44" y="37" width="30" height="7" rx="3.5" fill="#e8dcc4"/>
    <rect x="44" y="46" width="27" height="7" rx="3.5" fill="#ddd0b4"/>
    <path d="M28 41 L52 38 M28 48 L52 45 M28 55 L52 52" stroke="#b9a98a" stroke-width="1.3" fill="none"/>
    <path d="M53 37 L55 44 M61 37 L63 44 M68 37 L70 44 M54 46 L56 53 M62 46 L64 53" stroke="#b9a98a" stroke-width="1" fill="none"/>
    <g class="head">
      <circle cx="44" cy="24" r="12" fill="#e8dcc4"/>
      <path d="M32.5 19 L55 15 M33 31 L55 28 M35 35 L52 33" stroke="#b9a98a" stroke-width="1.3" fill="none"/>
      <path d="M37.5 22.5 L55.5 19.5 L56 25 L38 27.5 Z" fill="#1d140f"/>
      <circle class="eye" cx="50" cy="22.8" r="2.1" fill="#ffcf4a"/>
      <circle cx="42.5" cy="23.9" r="1.3" fill="#ff8c2e" opacity="0.55"/>
    </g>
  </g></svg></div>`;


  const rand = (min, max) => min + Math.random() * (max - min);

  const isActive = (id) => document.getElementById(id)?.classList.contains("active")
    && !document.getElementById("content-pace")?.classList.contains("active");

  // ── Machine Summary: pop up behind a random card → look around → duck down → next card ──
  function addCreature() {
    const view = document.getElementById("view-today");
    if (!view) return;
    const layer = document.createElement("div");
    layer.id = "fall-creature-layer";
    layer.setAttribute("aria-hidden", "true");
    const sq = document.createElement("div");
    sq.id = "fall-creature";
    sq.innerHTML = CREATURE_SVG;
    layer.appendChild(sq);
    view.prepend(layer);

    const POP = "cubic-bezier(.3,1.6,.5,1)";   // springy pop
    let timer = null, running = false, lastCard = null;
    function place(x, y, seconds, easing) {
      sq.style.transition = seconds ? `transform ${seconds}s ${easing}` : "none";
      sq.style.transform = `translate(${x}px, ${y}px)`;
    }
    function stop() {
      clearTimeout(timer); running = false; lastCard = null;
      sq.className = "";
    }
    function next() {
      if (!running) return;
      const cards = [...view.querySelectorAll(".machine-card")];
      const choices = cards.length > 1 ? cards.filter(c => c !== lastCard) : cards;
      if (!choices.length) { timer = setTimeout(next, 1500); return; }
      const card = choices[Math.floor(Math.random() * choices.length)];
      lastCard = card;

      const box = view.getBoundingClientRect(), r = card.getBoundingClientRect();
      const W = sq.offsetWidth || 58, H = sq.offsetHeight || 44;
      const x = r.left - box.left + rand(0.1, 0.9) * Math.max(0, r.width - W);
      const hidden = r.top - box.top + 12, up = r.top - box.top - H + 4;

      place(x, hidden, 0);                                     // move into place behind the card, unseen
      sq.classList.add("show", "sitting");
      sq.classList.toggle("left", Math.random() < 0.5);       // faces left or right the whole time
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!running) return;                                  // screen changed meanwhile
        place(x, up, 0.45, POP);                               // pop up
        timer = setTimeout(() => {
          place(x, hidden, 0.3, "ease-in");                    // duck back down
          timer = setTimeout(next, rand(3000, 6000));          // stay away a little while before the next peek
        }, rand(2200, 3000));                                  // look around
      }));
    }
    setInterval(() => {
      const active = isActive("view-today");
      if (active && !running) { running = true; timer = setTimeout(next, rand(800, 4000)); } // short random start so he shows up most rotations
      if (!active && running) stop();
    }, 250);
  }

  // ── Shipping Status: kitten on a pumpkin under the station cards ──
  function addPumpkin() {
    const updated = document.getElementById("shipping-updated");
    if (!updated) return;
    const box = document.createElement("div");
    box.id = "fall-pumpkin-cat";
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = `<img src="img/pumpkin-cat.gif" alt="">`;
    updated.insertAdjacentElement("beforebegin", box);
  }

  // ── Weekly: dancing skeletons ──
  function addSkeletons() {
    const label = document.getElementById("week-this-grid")?.previousElementSibling;   // the "This Week" label
    if (!label) return;
    label.id = "fall-skeleton-label";
    label.insertAdjacentHTML("beforeend", `<div id="fall-skeletons" aria-hidden="true"></div>`);
  }

  // ── Chart key: swap each colored circle for a pumpkin in the same color ──
  // renderChart (js/app.js) rebuilds the key on every refresh, so watch for that and re-swap.
  const pumpkinSvg = (fill) => `
    <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="${fill}" stroke="rgba(74,44,23,0.55)" stroke-width="0.9">
        <ellipse cx="6.2" cy="12.2" rx="4.9" ry="5.9"/>
        <ellipse cx="13.8" cy="12.2" rx="4.9" ry="5.9"/>
        <ellipse cx="10" cy="12.2" rx="4.4" ry="6.4"/>
      </g>
      <path d="M9.1 6.2 C9.2 4.4 9.6 3.1 11 2.2 L11.9 3.2 C11 3.9 10.8 4.9 10.9 6.2 Z" fill="#5b6b2a"/>
    </svg>`;
  function pumpkinLegend() {
    const legend = document.getElementById("chart-legend");
    if (!legend) return;
    const swap = () => legend.querySelectorAll(".legend-dot:not(.fall-pumpkin)").forEach(dot => {
      const color = dot.style.backgroundColor || "#f08120";
      dot.classList.add("fall-pumpkin");
      dot.innerHTML = pumpkinSvg(color);
    });
    swap();
    new MutationObserver(swap).observe(legend, { childList: true });
  }

  // ── A plain 0 anywhere on the page becomes a dark blinking eye ──
  // Only text that is exactly "0" (so 10, 100 and 2026 stay normal). The page rewrites
  // its numbers on every refresh, so keep watching and swap any new 0s.
  const EYE_SVG = `
    <svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g class="lid">
        <path d="M1 8 C5 1.5 19 1.5 23 8 C19 14.5 5 14.5 1 8 Z" fill="#1c120c" stroke="#3a2416" stroke-width="1"/>
        <g class="iris">
          <circle cx="12" cy="8" r="4.3" fill="#c25a12"/>
          <circle cx="12" cy="8" r="2.6" fill="#e8942e"/>
          <ellipse cx="12" cy="8" rx="1" ry="3.2" fill="#0a0604"/>
          <circle cx="13.6" cy="6.4" r="0.8" fill="#fff4dc" opacity="0.8"/>
        </g>
      </g>
    </svg>`;
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION", "TITLE"]);
  function eyeZeros(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim() === "0" && n.parentElement && !SKIP.has(n.parentElement.tagName)
        && !n.parentElement.closest("svg, .fall-eye") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    const zeros = [];
    while (walker.nextNode()) zeros.push(walker.currentNode);
    zeros.forEach(n => {
      const eye = document.createElement("span");
      eye.className = "fall-eye";
      eye.setAttribute("role", "img");
      eye.setAttribute("aria-label", "0");
      eye.style.setProperty("--blink-delay", (-Math.random() * 5).toFixed(2) + "s");  // don't all blink together
      eye.innerHTML = EYE_SVG;
      n.replaceWith(eye);
    });
  }
  function watchZeros() {
    eyeZeros(document.body);
    new MutationObserver(muts => {
      for (const m of muts) {
        const t = m.type === "characterData" ? m.target.parentElement : m.target;
        if (t && t.isConnected) eyeZeros(t);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ── Pace screen gets the purple palette: body.spooky-pace while #content-pace is showing ──
  function watchPace() {
    const pace = document.getElementById("content-pace");
    if (!pace) return;
    const sync = () => document.body.classList.toggle("spooky-pace", pace.classList.contains("active"));
    sync();
    new MutationObserver(sync).observe(pace, { attributes: true, attributeFilter: ["class"] });
  }

  function start() {
    watchPace();
    watchZeros();
    pumpkinLegend();
    addCreature();
    addSkeletons();
    addPumpkin();
    const spider = document.createElement("div");
    spider.id = "fall-spider";
    spider.setAttribute("aria-hidden", "true");
    spider.innerHTML = SPIDER_SVG;
    document.body.appendChild(spider);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
