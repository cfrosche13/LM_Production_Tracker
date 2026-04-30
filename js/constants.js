const STATUSES = ["Queued","Prepress","Printing","Finishing","QC","Ready","Delivered"];
const STATUS_COLORS = {
  Queued:    {bg:"#f5f0ff",accent:"#ccbbee",text:"#7755aa"},
  Prepress:  {bg:"#f0fff4",accent:"#99ddaa",text:"#228844"},
  Printing:  {bg:"#fff5f8",accent:"#ffaac8",text:"#e8457a"},
  Finishing: {bg:"#fff8f0",accent:"#ffccaa",text:"#cc7722"},
  QC:        {bg:"#fffff0",accent:"#eeee88",text:"#888800"},
  Ready:     {bg:"#f0faff",accent:"#99ccee",text:"#2266aa"},
  Delivered: {bg:"#f0fff8",accent:"#88ddbb",text:"#226644"},
};
const PIECE_TYPES = {
  "Coir":          ["28x16 OC","28x16 FC","30x18 OC","30x18 FC","36x24 OC","36x24 FC","60x24 OC","60x24 FC","Flocked"],
  "Non-Coir Mats": ["AF Large","AF Small","PVC","Drying Mat"],
  "Signs":         ["16x24","12x12","12x8 Plock","11x6 Plock","6x6 Plock","Leaner","Double Sided Leaner","Mantle Sign","18\" Circle","Yard Sign"],
  "Wallets":       ["Cross Body","Trifold Black","Trifold Brown","Bifold Black","Bifold Brown","Bifold Tumbled Leather","Wristlet Black","Wristlet Brown","Front Pocket Black","Front Pocket Brown","Toiletry Bag","Clock"],
  "Display Pieces": ["Vert. Yard Display","Horz. Yard Display","Leaner Display","Yard Sign Display"],
  "Roll Media":     ["Small Canvas","Large Canvas"],
  "Drinkware":      ["Pint Glass"],
};
// ═══════════════════════════════════════
// CLEANING CHECKLISTS
// ═══════════════════════════════════════
const CLEANING_CHECKLISTS = {
  "30": {
    "Start of Shift": [
      "Purge and wipe print heads",
      "Check ink supply levels",
      "Check ink waste levels",
      "Clean cyclonic vacuum",
      "Perform nozzle check",
      "Perform daily print file"
    ],
    "Mid Shift": [
      "Purge and wipe heads",
      "Check ink supply levels",
      "Check ink waste level",
      "Clean purge tray and vacuum knife",
      "Clean print heads and platen",
      "Clean cure lamps",
      "Clean cyclonic vacuum",
      "Check lamp filters and change if needed"
    ],
    "End of Shift": [
      "Purge and wipe heads",
      "Check ink supply levels",
      "Check ink waste level",
      "Clean purge tray and vacuum knife",
      "Clean print heads and platen",
      "Clean cure lamps",
      "Clean cyclonic vacuum",
      "Check lamp filters and change if needed"
    ],
    "Monthly": [
      "Clean and lubricate gantry lead screws",
      "Inspect cyclonic vacuum system"
    ],
    "Quarterly": [
      "Dust and wipe down machine from top to bottom",
      "Clean ink overspray",
      "Vacuum umbilical cord",
      "Thoroughly clean lamp fixtures"
    ],
    "Semi-Annual": [
      "Replace ink filters",
      "Replace negative pressure system filters",
      "Clean umbilical cord and tray"
    ],
    "40 Hour": [
      "Clean and calibrate carriage rails",
      "Clean linear encoder strip",
      "Clean carriage height solenoid",
      "Replace cure lamp filters",
      "Clean anti-static bars",
      "Clean table"
    ]
  },
  "30+": {
    "Start of Shift": [
      "Purge and wipe print heads",
      "Check ink supply levels",
      "Check ink waste levels",
      "Clean cyclonic vacuum",
      "Perform nozzle check",
      "Perform daily print file"
    ],
    "Mid Shift": [
      "Purge and wipe heads",
      "Check ink supply levels",
      "Check ink waste level",
      "Clean purge tray and vacuum knife",
      "Clean print heads and platen",
      "Clean cure lamps",
      "Clean cyclonic vacuum",
      "Check lamp filters and change if needed"
    ],
    "End of Shift": [
      "Purge and wipe heads",
      "Check ink supply levels",
      "Check ink waste level",
      "Clean purge tray and vacuum knife",
      "Clean print heads and platen",
      "Clean cure lamps",
      "Clean cyclonic vacuum",
      "Check lamp filters and change if needed"
    ],
    "Monthly": [
      "Clean and lubricate gantry lead screws",
      "Inspect cyclonic vacuum system"
    ],
    "Quarterly": [
      "Dust and wipe down machine from top to bottom",
      "Clean ink overspray",
      "Vacuum umbilical cord",
      "Thoroughly clean lamp fixtures"
    ],
    "Semi-Annual": [
      "Replace ink filters",
      "Replace negative pressure system filters",
      "Clean umbilical cord and tray"
    ],
    "40 Hour": [
      "Clean and calibrate carriage rails",
      "Clean linear encoder strip",
      "Clean carriage height solenoid",
      "Replace cure lamp filters",
      "Clean anti-static bars",
      "Clean table"
    ]
  },
  "H5": {
    "Start of Shift": [
      "Purge and wipe nozzles",
      "Run and date nozzle check",
      "Check ink levels",
      "Check air compressor and air filter system",
      "Check humidity",
      "Clean on and around print heads and platen"
    ],
    "Mid Shift": [
      "Clean on and around print heads and platen",
      "Wipe top and bottom of carriage rails",
      "Clean waste tray",
      "Check ink levels",
      "Clean/empty waste tank",
      "Clean LED lamp and nitrogen applicators",
      "Check and replace LED lamp filters as needed",
      "Clean UV light deflectors and datum bar",
      "Clean media roller"
    ],
    "End of Shift": [
      "Clean on and around print heads and platen",
      "Wipe top and bottom of carriage rails",
      "Clean waste tray",
      "Check ink levels",
      "Clean/empty waste tank",
      "Clean LED lamp and nitrogen applicators",
      "Check and replace LED lamp filters as needed",
      "Clean UV light deflectors and datum bar",
      "Clean media roller"
    ],
    "Monthly": [
      "Clean cable carrier assemblies and shelf",
      "Replace carriage cover air filters",
      "Inspect/clean two exhaust fans/ports",
      "Replace power supply air filters",
      "Replace electronics compartment air inlet filter",
      "Clean static eliminator probes",
      "Clean carriage safety stop assembly",
      "Grease carriage lift",
      "Grease carriage rail bearings"
    ],
    "Quarterly": [
      "Clean printer compartments and components",
      "Check print head maintenance fluid"
    ],
    "Semi-Annual": [
      "Replace all primary ink filters",
      "Replace Simriz filters on bleeder hoses",
      "Grease carriage lift bearings",
      "Replace nitrogen system filters"
    ],
    "40 Hour": [
      "Check and replace LED lamp filters",
      "Clean UV light deflectors and datum bar",
      "Clean media edge detector",
      "Clean linear encoder strip",
      "Clean media rollers",
      "Clean the FOD trays",
      "Calibrate the media roller",
      "Calibrate media measure sensor (MMS)",
      "Confirm carriage collision detector height",
      "Clean Meech bar"
    ]
  }
};

