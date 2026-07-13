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
  "Non-Coir Mats": ["AF Large","AF Small","PVC"],
  "Signs":         ["16x24","12x12","12x8 Plock","11x6 Plock","6x6 Plock","Leaner","Double Sided Leaner","Mantle Sign","18\" Circle","Yard Sign"],
  "Wallets":       ["Cross Body","Trifold Black","Trifold Brown","Bifold Black","Bifold Brown","Bifold Tumbled Leather","Wristlet Black","Wristlet Brown","Front Pocket Black","Front Pocket Brown","Toiletry Bag","Clock"],
  "Display Pieces": ["Vert. Yard Display","Horz. Yard Display","Leaner Display","Yard Sign Display"],
  "Roll Media":     ["Small Canvas","Large Canvas","Drying Mat"],
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
  "Roll Media · Drying Mat": 8,
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

const PRINTED_MACHINES   = ["30","30+","H5","Drinkware M1","Drinkware M2"];
const STAMPED_MACHINES   = ["Wallets"];
const DRINKWARE_MACHINES = ["Drinkware M1","Drinkware M2"];

// ═══════════════════════════════════════
// INVENTORY PRODUCT CATALOGS
// ═══════════════════════════════════════
const INK_INVENTORY_PRODUCTS = {
  "30": [
    { id: "30_solvent", name: "Solvent",   partCode: "45225795" },
    { id: "30_white",   name: "White",     partCode: "45206774" },
    { id: "30_cyan",    name: "Cyan/Blue", partCode: "45206770" },
    { id: "30_magenta", name: "Magenta",   partCode: "45206771" },
    { id: "30_yellow",  name: "Yellow",    partCode: "45206772" },
    { id: "30_black",   name: "Black",     partCode: "45206773" },
  ],
  "30+": [
    { id: "30p_white",   name: "White",     partCode: "45249543" },
    { id: "30p_cyan",    name: "Cyan/Blue", partCode: "45249539" },
    { id: "30p_magenta", name: "Magenta",   partCode: "45249540" },
    { id: "30p_yellow",  name: "Yellow",    partCode: "45249541" },
    { id: "30p_black",   name: "Black",     partCode: "45249542" },
  ],
  "H5": [
    { id: "h5_cyan",    name: "Cyan",          partCode: "45165670" },
    { id: "h5_lcyan",   name: "Light Cyan",    partCode: "45165674" },
    { id: "h5_magenta", name: "Magenta",       partCode: "45174464" },
    { id: "h5_lmag",    name: "Light Magenta", partCode: "45174466" },
    { id: "h5_yellow",  name: "Yellow",        partCode: "45174465" },
    { id: "h5_lyel",    name: "Light Yellow",  partCode: "45174467" },
    { id: "h5_black",   name: "Black",         partCode: "45165673" },
    { id: "h5_lblack",  name: "Light Black",   partCode: "45165677" },
    { id: "h5_white",   name: "White Ink",     partCode: "45165678" },
  ],
  "Drinkware": [
    { id: "dw_cyan",    name: "CyanX4",    partCode: "IKUU000283" },
    { id: "dw_magenta", name: "MagentaX4", partCode: "IKU000284"  },
    { id: "dw_yellow",  name: "YellowX4",  partCode: "IKU000285"  },
    { id: "dw_black",   name: "BlackX4",   partCode: "IKU000286"  },
    { id: "dw_white",   name: "WhiteX4",   partCode: "IKUU000280" },
    { id: "dw_varnish", name: "VarnishX6", partCode: "IKUU000146" },
  ],
  "Colex": [],
};

