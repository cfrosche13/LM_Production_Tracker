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
    animation: hw-drop 9s ease-in-out infinite; }
  #hw-spider { position: absolute; left: -23px; bottom: -40px; width: 48px; }
  #hw-spider .legs { animation: hw-wiggle 0.5s ease-in-out infinite alternate; transform-origin: 16px 14px; }
  @keyframes hw-drop {
    0%, 8%   { height: 0; }
    30%      { height: 260px; }
    36%      { height: 235px; }
    42%, 70% { height: 255px; }
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

  /* Tally screens: creatures in the empty space left and right of the cards */
  .hw-gutter { position: fixed; overflow: hidden; pointer-events: none; z-index: 150; display: none; }
  .hw-gutter.show { display: block; }
  .hw-ghost { position: absolute; bottom: -70px; width: 46px; opacity: 0;
    animation: hw-ghost-rise var(--dur, 16s) linear infinite; animation-delay: var(--delay, 0s); }
  .hw-ghost .sway { animation: hw-ghost-sway 3.2s ease-in-out infinite; }
  .hw-ghost svg { display: block; width: 100%; filter: drop-shadow(0 0 6px rgba(255,246,234,0.6)); }
  .hw-ghost .boo { position: absolute; left: 34px; top: -14px; font-family: 'Jolly Lodger', cursive;
    font-size: 22px; color: #fff6ea; text-shadow: 0 0 6px rgba(255,246,234,0.7); white-space: nowrap; }
  @keyframes hw-ghost-rise {
    0%   { transform: translateY(0); opacity: 0; }
    10%  { opacity: 0.9; }
    85%  { opacity: 0.9; }
    100% { transform: translateY(-115vh); opacity: 0; }
  }
  @keyframes hw-ghost-sway { 0%,100% { transform: translateX(-12px) rotate(-6deg); } 50% { transform: translateX(12px) rotate(6deg); } }
  #hw-mummy { position: absolute; bottom: 14px; left: 0; width: 120px; animation: hw-walk 22s linear infinite; }
  #hw-mummy .face { animation: hw-turn 22s steps(1) infinite; }
  #hw-mummy svg { display: block; width: 100%; overflow: visible; filter: drop-shadow(0 0 4px rgba(255,246,234,0.45)); }
  #hw-mummy .whole { animation: hw-shuffle 0.9s ease-in-out infinite; transform-origin: 40px 58px; }
  #hw-mummy .tail { animation: hw-bandage 1.4s ease-in-out infinite alternate; transform-origin: 34px 21px; }
  #hw-mummy .eye { filter: drop-shadow(0 0 2px #ffcf4a) drop-shadow(0 0 4px #ff8c2e); }
  @keyframes hw-walk { 0% { left: 0; } 50% { left: calc(100% - 120px); } 100% { left: 0; } }
  @keyframes hw-turn { 0% { transform: scaleX(1); } 50% { transform: scaleX(-1); } }
  @keyframes hw-shuffle { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
  @keyframes hw-bandage { from { transform: rotate(-6deg); } to { transform: rotate(8deg); } }

  @media (prefers-reduced-motion: reduce) {
    #hw-goo-drops span, .hw-ghost, .hw-ghost .sway, #hw-mummy, #hw-mummy .whole, #hw-mummy .tail { animation: none; }
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

  const GHOST_SVG = `
  <svg viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 1C6 1 2 6 2 13v15l4-3 3.5 3 3.5-3 3.5 3 3.5-3 4 3V13C24 6 20 1 13 1Z" fill="#fff6ea"/>
    <ellipse cx="9.5" cy="12" rx="2" ry="2.6" fill="#2b1e17"/><ellipse cx="16.5" cy="12" rx="2" ry="2.6" fill="#2b1e17"/>
    <ellipse cx="13" cy="19" rx="2.6" ry="3.2" fill="#2b1e17"/>
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

  // Which creatures show beside the tally cards for each piece-type tab ("" = All).
  // Mummy stays on the left; the spider already drops on the right.
  const TALLY_CREATURES = {
    "Coir OC": "ghosts",
    "Coir FC": "mummy",
  };

  function ghostsHtml(seed) {
    // a few ghosts at different spots / speeds; one or two say "boo!"
    return [[12, 17, 0], [52, 21, -7], [30, 19, -13], [70, 15, -4]].map(([x, dur, delay], i) =>
      `<div class="hw-ghost" style="left:${x}%;--dur:${dur + seed}s;--delay:${delay - seed * 2}s">
         <div class="sway">${GHOST_SVG}${(i + seed) % 2 === 0 ? '<span class="boo">boo!</span>' : ""}</div>
       </div>`).join("");
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
    const gutterL = make("hw-gutter-l", "", "hw-gutter");
    const gutterR = make("hw-gutter-r", "", "hw-gutter");
    gutterL.className = gutterR.className = "hw-gutter";   // own positioning, not .hw-deco
    let shownCreature = null;
    function placeCreatures(show) {
      const screen = document.getElementById("print-tally2-screen");
      const cat = typeof _t2Cat === "string" ? _t2Cat : "";
      const creature = show && screen && isShown("print-tally2-screen") ? (TALLY_CREATURES[cat] || null) : null;
      if (!creature) {
        gutterL.classList.remove("show"); gutterR.classList.remove("show");
        return;
      }
      const r = screen.getBoundingClientRect();
      const tb = document.getElementById("transition-bar");
      const top = Math.max(0, (tb && tb.offsetParent ? tb.getBoundingClientRect().bottom : 0) + 24);
      const widthL = Math.max(0, r.left - 24), widthR = Math.max(0, window.innerWidth - r.right - 24);
      Object.assign(gutterL.style, { top: top + "px", bottom: "0px", left: "8px", width: widthL + "px" });
      Object.assign(gutterR.style, { top: top + "px", bottom: "0px", left: (r.right + 16) + "px", width: widthR + "px" });
      if (creature !== shownCreature) {
        shownCreature = creature;
        gutterL.innerHTML = creature === "ghosts" ? ghostsHtml(0) : `<div id="hw-mummy">${MUMMY_SVG}</div>`;
        gutterR.innerHTML = creature === "ghosts" ? ghostsHtml(1) : "";
      }
      gutterL.classList.toggle("show", widthL >= 90);
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

      // Spider sits just under the top bar on the left
      if (onTally) {
        const tb = document.getElementById("top-bar");
        spiderWrap.style.top = (tb ? Math.max(0, tb.getBoundingClientRect().bottom) : 0) + "px";
      }
      spiderWrap.classList.toggle("show", !!onTally);
      const onPrintTally = !loggedOut && printingActive && (isShown("print-tally-screen") || isShown("print-tally2-screen"));
      document.body.classList.toggle("sp-tally", !!onPrintTally);
      placeCreatures(!!onPrintTally && !onMaintTimer);
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
