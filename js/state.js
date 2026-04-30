let jobs = [
  {id:"PJ-001",client:"Apex Studio",    title:"Holiday Mat",      type:"Large Format",pieceCategory:"Coir",         pieceType:"24x36",    operator:"Jamie",status:"Printing", due:"2026-03-06",qty:3,  notes:"Grommets on all corners"},
  {id:"PJ-002",client:"Moonveil Co.",   title:"Promo Wallet Run", type:"Digital",     pieceCategory:"Wallets",      pieceType:"Wallet",   operator:"Sam",  status:"QC",       due:"2026-03-05",qty:500,notes:"Soft touch laminate"},
  {id:"PJ-003",client:"Driftwood Café", title:"Entrance Sign",    type:"Digital",     pieceCategory:"Signs",        pieceType:"16x24",    operator:"Jamie",status:"Prepress", due:"2026-03-10",qty:20, notes:"Check brand colors"},
  {id:"PJ-004",client:"Nova Events",    title:"Welcome Mat",      type:"Large Format",pieceCategory:"Non-Coir Mats",pieceType:"AF Large", operator:"Alex", status:"Ready",    due:"2026-03-04",qty:1,  notes:"Rush order"},
  {id:"PJ-005",client:"Tidal Brand",    title:"Yard Sign Set",    type:"Large Format",pieceCategory:"Signs",        pieceType:"Yard Sign",operator:"Sam",  status:"Queued",   due:"2026-03-12",qty:12, notes:"Perforated vinyl"},
];
let nextId = 6;
let editingJobId = null;

// Maintenance
let maintLog  = [];
let mechFixCount = 0;
let mechFixSec = 0, mechFixRunning = false, mechFixInterval = null;
let mechFixStartWall = 0;
let mechPendingChoice = null;

// Cleaning timer
let cleanSec = 0, cleanRunning = false, cleanInterval = null;
let cleanStartWall = 0;

// Defective tally
let tallyCount = 0;

// Waiting
let waitSec = 0, waitRunning = false, waitInterval = null;
let waitStartWall = 0;
let waitLog = [];

// Print run
let printMode = null;
let runSec = 0, runRunning = false, runPaused = false, runInterval = null;
let runStartWall = 0, runPausedMs = 0, runPauseStartWall = 0;
let runEntries = [];
let runChangeoverCount = 0;

// Machine production reports: { machineName: [ {mode, totalSec, changeovers, qty, time} ] }
const MACHINES = ["30","30+","H5","Colex","Wallets","Drinkware M1","Drinkware M2"];
let machineReports = {};
let machineEvents  = {}; // per-machine maintenance & waiting events
let reportEditMode = new Set(); // machines currently in edit mode


let _cleanChecks = {}; // { taskLabel: true/false }

let _maintLogFilter = 'all';

let _qsMachine = null;
let _qsMode    = null;

let _qsFunction = null; // 'stopgo' | 'continuous'

let inChangeover = false;

let _runDetailsPanelReady = false;

let pendingRunData = null;

let _cdmMachine = null;

let _openOrdersData = null; // { byType: {}, aging: {}, total: 0, fetchedAt: Date }

let stSec = 0, stRunning = false, stPaused = false, stInterval = null;
let stStartWall = 0;
let stTally = 0, stMisprint = 0;

window._targets = {}; // { "Coir · 28x16": { pph: 120, ppt: 30 }, ... }