const COLEX_YARD_SIGN_YIELD = 10; // pieces per sheet

const COLEX_MERCHANDISERS = [
  { id: "vym", label: "Vertical YS Merchandiser",   yield: 1 },
  { id: "hym", label: "Horizontal YS Merchandiser", yield: 1 },
  { id: "plm", label: "Porch Leaner Merchandiser",  yield: 6 },
  { id: "gym", label: "Generic YS Merchandiser",    yield: 3 },
];
const COLEX_MERCH_TIME_DEFAULTS = { vym: 1800, hym: 1800, plm: 1800, gym: 1800 }; // seconds per sheet

const OEE_MACHINE_MAP = { "30": "30F", "30+": "30F+", "H5": "H5", "Colex": "Colex", "Wallets": "Wallets", "Drinkware M1": "Drinkware M1", "Drinkware M2": "Drinkware M2" };
const OEE_IDEAL_CYCLE_DEFAULTS = { "30": 94, "30+": 42.5, "H5": 32.5, "Colex": 0, "Wallets": 0, "Drinkware M1": 75, "Drinkware M2": 75 }; // seconds per unit

// TABLE CAPACITY DEFAULTS (pieces per table/changeover)
// These are overridden by Firebase targets if set
// ═══════════════════════════════════════
const TABLE_CAPACITY_DEFAULTS = {
  "Coir · 28x16 OC": 16,
  "Coir · 28x16 FC": 16,
  "Coir · 30x18 OC": 12,
  "Coir · 30x18 FC": 12,
  "Coir · 36x24 OC": 9,
  "Coir · 36x24 FC": 9,
  "Coir · 60x24 OC": 6,
  "Coir · 60x24 FC": 6,
  "Coir · Flocked": 20,
  "Non-Coir Mats · AF Large": 5,
  "Non-Coir Mats · AF Small": 6,
  "Non-Coir Mats · PVC": 8,
  "Non-Coir Mats · Drying Mat": 8,
  "Signs · 16x24": 3,
  "Signs · 12x12": 6,
  "Signs · 12x8 Plock": 27,
  "Signs · 11x6 Plock": 12,
  "Signs · 6x6 Plock": 48,
  "Signs · Leaner": 2,
  "Signs · Double Sided Leaner": 1,
  "Signs · Mantle Sign": 24,
  "Signs · 18\" Circle": 8,
  "Signs · Yard Sign": 10,
  "Display Pieces · Vert. Yard Display": 1,
  "Display Pieces · Horz. Yard Display": 1,
  "Display Pieces · Leaner Display": 1,
  "Display Pieces · Yard Sign Display": 1,
  "Roll Media · Small Canvas": 2,
  "Roll Media · Large Canvas": 1,
  "Drinkware · Pint Glass": 1,
};

