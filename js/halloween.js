// ══════════════════════════════════════════
//  HALLOWEEN DECORATIONS
//  Self-contained: remove this file + its <script> tag to take it all out.
//  - Pumpkin next to the logo
//  - Home screen:      a bat flies across every so often
//  - Tally screens:    a spider drops down on a web line (left side)
//  - Maintenance timer: a witch sweeps with her broom (bottom-left)
//  Turns itself off after Halloween (Nov 1).
// ══════════════════════════════════════════
(function () {
  const now = new Date();
  if (now.getMonth() === 10 || now.getMonth() === 11) return; // Nov/Dec: off

  const css = `
  .hw-deco { position: fixed; pointer-events: none; z-index: 250; }
  #hw-pumpkin { font-size: 30px; align-self: center; margin-left: -8px; display: inline-block;
    animation: hw-wobble 3s ease-in-out infinite; transform-origin: 50% 90%; }
  @keyframes hw-wobble { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }

  /* Bat */
  #hw-bat { top: 30%; left: -90px; width: 70px; display: none; }
  #hw-bat.fly { display: block; animation: hw-bat-fly 7s linear forwards; }
  #hw-bat .wing-l, #hw-bat .wing-r { animation: hw-flap 0.22s ease-in-out infinite alternate; }
  #hw-bat .wing-l { transform-origin: 34px 20px; }
  #hw-bat .wing-r { transform-origin: 36px 20px; }
  @keyframes hw-flap { from { transform: scaleY(1); } to { transform: scaleY(-0.35); } }
  @keyframes hw-bat-fly {
    0%   { transform: translate(0, 0); }
    20%  { transform: translate(22vw, -50px); }
    40%  { transform: translate(44vw, 30px); }
    60%  { transform: translate(66vw, -40px); }
    80%  { transform: translate(88vw, 20px); }
    100% { transform: translate(calc(100vw + 180px), -30px); }
  }

  /* Spider */
  #hw-spider-wrap { left: 0; top: 0; width: 120px; display: none; }
  #hw-spider-wrap.show { display: block; }
  #hw-web { position: absolute; left: 0; top: 0; width: 110px; opacity: 0.55; }
  #hw-thread { position: absolute; left: 34px; top: 18px; width: 1px; height: 0; background: #555;
    animation: hw-drop 9s ease-in-out infinite; }
  #hw-spider { position: absolute; left: -15px; bottom: -26px; width: 32px; }
  #hw-spider .legs { animation: hw-wiggle 0.5s ease-in-out infinite alternate; transform-origin: 16px 14px; }
  @keyframes hw-drop {
    0%, 8%   { height: 0; }
    30%      { height: 210px; }
    36%      { height: 190px; }
    42%, 70% { height: 205px; }
    92%,100% { height: 0; }
  }
  @keyframes hw-wiggle { from { transform: scaleX(1); } to { transform: scaleX(0.85); } }

  /* Witch */
  #hw-witch { left: 12px; bottom: 8px; width: 150px; display: none; }
  #hw-witch.show { display: block; }
  #hw-witch .body { animation: hw-bob 1.2s ease-in-out infinite; }
  #hw-witch .broom { animation: hw-sweep 1.2s ease-in-out infinite; transform-origin: 78px 70px; }
  #hw-witch .dust { animation: hw-dust 1.2s ease-out infinite; }
  #hw-witch .dust2 { animation-delay: 0.6s; }
  @keyframes hw-bob   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
  @keyframes hw-sweep { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(10deg); } }
  @keyframes hw-dust  { 0% { opacity: 0; transform: translate(0,0) scale(0.4); }
                        30% { opacity: 0.7; }
                        100% { opacity: 0; transform: translate(-22px,-14px) scale(1.3); } }

  @media (prefers-reduced-motion: reduce) {
    #hw-pumpkin, #hw-bat .wing-l, #hw-bat .wing-r, #hw-spider .legs,
    #hw-witch .body, #hw-witch .broom, #hw-witch .dust { animation: none; }
  }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const BAT_SVG = `
  <svg viewBox="0 0 70 40" xmlns="http://www.w3.org/2000/svg">
    <path class="wing-l" d="M34 20 C28 8 16 6 2 10 C8 14 8 18 6 22 C12 19 16 22 18 26 C22 21 28 22 34 24 Z" fill="#1b1424"/>
    <path class="wing-r" d="M36 20 C42 8 54 6 68 10 C62 14 62 18 64 22 C58 19 54 22 52 26 C48 21 42 22 36 24 Z" fill="#1b1424"/>
    <ellipse cx="35" cy="22" rx="5" ry="7" fill="#1b1424"/>
    <path d="M31 16 L32 11 L34 15 Z M39 16 L38 11 L36 15 Z" fill="#1b1424"/>
    <circle cx="33.3" cy="19" r="1" fill="#ffb84d"/><circle cx="36.7" cy="19" r="1" fill="#ffb84d"/>
  </svg>`;

  const WEB_SVG = `
  <svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#666" stroke-width="1">
    <path d="M0 0 L110 60 M0 0 L95 95 M0 0 L60 110 M0 0 L20 110 M0 0 L110 20"/>
    <path d="M0 22 Q10 16 22 11 Q18 18 21 22 Q14 24 8 20" />
    <path d="M22 11 Q30 10 36 17 Q30 22 31 28 Q24 26 21 22"/>
    <path d="M0 45 Q16 36 31 28 M31 28 Q42 28 52 34 M0 45 L8 44"/>
    <path d="M36 17 Q46 12 56 10 M10 70 Q24 54 44 45 Q58 44 70 50"/>
    <path d="M56 10 Q70 12 82 14 M44 45 L52 34 M70 50 L76 36 L82 14"/>
  </svg>`;

  const SPIDER_SVG = `
  <svg viewBox="0 0 32 30" xmlns="http://www.w3.org/2000/svg">
    <g class="legs" stroke="#1b1424" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M12 12 L4 6 L1 12"/><path d="M12 14 L3 13 L0 19"/>
      <path d="M12 16 L4 19 L2 26"/><path d="M13 18 L7 24 L6 29"/>
      <path d="M20 12 L28 6 L31 12"/><path d="M20 14 L29 13 L32 19"/>
      <path d="M20 16 L28 19 L30 26"/><path d="M19 18 L25 24 L26 29"/>
    </g>
    <ellipse cx="16" cy="18" rx="6" ry="7" fill="#1b1424"/>
    <circle cx="16" cy="10" r="4" fill="#1b1424"/>
    <circle cx="14.5" cy="10" r="1" fill="#ff7a1a"/><circle cx="17.5" cy="10" r="1" fill="#ff7a1a"/>
  </svg>`;

  const WITCH_SVG = `
  <svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="144" rx="44" ry="4" fill="rgba(0,0,0,0.12)"/>
    <g class="dust"><circle cx="40" cy="138" r="5" fill="#c9b8a0"/><circle cx="32" cy="134" r="3" fill="#c9b8a0"/></g>
    <g class="dust dust2"><circle cx="48" cy="140" r="4" fill="#c9b8a0"/><circle cx="38" cy="132" r="2.5" fill="#c9b8a0"/></g>
    <g class="broom">
      <line x1="112" y1="40" x2="44" y2="128" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 122 L26 142 L36 146 L44 144 L52 146 L58 130 Z" fill="#d9a441"/>
      <path d="M49 124 L55 131" stroke="#8a5a2b" stroke-width="3"/>
    </g>
    <g class="body">
      <!-- robe -->
      <path d="M78 58 C66 70 60 110 54 142 L108 142 C104 110 98 72 90 58 Z" fill="#3b2352"/>
      <path d="M54 142 L60 136 L66 142 L72 136 L78 142 L84 136 L90 142 L96 136 L102 142 L108 142 Z" fill="#2a173b"/>
      <!-- hair -->
      <path d="M72 40 C66 52 68 64 74 70 L78 50 Z M96 40 C100 52 98 62 94 68 L90 50 Z" fill="#ff7a1a"/>
      <!-- face -->
      <circle cx="84" cy="46" r="11" fill="#8fcf6a"/>
      <path d="M92 46 L102 50 L92 51 Z" fill="#8fcf6a"/>
      <circle cx="87" cy="43" r="1.6" fill="#1b1424"/>
      <path d="M84 53 Q88 55 91 52" stroke="#1b1424" stroke-width="1.2" fill="none"/>
      <!-- hat -->
      <ellipse cx="84" cy="36" rx="22" ry="4" fill="#1b1424"/>
      <path d="M72 35 L96 35 L88 18 L96 4 L80 16 Z" fill="#1b1424"/>
      <rect x="74" y="30" width="20" height="4" fill="#ff7a1a"/>
      <!-- arms holding broom -->
      <path d="M86 66 L96 80 L102 72" stroke="#3b2352" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="102" cy="71" r="3.5" fill="#8fcf6a"/>
      <circle cx="84" cy="86" r="3.5" fill="#8fcf6a"/>
      <path d="M80 68 L78 80 L84 86" stroke="#3b2352" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;

  function make(id, html, cls) {
    const el = document.createElement("div");
    el.id = id;
    el.className = "hw-deco" + (cls ? " " + cls : "");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  function isShown(id) {
    const el = document.getElementById(id);
    return !!el && el.offsetParent !== null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Pumpkin next to the logo
    const logo = document.querySelector("#top-bar > img");
    if (logo) {
      const p = document.createElement("span");
      p.id = "hw-pumpkin";
      p.textContent = "🎃";
      p.setAttribute("aria-hidden", "true");
      logo.insertAdjacentElement("afterend", p);
    }

    const bat = make("hw-bat", BAT_SVG);
    const spiderWrap = make("hw-spider-wrap",
      `<div id="hw-web">${WEB_SVG}</div><div id="hw-thread"><div id="hw-spider">${SPIDER_SVG}</div></div>`);
    const witch = make("hw-witch", WITCH_SVG);
    bat.addEventListener("animationend", () => bat.classList.remove("fly"));

    let lastBat = 0;
    function tick() {
      const loggedOut = isShown("session-gate") || isShown("pt-login-screen");
      const printingActive = document.getElementById("view-printing")?.classList.contains("active");
      const onTally = !loggedOut && (
        (printingActive && (isShown("print-tally-screen") || isShown("print-tally2-screen"))) ||
        document.getElementById("view-stamped")?.classList.contains("active"));
      const onHome = !loggedOut && printingActive && !onTally;
      const onMaintTimer =
        document.getElementById("clean-modal")?.classList.contains("open") ||
        (document.getElementById("mech-modal")?.classList.contains("open") && isShown("mech-fix-timer"));

      // Spider sits just under the top bar on the left
      if (onTally) {
        const tb = document.getElementById("top-bar");
        spiderWrap.style.top = (tb ? Math.max(0, tb.getBoundingClientRect().bottom) : 0) + "px";
      }
      spiderWrap.classList.toggle("show", !!onTally);
      witch.classList.toggle("show", !!onMaintTimer);

      // Bat: first flight shortly after landing on home, then every ~25s
      if (onHome && !onMaintTimer && !bat.classList.contains("fly") && Date.now() - lastBat > 25000) {
        if (lastBat === 0) lastBat = Date.now() - 22000; // first one ~3s in
        else { lastBat = Date.now(); bat.classList.add("fly"); }
      }
      if (!onHome) bat.classList.remove("fly");
    }
    setInterval(tick, 500);
  });
})();