const MAINT_INVENTORY_PRODUCTS = {
  "30": [
    { id: "30m_filters",  name: "Filters",                   partCode: "45198549" },
    { id: "30m_sabulk",   name: "Semi Annual Bulk Filters",  partCode: "45087559" },
    { id: "30m_samicron", name: "Semi Annual Micron Filter", partCode: "45080375" },
  ],
  "30+": [
    { id: "30pm_solvent",    name: "Solvent",                          partCode: "45225795" },
    { id: "30pm_filters6",   name: "6 Pack Filters",                   partCode: "45250905" },
    { id: "30pm_lampfilter", name: "Lamp Filters (new after install)",  partCode: "22202007" },
    { id: "30pm_sabulk",     name: "Semi Annual Bulk Filters",         partCode: "45087559" },
    { id: "30pm_samicron",   name: "Semi Annual Micron Filter",        partCode: "45080375" },
  ],
  "H5": [
    { id: "h5m_clean",    name: "Cleaning Solution",                               partCode: "45225794" },
    { id: "h5m_safilter", name: "Semi Annual Maintenance Filters",                 partCode: "45072843" },
    { id: "h5m_saink",    name: "Semi Annual Ink Filter",                          partCode: "45098981" },
    { id: "h5m_wipes",    name: "Wipes ULINE",                                    partCode: "45116069" },
    { id: "h5m_rollf",    name: "Roll Filter (secondary filter)",                  partCode: "45090057" },
    { id: "h5m_shutdown", name: "Shutdown Filter",                                partCode: "45187808" },
    { id: "h5m_carbon",   name: "Activated Carbon Cartridge for Nitrogen Filter", partCode: "45187807" },
    { id: "h5m_micron",   name: "Cartridge Microfilter for Nitrogen Filter",      partCode: ""         },
    { id: "h5m_fanf",     name: "Fan Filter (filter only)",                       partCode: ""         },
    { id: "h5m_40mm",     name: "Filter Elem 40mm",                               partCode: "45118474" },
    { id: "h5m_fan236",   name: "2.36 Fan Filter",                                partCode: "P4970-A"  },
    { id: "h5m_lamp10",   name: "10pk Lamp Filters",                              partCode: "45242755" },
    { id: "h5m_efi",      name: "EFI Consumable, 4\"",                            partCode: "P7442-A"  },
    { id: "h5m_fanguard", name: "Fan Guard, 40mm",                                partCode: "45125188" },
    { id: "h5m_lts",      name: "Long Term Storage",                              partCode: "45225793" },
  ],
  "Drinkware": [
    { id: "dwm_flush",   name: "Flush",             partCode: "IKUU000229"  },
    { id: "dwm_primer",  name: "Priming Agent",     partCode: "IDSPR 601 ×2" },
    { id: "dwm_pyrosil", name: "Pyrosil",           partCode: "IDSPR 601"   },
    { id: "dwm_shrink",  name: "Clear Shrink Wrap", partCode: "S-6637"      },
  ],
  "Colex": [],
};