const MACHINE_COLORS = {
  "30":       "#e8374a",
  "30+":      "#3366cc",
  "H5":       "#f5c800",
  "Drinkware M1":"#e8457a",
  "Drinkware M2":"#c42060",
  "Wallets":  "#7733aa",
  "Colex":    "#e87820"
};

const PRINTED_MACHINES = ["30","30+","H5","Drinkware M1","Drinkware M2"];
const STAMPED_MACHINES = ["Wallets"];

const ORDER_PIECE_MAP = {
  "COIR 28X16":              "Coir · 28x16",
  "COIR 28x16":              "Coir · 28x16",
  "COIR 30X18":              "Coir · 30x18",
  "COIR 30x18":              "Coir · 30x18",
  "COIR 36X24":              "Coir · 36x24",
  "COIR 36x24":              "Coir · 36x24",
  "COIR 60X24":              "Coir · 60x24",
  "COIR 60x24":              "Coir · 60x24",
  "FLOCKED COIR 22X10":      "Coir · Flocked",
  "FLOCKED COIR 22x10":      "Coir · Flocked",
  "BLOCK SIGN-6X6":          "Signs · 6x6 Plock",
  "BLOCK SIGN-6x6":          "Signs · 6x6 Plock",
  "YARD SIGNS 24X18":        "Signs · Yard Sign",
  "YARD SIGNS 24x18":        "Signs · Yard Sign",
  "YARD SIGN H-STAKE":       "Signs · Yard Sign",
  "HANGING SIGN 11X6":       "Signs · 11x6 Plock",
  "HANGING SIGN 11x6":       "Signs · 11x6 Plock",
  "HANGING SIGN 18X18":      "Signs · 18' Circle",
  "HANGING SIGN 18x18":      "Signs · 18' Circle",
  "PORCH LEANER 105X46":     "Signs · Leaner",
  "PORCH LEANER 105x46":     "Signs · Leaner",
  "WALL ART 16X24":          "Signs · 16x24",
  "WALL ART 16x24":          "Signs · 16x24",
  "WALL ART 12X12":          "Signs · 12x12",
  "WALL ART 12x12":          "Signs · 12x12",
  "PVC 28X16":               "Non-Coir Mats · PVC",
  "PVC 28x16":               "Non-Coir Mats · PVC",
  "ANTI FATIGUE MAT 30X18":  "Non-Coir Mats · AF Large",
  "ANTI FATIGUE MAT 30x18":  "Non-Coir Mats · AF Large",
  "DRYING MAT":              "Non-Coir Mats · Drying Mat",
  "WALLET":                  "Wallets · Bifold Black",
  "DISPLAY PIECES":          "Display Pieces · Vert. Yard Display",
};
