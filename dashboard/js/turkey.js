// ══════════════════════════════════════════
//  THANKSGIVING TURKEY for EGDash
//  Every 20-40 minutes a cartoon turkey runs along the bottom of the screen (either
//  direction, ~6 seconds), on whatever screen is showing. Click-through, never blocks anything.
//  Only runs Nov 1 through Thanksgiving (TURKEY_END); the date is checked before each run,
//  since the TV page stays open for days. ?turkey=1 runs one every 10 seconds for a preview.
//  Self-contained: remove this file + its <script> tag to take it out.
// ══════════════════════════════════════════
(function () {
  const TURKEY_START = new Date(2026, 10, 1);   // Nov 1, 2026
  const TURKEY_END   = new Date(2026, 10, 27);  // day after Thanksgiving (Thu Nov 26, 2026)
  const test = new URLSearchParams(location.search).has("turkey");
  const inSeason = () => { const n = new Date(); return n >= TURKEY_START && n < TURKEY_END; };

  const css = `
  #tk-runner { position: fixed; bottom: 4px; left: 0; width: 120px; height: 110px; z-index: 9000;
    pointer-events: none; will-change: transform; }
  #tk-runner.tk-ltr { animation: tk-ltr var(--tk-dur) linear forwards; }
  #tk-runner.tk-rtl { animation: tk-rtl var(--tk-dur) linear forwards; }
  @keyframes tk-ltr { from { transform: translateX(-140px); } to { transform: translateX(calc(100vw + 20px)); } }
  @keyframes tk-rtl { from { transform: translateX(calc(100vw + 20px)) scaleX(-1); } to { transform: translateX(-140px) scaleX(-1); } }
  #tk-runner .tk-body { animation: tk-bob .28s ease-in-out infinite alternate; transform-origin: 60px 70px; }
  @keyframes tk-bob { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-5px) rotate(2deg); } }
  #tk-runner .tk-leg { transform-box: fill-box; transform-origin: top center; }
  #tk-runner .tk-leg1 { animation: tk-step .28s ease-in-out infinite alternate; }
  #tk-runner .tk-leg2 { animation: tk-step .28s ease-in-out infinite alternate-reverse; }
  @keyframes tk-step { from { transform: rotate(-30deg); } to { transform: rotate(30deg); } }
  #tk-runner .tk-head { animation: tk-peck .28s ease-in-out infinite alternate; transform-origin: 82px 52px; }
  @keyframes tk-peck { from { transform: rotate(-4deg); } to { transform: rotate(6deg); } }
  `;

  // Side view, facing right. Fan tail behind, round brown body, head with red wattle.
  const SVG = `
  <svg viewBox="0 0 120 110" width="120" height="110" xmlns="http://www.w3.org/2000/svg">
    <g class="tk-leg tk-leg1"><path d="M58 82 L58 100 M58 100 l-6 4 M58 100 l6 4 M58 100 l0 6" stroke="#e08a1e" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>
    <g class="tk-leg tk-leg2"><path d="M68 82 L68 100 M68 100 l-6 4 M68 100 l6 4 M68 100 l0 6" stroke="#c9741a" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>
    <g class="tk-body">
      <g transform="translate(40 58)">
        <ellipse rx="10" ry="34" fill="#b5341f" transform="rotate(-75)"/>
        <ellipse rx="10" ry="36" fill="#e8892a" transform="rotate(-50)"/>
        <ellipse rx="10" ry="38" fill="#f2c03a" transform="rotate(-25)"/>
        <ellipse rx="10" ry="38" fill="#b5341f" transform="rotate(0)"/>
        <ellipse rx="10" ry="36" fill="#e8892a" transform="rotate(25)"/>
        <ellipse rx="9"  ry="32" fill="#f2c03a" transform="rotate(50)"/>
        <ellipse rx="9"  ry="30" fill="#7a4a24" transform="rotate(-62)"/>
        <ellipse rx="9"  ry="32" fill="#7a4a24" transform="rotate(-12)"/>
        <ellipse rx="9"  ry="30" fill="#7a4a24" transform="rotate(38)"/>
      </g>
      <ellipse cx="62" cy="68" rx="26" ry="22" fill="#6b3f1d"/>
      <path d="M46 66 q10 14 26 10 q-8 -4 -10 -12 q-6 6 -16 2z" fill="#8a5a2e"/>
      <g class="tk-head">
        <path d="M76 60 q6 -12 4 -22" stroke="#6b3f1d" stroke-width="10" stroke-linecap="round" fill="none"/>
        <circle cx="82" cy="34" r="10" fill="#c98a6a"/>
        <circle cx="85" cy="31" r="2.6" fill="#1b1b1b"/>
        <circle cx="85.8" cy="30.2" r="0.9" fill="#fff"/>
        <path d="M91 33 l9 3 l-9 3z" fill="#f2a91f"/>
        <path d="M89 38 q4 10 -1 15 q-4 -6 -1 -15z" fill="#d22b2b"/>
        <path d="M79 25 q2 -6 6 -4" stroke="#d22b2b" stroke-width="3" stroke-linecap="round" fill="none"/>
      </g>
    </g>
  </svg>`;

  function run() {
    if (!test && !inSeason()) return;
    if (document.getElementById("tk-runner")) return;
    const el = document.createElement("div");
    el.id = "tk-runner";
    el.className = Math.random() < 0.5 ? "tk-ltr" : "tk-rtl";
    el.style.setProperty("--tk-dur", "6s");
    el.innerHTML = SVG;
    el.addEventListener("animationend", e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
  }

  function next() {
    const ms = test ? 10000 : (20 + Math.random() * 20) * 60000;
    setTimeout(() => { run(); next(); }, ms);
  }

  function start() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    if (test) run();
    next();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
