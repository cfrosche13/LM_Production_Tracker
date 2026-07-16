  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getDatabase, ref, set, onValue, push, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDUlCZgxYV-vfFhWop1jX_8VVvjJYAA2-M",
    authDomain: "eg-studio-production-tracker.firebaseapp.com",
    databaseURL: "https://eg-studio-production-tracker-default-rtdb.firebaseio.com",
    projectId: "eg-studio-production-tracker",
    storageBucket: "eg-studio-production-tracker.firebasestorage.app",
    messagingSenderId: "284937225937",
    appId: "1:284937225937:web:2dcb59fe049e90d76967f0"
  };

  const app  = initializeApp(firebaseConfig);
  const db   = getDatabase(app);
  const auth = getAuth(app);

  // ── Offline / connectivity banner ──
  let _fbBannerTimer = null;

  function _fbShowBanner() {
    let b = document.getElementById("fb-offline-banner");
    if (!b) {
      b = document.createElement("div");
      b.id = "fb-offline-banner";
      b.style.cssText = [
        "position:fixed;top:0;left:0;right:0;z-index:99999;",
        "background:#cc3333;color:#fff;text-align:center;",
        "font-family:'Libre Franklin',sans-serif;font-size:13px;font-weight:600;",
        "padding:10px 16px;letter-spacing:0.01em;",
        "box-shadow:0 2px 8px rgba(0,0,0,0.3);",
      ].join("");
      b.textContent = "⚠️  No internet connection — tally counts are saved to this device and will sync when reconnected";
      document.body.appendChild(b);
    }
    b.style.display = "block";
  }

  onValue(ref(db, ".info/connected"), snap => {
    const online = snap.val() === true;
    window._fbOnline = online;
    if (online) {
      clearTimeout(_fbBannerTimer);
      _fbBannerTimer = null;
      const b = document.getElementById("fb-offline-banner");
      if (b) b.style.display = "none";
      document.dispatchEvent(new Event("fbReconnected"));
    } else {
      // Wait 4 s before showing banner — avoids a flash on initial page load
      clearTimeout(_fbBannerTimer);
      _fbBannerTimer = setTimeout(_fbShowBanner, 4000);
    }
  });

  // ── Shared passcode config ──
  // The team logs in with just a passcode. Under the hood we map it to
  // a single Firebase account: team@printtrack.internal
  // Create that account once in Firebase Console → Authentication → Add user
  const TEAM_EMAIL    = "team@printtrack.internal";
  const SESSION_KEY   = "pt_unlocked";

  // ── Login screen ──
  function showLoginScreen() {
    let loginDiv = document.getElementById("pt-login-screen");
    if (!loginDiv) {
      loginDiv = document.createElement("div");
      loginDiv.id = "pt-login-screen";
      loginDiv.style.cssText = `
        position:fixed;inset:0;background:#f5fcf3;display:flex;
        flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;gap:14px;font-family:'Libre Franklin',sans-serif;
      `;
      loginDiv.innerHTML = `
        <div style="font-family:'Abril Fatface',serif;font-size:32px;color:#1a2a18;margin-bottom:4px;">PrintTrack</div>
        <div style="font-size:13px;color:#5a7a52;margin-bottom:6px;">Enter studio passcode to continue</div>
        <input id="pt-passcode" type="password" placeholder="Passcode"
          style="padding:11px 16px;border:1.5px solid #c2e8b8;border-radius:8px;font-size:15px;
                 outline:none;width:240px;text-align:center;letter-spacing:0.15em;"
          autocomplete="current-password" />
        <button id="pt-login-btn"
          style="padding:11px 0;width:240px;background:#3a8c32;color:#fff;border:none;
                 border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.03em;">
          Unlock
        </button>
        <div id="pt-login-error" style="color:#cc3333;font-size:12px;min-height:16px;"></div>
      `;
      document.body.appendChild(loginDiv);

      // Allow Enter key to submit
      document.getElementById("pt-passcode").addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("pt-login-btn").click();
      });

      document.getElementById("pt-login-btn").addEventListener("click", () => {
        const passcode = document.getElementById("pt-passcode").value;
        document.getElementById("pt-login-error").textContent = "";
        document.getElementById("pt-login-btn").textContent = "Unlocking…";
        signInWithEmailAndPassword(auth, TEAM_EMAIL, passcode)
          .catch(() => {
            document.getElementById("pt-login-error").textContent = "Incorrect passcode. Try again.";
            document.getElementById("pt-login-btn").textContent = "Unlock";
            document.getElementById("pt-passcode").value = "";
            document.getElementById("pt-passcode").focus();
          });
      });
    }
    loginDiv.style.display = "flex";
  }

  function hideLoginScreen() {
    const loginDiv = document.getElementById("pt-login-screen");
    if (loginDiv) loginDiv.style.display = "none";
  }

  // ── Shift log helpers ──
  function shiftDateStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function handleOperatorLogout() {
    if (typeof window.tallyOperatorLogout === 'function') {
      window.tallyOperatorLogout();
    }
    const btn = document.getElementById("pt-shift-end");
    if (btn) {
      btn.textContent = "✓ Logged out";
      btn.disabled = true;
      setTimeout(() => {
        if (btn) { btn.textContent = "→ Operator Log Out"; btn.disabled = false; }
      }, 2000);
    }
  }

  function addSignOutButton() {
    if (document.getElementById("pt-shift-end")) return;
    const topBar = document.getElementById("top-bar");
    if (!topBar) return;

    const shiftGroup = document.createElement("div");
    shiftGroup.style.cssText = "margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0;";

    const endBtn = document.createElement("button");
    endBtn.id = "pt-shift-end";
    endBtn.textContent = "→ Operator Log Out";
    endBtn.title = "Log out current operator and reset tally counter";
    endBtn.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;
      padding:5px 13px;font-size:12px;font-family:'Libre Franklin',sans-serif;font-weight:600;
      background:#fff;color:#2e8b57;border:1.5px solid #b8d8c0;border-radius:6px;cursor:pointer;
    `;
    endBtn.onclick = handleOperatorLogout;
    shiftGroup.appendChild(endBtn);

    topBar.appendChild(shiftGroup);
  }

  // ── Auth state ──
  onAuthStateChanged(auth, user => {
    if (user) {
      hideLoginScreen();
      // Add lock button once DOM is ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addSignOutButton);
      } else {
        addSignOutButton();
      }
      // Wire up all Firebase helpers
      window._fb = {
        saveSession:    (machine, session) => push(ref(db, `sessions/${machine}`), session),
        saveMaintEntry: (entry)            => push(ref(db, "maintLog"), entry),
        saveWaitEntry:  (entry)            => push(ref(db, "waitLog"), entry),
        saveMachineEvent:(machine, event)  => push(ref(db, `machineEvents/${machine}`), event),

        listenSessions: (cb) => onValue(ref(db, "sessions"),      snap => cb(snap.val() || {})),
        listenMaint:    (cb) => onValue(ref(db, "maintLog"),      snap => cb(snap.val() || {})),
        listenWait:     (cb) => onValue(ref(db, "waitLog"),       snap => cb(snap.val() || {})),
        listenEvents:   (cb) => onValue(ref(db, "machineEvents"), snap => cb(snap.val() || {})),

        deleteSession:     (machine, key) => set(ref(db, `sessions/${machine}/${key}`), null),
        deleteAllSessions: (machine)      => set(ref(db, `sessions/${machine}`), null),

        // Tally-derived sessions — use set() with a deterministic key so each
        // piece type overwrites in-place rather than accumulating duplicates
        setTallySession:    (machine, key, session) => set(ref(db, `sessions/${machine}/${key}`), session),
        deleteTallySession: (machine, key)          => set(ref(db, `sessions/${machine}/${key}`), null),

        saveTargets:   (targets) => set(ref(db, "targets"), targets),
        listenTargets: (cb)      => onValue(ref(db, "targets"), snap => cb(snap.val() || {})),

        saveOrders:    (data) => set(ref(db, "openOrders"), data),
        listenOrders:  (cb)   => onValue(ref(db, "openOrders"), snap => cb(snap.val() || null)),

        saveMachineProfiles:   (list) => set(ref(db, "machineProfiles"), list),
        listenMachineProfiles: (cb, onError) => onValue(
          ref(db, "machineProfiles"),
          snap => cb(snap.val() || null),
          err  => { console.error("listenMachineProfiles denied/failed:", err); if (onError) onError(err); }
        ),

        saveChecklistProgress:  (key, data) => set(ref(db, `checklistProgress/${key}`), data),
        clearChecklistProgress: (key)       => set(ref(db, `checklistProgress/${key}`), null),
        listenChecklistProgress:(cb)        => onValue(ref(db, "checklistProgress"), snap => cb(snap.val() || {})),

        // Live timer state — written on run start/pause/resume/stop so manager can watch
        saveLiveState:  (machine, state) => set(ref(db, `liveState/${machine}`), state),
        clearLiveState: (machine)        => set(ref(db, `liveState/${machine}`), null),

        // Operator shift log — start/end of day per operator
        saveShiftEntry: (dateStr, entry) => push(ref(db, `shiftLog/${dateStr}`), entry),
        listenShiftLog: (cb) => onValue(ref(db, "shiftLog"), snap => cb(snap.val() || {})),

        // Tally auto-save snapshot — keyed by date, holds in-progress counts
        saveTallyState:  (dateStr, data) => set(ref(db, `tallyState/${dateStr}`), data),
        // One-time fetch of today's tally snapshot (used on startup to restore counts)
        fetchTallyState: (dateStr)       => get(ref(db, `tallyState/${dateStr}`)).then(snap => snap.val()),

        // Tally 2.0 snapshot — keyed by machine + date so multiple computers never collide
        setTally2State:   (machine, dateStr, data) => set(ref(db, `tally2State/${machine}/${dateStr}`), data),
        fetchTally2State: (machine, dateStr)       => get(ref(db, `tally2State/${machine}/${dateStr}`)).then(snap => snap.val()),

        // Individual tally tick events — written on every increment/adjustment for manager charting
        pushTallyEvent: (machine, dateStr, event) =>
          push(ref(db, `tallyEvents/${machine}/${dateStr}`), event),

        // ── Inventory ──
        saveInkLot:           (lot)                             => push(ref(db, "inventory/inkLots"), lot),
        setInkLot:            (key, lot)                        => set(ref(db, `inventory/inkLots/${key}`), lot),
        updateInkLot:         (key, data)                       => set(ref(db, `inventory/inkLots/${key}`), data),
        listenInkLots:        (cb)                              => onValue(ref(db, "inventory/inkLots"),       snap => cb(snap.val() || {})),
        fetchInkLots:         ()                                => get(ref(db, "inventory/inkLots")).then(s => s.val() || {}),
        saveMaintStock:       (machine, productId, data)        => set(ref(db, `inventory/maintStock/${machine}/${productId}`), data),
        listenMaintStock:     (cb)                              => onValue(ref(db, "inventory/maintStock"),    snap => cb(snap.val() || {})),
        fetchMaintStock:      ()                                => get(ref(db, "inventory/maintStock")).then(s => s.val() || {}),
        savePartsStock:       (machine, productId, data)        => set(ref(db, `inventory/partsStock/${machine}/${productId}`), data),
        listenPartsStock:     (cb)                              => onValue(ref(db, "inventory/partsStock"),    snap => cb(snap.val() || {})),
        fetchPartsStock:      ()                                => get(ref(db, "inventory/partsStock")).then(s => s.val() || {}),
        saveInvTransaction:   (tx)                              => push(ref(db, "inventory/transactions"), tx),
        listenInvTransactions:(cb)                              => onValue(ref(db, "inventory/transactions"),  snap => cb(snap.val() || {})),
        saveInvProduct:       (category, machine, productId, data) => set(ref(db, `inventory/catalog/${machine}/${category}/${productId}`), data),
        listenInvCatalog:     (cb)                              => onValue(ref(db, "inventory/catalog"),       snap => cb(snap.val() || {})),
        deleteInvProduct:     (category, machine, productId)     => set(ref(db, `inventory/deletedProducts/${machine}/${category}/${productId}`), true),
        listenDeletedProducts:(cb)                              => onValue(ref(db, "inventory/deletedProducts"), snap => cb(snap.val() || {})),
        fetchDeletedProducts: ()                                => get(ref(db, "inventory/deletedProducts")).then(s => s.val() || {}),

      };
      window._fbReady = true;
      document.dispatchEvent(new Event("fbReady"));
    } else {
      showLoginScreen();
    }
  });
