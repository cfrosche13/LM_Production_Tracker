// ══════════════════════════════════════════
//  HALLOWEEN DECORATIONS
//  Self-contained: remove this file + its <script> tag to take it all out.
//  - Pumpkin next to the logo
//  - Home screen:      a bat flies across every so often
//  - Tally screens:    a spider drops down on a web line (right side)
//  - Maintenance timer: a witch sweeps with her broom (bottom-left, fills the side space)
//  - Dark purple / orange "Haunted House" colors and fonts (css/spooky.css), alternating by tab
//  - Tally screens: goo drips along the bottom of the Changeover / Waiting bar, and creatures
//    in the empty space beside the cards that change with the piece-type tab (TALLY_CREATURES)
//  - Every screen with empty space left and right: creatures on some tabs (VIEW_CREATURES)
//  - Every tab: the header ends at the same line (an empty strip stands in for the Changeover
//    bar where a tab doesn't have one), and the spider hangs its web at the right end of that
//    line, dropping down now and then
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
  #hw-bat.fly { display: block; animation: hw-bat-fly 12s linear forwards; }
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
  #hw-spider-wrap { right: 0; top: 0; width: 160px; display: none; }
  #hw-spider-wrap.show { display: block; }
  #hw-web { position: absolute; right: 0; top: 0; width: 150px; opacity: 0.55; transform: scaleX(-1); }
  #hw-thread { position: absolute; right: 46px; top: 24px; width: 1.5px; height: 0; background: #555;
    animation: hw-drop 22s ease-in-out infinite; }
  #hw-spider { position: absolute; left: -23px; bottom: -40px; width: 48px; }
  #hw-spider .legs { animation: hw-wiggle 0.5s ease-in-out infinite alternate; transform-origin: 16px 14px; }
  @keyframes hw-drop {
    0%, 50%  { height: 0; }
    62%      { height: 260px; }
    65%      { height: 235px; }
    68%, 80% { height: 255px; }
    92%,100% { height: 0; }
  }
  @keyframes hw-wiggle { from { transform: scaleX(1); } to { transform: scaleX(0.85); } }

  /* Witch */
  /* Sized to fill the empty space left of the ~560px-wide maintenance popup */
  #hw-witch { left: 24px; bottom: 12px; width: clamp(0px, calc(50vw - 330px), 400px); display: none; }
  #hw-witch.show { display: block; }
  .hw-witch-art .body { animation: hw-bob 1.2s ease-in-out infinite; }
  .hw-witch-art .broom { animation: hw-sweep 1.2s ease-in-out infinite; }
  .hw-witch-art .dust { animation: hw-dust 1.2s ease-out infinite; }
  .hw-witch-art .dust2 { animation-delay: 0.6s; }
  .hw-witch-art .tail { animation: hw-tail 1.6s ease-in-out infinite; }
  @keyframes hw-tail { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(10deg); } }
  @keyframes hw-bob   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
  @keyframes hw-sweep { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(10deg); } }
  @keyframes hw-dust  { 0% { opacity: 0; transform: translate(0,0) scale(0.4); }
                        30% { opacity: 0.7; }
                        100% { opacity: 0; transform: translate(-22px,-14px) scale(1.3); } }

  /* Tally screens: goo drips off the bottom edge of the Changeover / Waiting / Purge bar */
  body.sp-tally #transition-bar::after { content: ""; position: absolute; left: 0; right: 0; top: 100%;
    height: 22px; margin-top: -1px; background: var(--sp-frame, #a07cc5); pointer-events: none;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='22' viewBox='0 0 120 22'%3E%3Cpath d='M0 0H120V4C110 5 100 4.5 90 5.5C80 4.5 70 5.5 60 4.6C50 5.6 40 4.4 30 5.4C20 4.6 10 5.4 0 4.4ZM7.0 3.5C10.0 4.5 10.0 5.0 10.0 7.0A4.0 4.0 0 0 0 18.0 7.0C18.0 5.0 18.0 4.5 21.0 3.5ZM33.0 3.5C36.0 4.5 36.0 13.0 36.0 15.0A5.0 5.0 0 0 0 46.0 15.0C46.0 13.0 46.0 4.5 49.0 3.5ZM59.5 3.5C62.5 4.5 62.5 2.5 62.5 4.5A3.5 3.5 0 0 0 69.5 4.5C69.5 2.5 69.5 4.5 72.5 3.5ZM87.5 3.5C90.5 4.5 90.5 8.5 90.5 10.5A4.5 4.5 0 0 0 99.5 10.5C99.5 8.5 99.5 4.5 102.5 3.5Z'/%3E%3C/svg%3E") repeat-x left top / 120px 22px; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='22' viewBox='0 0 120 22'%3E%3Cpath d='M0 0H120V4C110 5 100 4.5 90 5.5C80 4.5 70 5.5 60 4.6C50 5.6 40 4.4 30 5.4C20 4.6 10 5.4 0 4.4ZM7.0 3.5C10.0 4.5 10.0 5.0 10.0 7.0A4.0 4.0 0 0 0 18.0 7.0C18.0 5.0 18.0 4.5 21.0 3.5ZM33.0 3.5C36.0 4.5 36.0 13.0 36.0 15.0A5.0 5.0 0 0 0 46.0 15.0C46.0 13.0 46.0 4.5 49.0 3.5ZM59.5 3.5C62.5 4.5 62.5 2.5 62.5 4.5A3.5 3.5 0 0 0 69.5 4.5C69.5 2.5 69.5 4.5 72.5 3.5ZM87.5 3.5C90.5 4.5 90.5 8.5 90.5 10.5A4.5 4.5 0 0 0 99.5 10.5C99.5 8.5 99.5 4.5 102.5 3.5Z'/%3E%3C/svg%3E") repeat-x left top / 120px 22px;
    filter: drop-shadow(0 0 3px var(--sp-frame, #a07cc5)); }
  #hw-goo-drops { position: absolute; left: 0; right: 0; top: 100%; height: 0; pointer-events: none; display: none; }
  body.sp-tally #hw-goo-drops { display: block; }
  #hw-goo-drops span { position: absolute; top: 12px; width: 9px; height: 11px; background: var(--sp-frame, #a07cc5);
    border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%; animation: hw-goo-drip 5s ease-in infinite; }
  @keyframes hw-goo-drip {
    0%, 45% { transform: translateY(-6px) scaleY(.4); opacity: 0; }
    55%     { transform: translateY(0) scaleY(.8); opacity: 1; }
    85%     { transform: translateY(8px) scaleY(1.15); opacity: 1; }
    100%    { transform: translateY(40px); opacity: 0; }
  }

  /* Stand-in for the Changeover / Waiting bar on tabs that don't have one, so the header
     always ends at the same line (height copied from the real bar) */
  #hw-bar-spacer { display: none; position: sticky; z-index: 198;
    top: calc(var(--top-bar-h, 84px) + var(--nav-bar-h, 50px)); height: var(--hw-bar-h, 82px);
    background: var(--sp-bg, #3a3242); border-bottom: 2px solid var(--sp-frame, #a07cc5);
    box-shadow: 0 2px 14px rgba(0,0,0,0.4); }
  body.sp-on #hw-bar-spacer.show { display: block; }

  /* Tally screens: creatures in the empty space left and right of the cards */
  .hw-gutter { position: fixed; overflow: hidden; pointer-events: none; z-index: 150; display: none; }
  .hw-gutter.show { display: block; }
  .hw-ghost { position: absolute; bottom: -90px; width: var(--size, 52px); opacity: 0;
    animation: hw-ghost-rise var(--dur, 16s) linear infinite; animation-delay: var(--delay, 0s); }
  .hw-ghost .sway { animation: hw-ghost-sway 3.2s ease-in-out infinite; }
  .hw-ghost svg { display: block; width: 100%; overflow: visible; filter: drop-shadow(0 0 6px rgba(255,246,234,0.6)); }
  @keyframes hw-ghost-rise {
    0%   { transform: translateY(0); opacity: 0; }
    10%  { opacity: 0.9; }
    85%  { opacity: 0.9; }
    100% { transform: translateY(-115vh); opacity: 0; }
  }
  @keyframes hw-ghost-sway { 0%,100% { transform: translateX(-12px) rotate(-6deg); } 50% { transform: translateX(12px) rotate(6deg); } }
  .hw-ghost .blink { animation: hw-ghost-blink 4s infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes hw-ghost-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }

  /* Walkers (mummy, cats): stroll back and forth along the bottom of the side space */
  .hw-walker { position: absolute; bottom: 14px; left: 0; width: var(--w);
    animation: hw-walk var(--dur, 22s) linear infinite; animation-delay: var(--delay, 0s); }
  .hw-walker .face { animation: hw-turn var(--dur, 22s) steps(1) infinite; animation-delay: var(--delay, 0s); }
  .hw-walker svg { display: block; width: 100%; overflow: visible; }
  @keyframes hw-walk { 0% { left: 0; } 50% { left: calc(100% - var(--w)); } 100% { left: 0; } }
  .hw-mummy svg { filter: drop-shadow(0 0 4px rgba(255,246,234,0.45)); }
  .hw-mummy .whole { animation: hw-shuffle 0.9s ease-in-out infinite; transform-origin: 40px 58px; }
  .hw-mummy .tail { animation: hw-bandage 1.4s ease-in-out infinite alternate; transform-origin: 34px 21px; }
  .hw-mummy .eye { filter: drop-shadow(0 0 2px #ffcf4a) drop-shadow(0 0 4px #ff8c2e); }
  /* Black cats: a soft light rim so they show on the dark page, glowing green eyes */
  .hw-cat svg { filter: drop-shadow(0 0 2px rgba(255,246,234,0.55)) drop-shadow(0 0 6px rgba(160,124,197,0.5)); }
  .hw-cat .leg { transform-box: fill-box; transform-origin: 50% 0; animation: hw-leg 0.7s ease-in-out infinite alternate; }
  .hw-cat .leg.b { animation-delay: -0.35s; }
  .hw-cat .ctail { transform-box: fill-box; transform-origin: 100% 100%; animation: hw-ctail 1.6s ease-in-out infinite alternate; }
  .hw-cat .ceye { filter: drop-shadow(0 0 3px #c6ff4a); }
  @keyframes hw-leg { from { transform: rotate(-16deg); } to { transform: rotate(16deg); } }
  @keyframes hw-ctail { from { transform: rotate(-10deg); } to { transform: rotate(14deg); } }
  /* Bats: loop around the side space, wings flapping */
  .hw-gbat { position: absolute; width: 100px; animation: hw-bat-loop var(--dur, 11s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
  .hw-gbat svg { display: block; width: 100%; filter: drop-shadow(0 0 3px rgba(247,196,143,0.75)); }
  .hw-gbat .wing-l, .hw-gbat .wing-r { animation: hw-flap 0.22s ease-in-out infinite alternate; }
  .hw-gbat .wing-l { transform-origin: 34px 20px; }
  .hw-gbat .wing-r { transform-origin: 36px 20px; }
  @keyframes hw-bat-loop {
    0%   { left: 8%;  top: 70%; }
    25%  { left: 60%; top: 35%; }
    50%  { left: 20%; top: 10%; }
    75%  { left: 65%; top: 55%; }
    100% { left: 8%;  top: 70%; }
  }
  /* Cauldron: bubbling green brew with bubbles rising out of it */
  .hw-cauldron { position: absolute; bottom: 10px; left: 50%; width: 150px; margin-left: -75px; }
  .hw-cauldron svg { display: block; width: 100%; overflow: visible; }
  .hw-cauldron .brew { filter: drop-shadow(0 0 8px #7cff6b); animation: hw-brew 1.8s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
  .hw-cauldron .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: hw-flame 0.5s ease-in-out infinite alternate; }
  .hw-cauldron .flame.b { animation-delay: -0.25s; }
  .hw-bubble { position: absolute; bottom: 92px; width: var(--s, 12px); height: var(--s, 12px); border-radius: 50%;
    background: rgba(124,255,107,0.35); border: 1.5px solid rgba(180,255,170,0.8); box-shadow: 0 0 8px rgba(124,255,107,0.6);
    animation: hw-bubble-up var(--dur, 4s) ease-in infinite; animation-delay: var(--delay, 0s); opacity: 0; }
  @keyframes hw-brew { from { transform: scaleY(0.85); } to { transform: scaleY(1.15); } }
  @keyframes hw-flame { from { transform: scaleY(0.8) skewX(-6deg); } to { transform: scaleY(1.15) skewX(6deg); } }
  @keyframes hw-bubble-up {
    0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
    15%  { opacity: 1; }
    70%  { opacity: 0.9; }
    100% { transform: translate(var(--drift, 10px), -220px) scale(1.2); opacity: 0; }
  }
  @keyframes hw-turn { 0% { transform: scaleX(1); } 50% { transform: scaleX(-1); } }
  @keyframes hw-shuffle { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
  @keyframes hw-bandage { from { transform: rotate(-6deg); } to { transform: rotate(8deg); } }

  @media (prefers-reduced-motion: reduce) {
    #hw-goo-drops span, .hw-ghost, .hw-ghost .sway, .hw-ghost .blink, .hw-walker, .hw-walker .face,
    .hw-mummy .whole, .hw-mummy .tail, .hw-cat .leg, .hw-cat .ctail, .hw-gbat, .hw-gbat .wing-l, .hw-gbat .wing-r,
    .hw-cauldron .brew, .hw-cauldron .flame, .hw-bubble { animation: none; }
    #hw-pumpkin, #hw-bat .wing-l, #hw-bat .wing-r, #hw-spider .legs,
    .hw-witch-art .body, .hw-witch-art .broom, .hw-witch-art .dust, .hw-witch-art .tail { animation: none; }
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

  // Pick which witch shows up: "sweeper", "silhouette" or "kitty".
  // (Add ?witch=kitty etc. to the URL to try one out on localhost.)
  const WITCH_CHOICE = "kitty";

  const WITCHES = {
    // A: green-faced witch, orange hair
    sweeper: `
  <svg class="hw-witch-art" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="144" rx="44" ry="4" fill="rgba(0,0,0,0.12)"/>
    <g class="dust"><circle cx="40" cy="138" r="5" fill="#c9b8a0"/><circle cx="32" cy="134" r="3" fill="#c9b8a0"/></g>
    <g class="dust dust2"><circle cx="48" cy="140" r="4" fill="#c9b8a0"/><circle cx="38" cy="132" r="2.5" fill="#c9b8a0"/></g>
    <g class="broom" style="transform-origin:78px 70px">
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
  </svg>`,

    // B: classic black silhouette in front of a harvest moon
    silhouette: `
  <svg class="hw-witch-art" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <circle cx="96" cy="58" r="44" fill="#ffb84d" opacity="0.35"/>
    <ellipse cx="72" cy="144" rx="46" ry="4" fill="rgba(0,0,0,0.14)"/>
    <g class="dust"><circle cx="38" cy="138" r="5" fill="#b8a890"/><circle cx="30" cy="133" r="3" fill="#b8a890"/></g>
    <g class="dust dust2"><circle cx="46" cy="140" r="4" fill="#b8a890"/><circle cx="36" cy="131" r="2.5" fill="#b8a890"/></g>
    <g class="broom" style="transform-origin:82px 74px">
      <line x1="114" y1="42" x2="42" y2="128" stroke="#1b1424" stroke-width="4" stroke-linecap="round"/>
      <path d="M46 122 L22 142 L32 147 L42 144 L50 147 L57 130 Z" fill="#1b1424"/>
    </g>
    <g class="body" fill="#1b1424">
      <path d="M82 60 C70 76 62 110 52 142 L112 142 C106 114 100 80 92 60 Z"/>
      <path d="M52 142 L58 134 L64 142 L71 133 L78 142 L85 134 L92 142 L99 133 L106 142 L112 142 Z"/>
      <path d="M92 64 C104 80 116 104 122 128 C112 118 104 110 96 100 Z"/>
      <circle cx="86" cy="48" r="10"/>
      <path d="M94 45 L110 52 L95 53 Z"/>
      <path d="M83 55 L90 63 L91 55 Z"/>
      <path d="M77 42 C70 55 71 66 65 74 L81 53 Z"/>
      <ellipse cx="86" cy="38" rx="25" ry="4"/>
      <path d="M73 37 L99 37 L92 18 L104 2 L84 14 Z"/>
      <path d="M86 66 L96 80 L103 72" stroke="#1b1424" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M80 68 L78 80 L85 86" stroke="#1b1424" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="90" cy="45" r="1.5" fill="#ffb84d"/>
  </svg>`,

    // C: cute little witch in striped stockings, with her black cat
    kitty: `
  <svg class="hw-witch-art" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hw-stripe" width="8" height="6" patternUnits="userSpaceOnUse">
        <rect width="8" height="6" fill="#1b1424"/><rect width="8" height="3" fill="#ff7a1a"/>
      </pattern>
    </defs>
    <ellipse cx="80" cy="144" rx="56" ry="4" fill="rgba(0,0,0,0.12)"/>
    <g class="dust"><circle cx="38" cy="138" r="5" fill="#d8c8f0"/><circle cx="30" cy="133" r="3" fill="#d8c8f0"/></g>
    <g class="dust dust2"><circle cx="46" cy="140" r="4" fill="#d8c8f0"/><circle cx="36" cy="131" r="2.5" fill="#d8c8f0"/></g>
    <g class="broom" style="transform-origin:84px 84px">
      <line x1="112" y1="52" x2="44" y2="128" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 122 L24 142 L34 147 L44 144 L52 147 L59 130 Z" fill="#e8c05a"/>
      <path d="M49 124 L56 131" stroke="#6b3fa0" stroke-width="3"/>
    </g>
    <g class="body">
      <rect x="75" y="116" width="7" height="22" fill="url(#hw-stripe)"/>
      <rect x="89" y="116" width="7" height="22" fill="url(#hw-stripe)"/>
      <ellipse cx="76" cy="140" rx="7" ry="3.5" fill="#1b1424"/>
      <ellipse cx="95" cy="140" rx="7" ry="3.5" fill="#1b1424"/>
      <path d="M78 66 L64 120 L106 120 L94 66 Z" fill="#6b3fa0"/>
      <path d="M64 120 L71 113 L78 120 L85 113 L92 120 L99 113 L106 120 Z" fill="#8fcf6a"/>
      <path d="M71 44 C64 58 66 70 72 76 L76 54 Z M100 44 C106 58 104 70 98 76 L95 54 Z" fill="#9b59d0"/>
      <circle cx="86" cy="52" r="14" fill="#ffd9b8"/>
      <circle cx="80" cy="52" r="1.8" fill="#1b1424"/><circle cx="92" cy="52" r="1.8" fill="#1b1424"/>
      <circle cx="77" cy="57" r="2.4" fill="#ff9eb5" opacity="0.8"/><circle cx="95" cy="57" r="2.4" fill="#ff9eb5" opacity="0.8"/>
      <path d="M82 58 Q86 62 90 58" stroke="#1b1424" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <ellipse cx="86" cy="40" rx="28" ry="5" fill="#3b2352"/>
      <path d="M71 39 L101 39 L92 14 L108 6 L86 8 Z" fill="#3b2352"/>
      <rect x="73" y="33" width="26" height="5" fill="#8fcf6a"/>
      <path d="M86 22 L88 27 L93 27 L89 30 L90 35 L86 32 L82 35 L83 30 L79 27 L84 27 Z" fill="#ffd34d" transform="translate(0 -4) scale(1)"/>
      <path d="M90 72 L100 84 L105 76" stroke="#6b3fa0" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="105" cy="75" r="3.5" fill="#ffd9b8"/>
      <path d="M82 74 L80 86 L86 91" stroke="#6b3fa0" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="87" cy="91" r="3.5" fill="#ffd9b8"/>
    </g>
    <g class="cat">
      <path class="tail" style="transform-origin:136px 138px" d="M136 138 C148 134 150 120 142 112" stroke="#1b1424" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="128" cy="132" rx="11" ry="10" fill="#1b1424"/>
      <circle cx="126" cy="116" r="8" fill="#1b1424"/>
      <path d="M119 112 L120 103 L125 109 Z M133 112 L132 103 L127 109 Z" fill="#1b1424"/>
      <ellipse cx="123" cy="116" rx="1.6" ry="2.2" fill="#c6f25a"/><ellipse cx="129" cy="116" rx="1.6" ry="2.2" fill="#c6f25a"/>
    </g>
  </svg>`,
  };
  const _witchParam = new URLSearchParams(location.search).get("witch");
  const WITCH_SVG = WITCHES[_witchParam] || WITCHES[WITCH_CHOICE];
  window.HW_WITCHES = WITCHES; // used by halloween-preview.html

  // Ghost designs (owner picked from ghost-preview.html, 2026-10-08)
  const GHOSTS = {
    // 1. cute sheet ghost: wavy hem, sparkly eyes, rosy cheeks, blinks
    sheet: `<svg viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 3C14 3 7 16 7 30v26c0 3 2 4 4 2l4-4 5 6c1.5 1.6 3 1.6 4.5 0L30 54l5.5 6c1.5 1.6 3 1.6 4.5 0l5-6 4 4c2 2 4 1 4-2V30C53 16 46 3 30 3Z" fill="#f7f1e8"/>
      <path d="M12 38c4 4 6 10 5 18M48 38c-4 4-6 10-5 18" stroke="#ddd3c4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <g class="blink"><ellipse cx="22.5" cy="27" rx="4" ry="5.2" fill="#1d1426"/><ellipse cx="37.5" cy="27" rx="4" ry="5.2" fill="#1d1426"/></g>
      <circle cx="23.8" cy="25.2" r="1.3" fill="#fff"/><circle cx="38.8" cy="25.2" r="1.3" fill="#fff"/>
      <ellipse cx="17" cy="35" rx="3.5" ry="2" fill="#f4a6b8" opacity=".75"/><ellipse cx="43" cy="35" rx="3.5" ry="2" fill="#f4a6b8" opacity=".75"/>
      <path d="M27 36q3 3 6 0" stroke="#1d1426" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`,
    // 4. bedsheet ghost: trick-or-treater in a sheet with two eye holes
    drape: `<svg viewBox="0 0 64 74" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 3C18 3 11 14 10 27c-1 14-3 26-8 38 4 3 9 3 13 0 3 4 8 5 12 2 3 3 7 3 10 0 4 3 9 2 12-2 4 3 9 3 13 0-5-12-7-24-8-38C53 14 46 3 32 3Z" fill="#f2ede6"/>
      <path d="M16 30c-2 12-4 22-7 33M24 34c-1 10-1 20-1 31M40 34c1 10 1 20 1 31M48 30c2 12 4 22 7 33" stroke="#d6cdbf" stroke-width="1.3" fill="none"/>
      <ellipse cx="25" cy="24" rx="4.2" ry="5" fill="#1d1426"/><ellipse cx="39" cy="24" rx="4.2" ry="5" fill="#1d1426"/>
    </svg>`,
    // 5. trick-or-treat ghost with a jack-o'-lantern candy bucket
    treat: `<svg viewBox="0 0 70 76" xmlns="http://www.w3.org/2000/svg">
      <path d="M33 3C19 3 12 15 12 28v28c0 3 2 4 4 2l4-4 5 6c1.5 1.6 3 1.6 4.5 0L35 54l5.5 6c1.5 1.6 3 1.6 4.5 0l4-5V28C49 15 46 3 33 3Z" fill="#f7f1e8"/>
      <g class="blink"><circle cx="26" cy="25" r="3.6" fill="#1d1426"/><circle cx="39" cy="25" r="3.6" fill="#1d1426"/></g>
      <path d="M27 33q5.5 5 11 0" stroke="#1d1426" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M46 40c6 0 10 2 13 6" stroke="#f7f1e8" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M50 42 L54 34 L58 42" stroke="#5b4636" stroke-width="1.5" fill="none"/>
      <g transform="translate(46 44)"><ellipse cx="9" cy="12" rx="11" ry="10" fill="#f08a24"/><ellipse cx="9" cy="12" rx="5" ry="10" fill="#e2761a"/>
      <path d="M4 10l3-3 2 3zM10 10l3-3 2 3z" fill="#3a1e08"/><path d="M4 15q5 4 10 0l-2 2-2-1-2 1-2-1z" fill="#3a1e08"/></g>
    </svg>`,
  };

  // Black cat walking, side view facing right
  const CAT_SVG = `<div class="face">
  <svg viewBox="0 0 90 58" xmlns="http://www.w3.org/2000/svg"><g fill="#1b1424">
    <path class="ctail" d="M16 30 C6 28 2 16 8 6 C10 3 13 4 12 8 C9 16 12 24 18 26 Z"/>
    <rect class="leg" x="20" y="36" width="6" height="18" rx="3"/>
    <rect class="leg b" x="29" y="36" width="6" height="18" rx="3"/>
    <rect class="leg b" x="50" y="36" width="6" height="18" rx="3"/>
    <rect class="leg" x="59" y="36" width="6" height="18" rx="3"/>
    <ellipse cx="42" cy="32" rx="25" ry="11"/>
    <circle cx="69" cy="22" r="11"/>
    <path d="M60 15 L61 3 L68 12 Z M71 12 L78 3 L79 16 Z"/>
  </g>
    <ellipse class="ceye" cx="74" cy="21" rx="2.8" ry="2.2" fill="#c6ff4a"/>
    <ellipse cx="74.6" cy="21" rx="0.8" ry="2" fill="#1b1424"/>
    <ellipse cx="66.5" cy="21" rx="2.2" ry="2" fill="#c6ff4a" opacity=".85"/>
    <path d="M78 26 L88 24 M78 27.5 L88 28.5" stroke="#8a7a9e" stroke-width="0.8"/>
  </svg></div>`;

  // Witch's cauldron with a glowing green brew over a little fire
  const CAULDRON_SVG = `
  <svg viewBox="0 0 120 112" xmlns="http://www.w3.org/2000/svg">
    <path class="flame" d="M38 112 C30 100 38 94 40 86 C44 96 50 100 44 112 Z" fill="#ff8c2e"/>
    <path class="flame b" d="M56 112 C48 98 58 90 60 80 C64 92 72 98 64 112 Z" fill="#ffb347"/>
    <path class="flame" d="M76 112 C70 102 76 96 80 88 C84 98 90 102 84 112 Z" fill="#ff8c2e"/>
    <path d="M18 98 L10 110 M102 98 L110 110" stroke="#1b1424" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 44 Q12 102 60 104 Q108 102 106 44 Z" fill="#1b1424" stroke="#4a3f57" stroke-width="2"/>
    <path d="M24 60 Q22 90 46 98" stroke="#4a3f57" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse class="brew" cx="60" cy="42" rx="46" ry="9" fill="#7cff6b"/>
    <circle cx="44" cy="40" r="4" fill="#b4ffaa"/><circle cx="70" cy="42" r="3" fill="#b4ffaa"/>
    <rect x="6" y="36" width="108" height="10" rx="5" fill="#2b2233" stroke="#4a3f57" stroke-width="2"/>
  </svg>`;

  // Same mummy as EGDash's Machine Summary (dashboard/js/fall.js), walking instead of peeking
  const MUMMY_SVG = `<div class="face">
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

  // Which creatures show beside the tally cards for each piece-type tab ("All" shows none).
  // Owner's picks 2026-10-08. The spider already drops on the right, so the mummy stays left.
  const TALLY_CREATURES = {
    "Coir OC": "ghost-drape",        // bedsheet ghosts
    "Coir FC": "ghost-sheet",        // cute sheet ghosts
    "Non-Coir Mats": "mummy",
    "Signs": "cats",
    "Display Pieces": "bats",
    "Roll Media": "ghost-treat",     // trick-or-treat ghosts
    "Drinkware": "cauldron",         // witch's brew for the cup station
  };

  // Creatures for whole tabs (the Printing tab uses TALLY_CREATURES while a tally is open)
  const VIEW_CREATURES = {
    "view-orders": "cauldron",
    "view-settings": "bats",
    "view-maintenance": "ghost-mix",
  };

  function ghostsHtml(kind, seed) {
    // a few ghosts at different spots, sizes and speeds, floating up the side space
    return [[10, 17, 0, 58], [50, 21, -7, 44], [28, 19, -13, 50], [66, 15, -4, 40]].map(([x, dur, delay, size], i) =>
      `<div class="hw-ghost" style="left:${x}%;--dur:${dur + seed}s;--delay:${delay - seed * 2}s;--size:${size}px">
         <div class="sway">${GHOSTS[kind === "mix" ? ["sheet", "drape", "treat"][(i + seed) % 3] : kind]}</div>
       </div>`).join("");
  }

  // HTML for one side ("L" or "R") of the tally screen for a creature
  function creatureHtml(creature, side) {
    const seed = side === "L" ? 0 : 1;
    if (creature.startsWith("ghost-")) return ghostsHtml(creature.slice(6), seed);
    if (creature === "mummy") return side === "L" ? `<div class="hw-walker hw-mummy" style="--w:120px">${MUMMY_SVG}</div>` : "";
    if (creature === "cats") return `<div class="hw-walker hw-cat" style="--w:110px;--dur:${side === "L" ? 26 : 31}s;--delay:${-seed * 9}s">${CAT_SVG}</div>`;
    if (creature === "bats") return [[11, 0], [14, -5], [9, -3]].map(([dur, delay], i) =>
      `<div class="hw-gbat" style="--dur:${dur + seed * 2}s;--delay:${delay - seed * 4}s;width:${100 - i * 14}px">${BAT_SVG}</div>`).join("");
    if (creature === "cauldron") return `<div class="hw-cauldron">${CAULDRON_SVG}` +
      [[-34, 12, 4, 0, 8], [-8, 9, 3.4, -1.2, -6], [14, 14, 4.6, -2.4, 12], [-20, 8, 3.8, -3.1, -10], [6, 11, 4.2, -0.6, 4]]
        .map(([x, size, dur, delay, drift]) =>
          `<span class="hw-bubble" style="left:calc(50% + ${x}px);--s:${size}px;--dur:${dur}s;--delay:${delay}s;--drift:${drift}px"></span>`).join("") +
      `</div>`;
    return "";
  }

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

  // ── Dark "Haunted House" colors (css/spooky.css, built by tools/build_spooky_css.py) ──
  // Tabs alternate: Printing purple, Maintenance orange, Colex purple, Stamped orange,
  // Settings purple, Open Orders orange. Waiting opens from Printing, so it's purple too.
  // The theme only applies while body has sp-on, so it goes away with the rest of this file on Nov 1.
  const PURPLE_VIEWS = ["view-printing", "view-waiting", "view-colex", "view-settings"];
  function syncTheme() {
    const active = document.querySelector(".view.active");
    const purple = !active || PURPLE_VIEWS.includes(active.id);
    document.body.classList.add("sp-on");
    document.body.classList.toggle("sp-purple", purple);
    document.body.classList.toggle("sp-orange", !purple);
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncTheme();
    const themeWatch = new MutationObserver(syncTheme);
    document.querySelectorAll(".view").forEach(v => themeWatch.observe(v, { attributes: true, attributeFilter: ["class"] }));

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

    // Tally screens: falling goo drops under the timer bar, creatures beside the cards
    const tbar = document.getElementById("transition-bar");
    if (tbar) {
      const goo = document.createElement("div");
      goo.id = "hw-goo-drops";
      goo.setAttribute("aria-hidden", "true");
      goo.innerHTML = [[14, 0], [37, -1.7], [63, -3.4], [86, -0.9]]
        .map(([x, delay]) => `<span style="left:${x}%;animation-delay:${delay}s"></span>`).join("");
      tbar.appendChild(goo);
    }
    const nav = document.getElementById("nav-bar");
    const spacer = document.createElement("div");
    spacer.id = "hw-bar-spacer";
    spacer.setAttribute("aria-hidden", "true");
    if (nav) nav.insertAdjacentElement("afterend", spacer);
    // Bottom of the header: the Changeover bar where a tab has one, otherwise the stand-in strip
    function headerLine() {
      const tb = document.getElementById("transition-bar");
      const tbShown = !!(tb && tb.offsetParent !== null && tb.offsetHeight > 0);
      if (tbShown) document.documentElement.style.setProperty("--hw-bar-h", tb.offsetHeight + "px");
      spacer.classList.toggle("show", !tbShown);
      const line = tbShown ? tb : spacer.offsetParent !== null ? spacer : nav;
      return Math.max(0, line ? line.getBoundingClientRect().bottom : 0);
    }

    const gutterL = make("hw-gutter-l", "", "hw-gutter");
    const gutterR = make("hw-gutter-r", "", "hw-gutter");
    gutterL.className = gutterR.className = "hw-gutter";   // own positioning, not .hw-deco
    // The content box of the open tab, so the creatures and webs use only the empty space
    // beside it. Full-width wrappers are looked into; anything truly full width means no space.
    function contentBox(view) {
      const vw = view.getBoundingClientRect().width;
      let left = Infinity, right = -Infinity, full = false;
      (function walk(el, depth) {
        for (const c of el.children) {
          if (c.offsetParent === null) continue;
          const r = c.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.width >= vw * 0.9) {
            if (depth < 3 && c.children.length) walk(c, depth + 1); else full = true;
            continue;
          }
          left = Math.min(left, r.left); right = Math.max(right, r.right);
        }
      })(view, 0);
      return full || left === Infinity ? null : { left, right };
    }

    let shownKey = null;
    function placeCreatures(show) {
      const view = document.querySelector(".view.active");
      let box = null, creature = null;
      if (show && view) {
        const tally2 = document.getElementById("print-tally2-screen");
        if (view.id === "view-printing" && tally2 && isShown("print-tally2-screen")) {
          const r = tally2.getBoundingClientRect();
          box = { left: r.left, right: r.right };
          creature = TALLY_CREATURES[typeof _t2Cat === "string" ? _t2Cat : ""] || null;
        } else {
          box = contentBox(view);
          creature = VIEW_CREATURES[view.id] || null;
        }
      }
      if (!box) { gutterL.classList.remove("show"); gutterR.classList.remove("show"); return; }

      const top = headerLine() + 24;
      const widthL = Math.max(0, box.left - 24), widthR = Math.max(0, window.innerWidth - box.right - 24);
      Object.assign(gutterL.style, { top: top + "px", bottom: "0px", left: "8px", width: widthL + "px" });
      Object.assign(gutterR.style, { top: top + "px", bottom: "0px", left: (box.right + 16) + "px", width: widthR + "px" });

      const key = `${view.id}|${creature}`;
      if (key !== shownKey) {
        shownKey = key;
        gutterL.innerHTML = creature ? creatureHtml(creature, "L") : "";
        gutterR.innerHTML = creature ? creatureHtml(creature, "R") : "";
      }
      gutterL.classList.toggle("show", widthL >= 90 && gutterL.innerHTML !== "");
      gutterR.classList.toggle("show", widthR >= 90 && gutterR.innerHTML !== "");
    }

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

      // Spider: on every tab, web hanging from the right end of the header line
      const line = headerLine();
      spiderWrap.style.top = line + "px";
      spiderWrap.classList.toggle("show", !loggedOut && !onMaintTimer);
      const onPrintTally = !loggedOut && printingActive && (isShown("print-tally-screen") || isShown("print-tally2-screen"));
      document.body.classList.toggle("sp-tally", !!onPrintTally);
      placeCreatures(!loggedOut && !onMaintTimer);
      witch.classList.toggle("show", !!onMaintTimer);

      // Bat: first flight shortly after landing on home, then every ~25s
      if (onHome && !onMaintTimer && !bat.classList.contains("fly") && Date.now() - lastBat > 25000) {
        if (lastBat === 0) lastBat = Date.now() - 22000; // first one ~3s in
        else { lastBat = Date.now(); bat.classList.add("fly"); }
      }
      if (!onHome) bat.classList.remove("fly");
    }
    setInterval(tick, 500);
    // Also run right when the tab or the Changeover bar changes (before the browser paints),
    // so the stand-in strip and the spider move with the tab instead of up to half a second later.
    const tabWatch = new MutationObserver(tick);
    document.querySelectorAll(".view").forEach(v => tabWatch.observe(v, { attributes: true, attributeFilter: ["class"] }));
    const tbar2 = document.getElementById("transition-bar");
    if (tbar2) tabWatch.observe(tbar2, { attributes: true, attributeFilter: ["style"] });
    tick();
  });
})();
