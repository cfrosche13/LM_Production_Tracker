  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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

  // Write an end-of-day entry for the currently selected machine.
  // Called from the End Day button in the top bar.
  function handleEndDay() {
    const machine = document.querySelector(".machine-btn.active")?.dataset.machine
                 || window._qsMachine
                 || "";
    if (!machine) {
      alert("Select a machine first, then tap End Day.");
      return;
    }
    const op    = document.getElementById("global-operator")?.value.trim() || "—";
    const entry = { machine, op, event: "end", time: new Date().toISOString() };
    if (window._fb) window._fb.saveShiftEntry(shiftDateStr(), entry);

    // Visual feedback on the button
    const btn = document.getElementById("pt-shift-end");
    if (btn) {
      btn.textContent = "✓ " + machine + " ended";
      btn.style.background  = "#fff5f5";
      btn.style.color       = "#cc3333";
      btn.disabled = true;
      // Re-enable after 3s so they can end another machine
      setTimeout(() => {
        if (btn) {
          btn.textContent = "⏹ End Day";
          btn.style.background  = "#fff";
          btn.style.color       = "#cc3333";
          btn.disabled = false;
        }
      }, 3000);
    }
  }

  function addSignOutButton() {
    if (document.getElementById("pt-signout-btn")) return;
    const topBar = document.getElementById("top-bar");
    if (!topBar) return;

    // ── End Day button ──
    const shiftGroup = document.createElement("div");
    shiftGroup.style.cssText = "margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0;";

    const endBtn = document.createElement("button");
    endBtn.id = "pt-shift-end";
    endBtn.textContent = "⏹ End Day";
    endBtn.title = "End the day for the currently selected machine";
    endBtn.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;
      padding:5px 13px;font-size:12px;font-family:'Libre Franklin',sans-serif;font-weight:600;
      background:#fff;color:#cc3333;border:1.5px solid #f0b8b8;border-radius:6px;cursor:pointer;
    `;
    endBtn.onclick = handleEndDay;
    shiftGroup.appendChild(endBtn);

    // ── Lock button ──
    const lockBtn = document.createElement("button");
    lockBtn.id = "pt-signout-btn";
    lockBtn.textContent = "Lock";
    lockBtn.title = "Lock PrintTrack";
    lockBtn.style.cssText = `
      padding:5px 13px;font-size:12px;font-family:'Libre Franklin',sans-serif;
      background:#fff;border:1.5px solid #c2e8b8;border-radius:6px;cursor:pointer;color:#1a2a18;
    `;
    lockBtn.onclick = () => signOut(auth);

    topBar.appendChild(shiftGroup);
    topBar.appendChild(lockBtn);
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

        saveTargets:   (targets) => set(ref(db, "targets"), targets),
        listenTargets: (cb)      => onValue(ref(db, "targets"), snap => cb(snap.val() || {})),

        saveOrders:    (data) => set(ref(db, "openOrders"), data),
        listenOrders:  (cb)   => onValue(ref(db, "openOrders"), snap => cb(snap.val() || null)),

        saveChecklistProgress:  (key, data) => set(ref(db, `checklistProgress/${key}`), data),
        clearChecklistProgress: (key)       => set(ref(db, `checklistProgress/${key}`), null),
        listenChecklistProgress:(cb)        => onValue(ref(db, "checklistProgress"), snap => cb(snap.val() || {})),

        // Live timer state — written on run start/pause/resume/stop so manager can watch
        saveLiveState:  (machine, state) => set(ref(db, `liveState/${machine}`), state),
        clearLiveState: (machine)        => set(ref(db, `liveState/${machine}`), null),

        // Operator shift log — start/end of day per operator
        saveShiftEntry: (dateStr, entry) => push(ref(db, `shiftLog/${dateStr}`), entry),
        listenShiftLog: (cb) => onValue(ref(db, "shiftLog"), snap => cb(snap.val() || {})),
      };
      window._fbReady = true;
      document.dispatchEvent(new Event("fbReady"));
    } else {
      showLoginScreen();
    }
  });
