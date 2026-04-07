// ═══════════════════════════════════════
// LOCAL STORAGE PERSISTENCE (backup/offline)
// ═══════════════════════════════════════
function localSaveSession(machine, session) {
  try {
    const key = 'pt_sessions';
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (!all[machine]) all[machine] = [];
    all[machine].push(session);
    localStorage.setItem(key, JSON.stringify(all));
  } catch(e) {}
}

function localSaveMachineEvent(machine, event) {
  try {
    const key = 'pt_events';
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (!all[machine]) all[machine] = [];
    all[machine].unshift(event);
    localStorage.setItem(key, JSON.stringify(all));
  } catch(e) {}
}

function localLoadData() {
  try {
    // Load sessions
    const sessions = JSON.parse(localStorage.getItem('pt_sessions') || '{}');
    Object.entries(sessions).forEach(([machine, list]) => {
      if (!machineReports[machine]) {
        machineReports[machine] = list.map(s => ({
          ...s, time: s.time ? new Date(s.time) : new Date()
        }));
      }
    });
    // Load events
    const events = JSON.parse(localStorage.getItem('pt_events') || '{}');
    Object.entries(events).forEach(([machine, list]) => {
      if (!machineEvents[machine]) {
        machineEvents[machine] = list.map(e => ({
          ...e, time: e.time ? new Date(e.time) : new Date()
        }));
      }
    });
    if (Object.keys(machineReports).length > 0 || Object.keys(machineEvents).length > 0) {
      renderReports();
    }
  } catch(e) {}
}