const PARTS_INVENTORY_PRODUCTS = {
  "30": [
    { id: "30pt_oldwhiteprinthead",  name: "Old white print head",                    partCode: "88801095",   location: "30/1" },
    { id: "30pt_carriageliftrail",   name: "Carridge lift rail",                      partCode: "45164309",   location: "30/2" },
    { id: "30pt_inkpump",            name: "Ink Pump",                                partCode: "45104690",   location: "30/1" },
    { id: "30pt_inkclamps",          name: "Ink Clamps",                              partCode: "clamps",     location: "30/1" },
    { id: "30pt_usbcable",           name: "USB Cable",                               partCode: "45101498",   location: "30/1" },
    { id: "30pt_inklinecaps",        name: "Ink Line Caps",                           partCode: "4.0331E+11", location: "30/1" },
    { id: "30pt_screwthreads",       name: "Screw Threads",                           partCode: "",           location: "30/1" },
    { id: "30pt_socketheadcap",      name: "Socket Head Cap",                         partCode: "none",       location: "30/1" },
    { id: "30pt_inklineconnectors",  name: "Ink Line Connectors?",                    partCode: "",           location: "30/1" },
    { id: "30pt_maletofemaleconn",   name: "Male to female ink connector",            partCode: "",           location: "30/1" },
    { id: "30pt_screws_1",           name: "Screws",                                  partCode: "",           location: "30/1" },
    { id: "30pt_taigon",             name: "Taigon",                                  partCode: "1.0331E+11", location: "30/3" },
    { id: "30pt_cleartubing",        name: "Clear Tubing",                            partCode: "1.0331E+11", location: "30/3" },
    { id: "30pt_inktubeaccessories", name: "Ink Tube Accessaries (1 set)",            partCode: "",           location: "30/3" },
    { id: "30pt_printheadframe",     name: "Print Head Frame",                        partCode: "",           location: "30/2" },
    { id: "30pt_bulkinkfilter",      name: "Bulk Ink Filter",                         partCode: "45087559",   location: "30/2" },
    { id: "30pt_lampfilterframe",    name: "Lamp Filter Frame?",                      partCode: "10102100",   location: "30/3" },
    { id: "30pt_anticrashcable",     name: "Anti Crash Cable, Old Crash bar triggers", partCode: "45196599",  location: "30/1" },
    { id: "30pt_screws_2",           name: "Screws",                                  partCode: "",           location: "30/3" },
    { id: "30pt_cinchclamp",         name: "cinch clamp",                             partCode: "1.0261E+11", location: "30/1" },
  ],
  "30+": [
    { id: "30ppt_oldpcba16c",         name: "Old PCBA 16 C printhead controlboard", partCode: "45164290",   location: "30+/4" },
    { id: "30ppt_oldprintheadmount",  name: "OLD Print head mount",                 partCode: "",           location: "30+/4" },
    { id: "30ppt_cinchclamps",        name: "Cinch clamps",                         partCode: "",           location: "30+/1" },
    { id: "30ppt_inklinem2f",         name: "Ink Line male to female",              partCode: "",           location: "30+/1" },
    { id: "30ppt_socketheadcap",      name: "Socket head cap",                      partCode: "",           location: "30+/1" },
    { id: "30ppt_inklinecaps",        name: "ink Line caps",                        partCode: "",           location: "30+/1" },
    { id: "30ppt_inklineconnector",   name: "ink line connector?",                  partCode: "",           location: "30+/1" },
    { id: "30ppt_inklineopener",      name: "Ink Line opener",                      partCode: "",           location: "30+/1" },
    { id: "30ppt_asmcablecarriage",   name: "Asm, cable, carriage safety",          partCode: "45132135",   location: "30+/1" },
    { id: "30ppt_ionicbarpower",      name: "Ionic Bar power L/R",                  partCode: "45196637",   location: "30+/1" },
    { id: "30ppt_linearencodermount", name: "Assy Linear Encoder Mount",            partCode: "45166084",   location: "30+/1" },
    { id: "30ppt_lockwashers",        name: "Lock washers",                         partCode: "45092175",   location: "30+/1" },
    { id: "30ppt_washers",            name: "Washers",                              partCode: "45127287",   location: "30+/1" },
    { id: "30ppt_bearingscarriage",   name: "Bearings for carriage",                partCode: "10106637",   location: "30+/1" },
    { id: "30ppt_heightsolenoid",     name: "Assy Height Solenoid",                 partCode: "45200773",   location: "30+/1" },
    { id: "30ppt_filter2",            name: "Filter",                               partCode: "45080375",   location: "30+/2" },
    { id: "30ppt_screws",             name: "Screws",                               partCode: "",           location: "30+/2" },
    { id: "30ppt_printheadframe",     name: "Print Head Frame",                     partCode: "3.0312E+11", location: "30+/2" },
    { id: "30ppt_cablesubboard",      name: "Cable Sub-Board Power",                partCode: "45196614",   location: "30+/3" },
    { id: "30ppt_oldprinthead",       name: "Old Print Head",                       partCode: "",           location: "30+/4" },
    { id: "30ppt_oldlamp",            name: "Old Lamp",                             partCode: "",           location: "30+/4" },
  ],
  "H5": [],
  "Drinkware": [],
  "Colex": [],
};

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
