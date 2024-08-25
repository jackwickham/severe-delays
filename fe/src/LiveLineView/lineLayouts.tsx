export interface LineLayout {
  stationLocations: {
    [stationName: string]: {x: number; y: number; labelSide: "left" | "right"; stationId: string};
  };
  edges: string[][];
  spurs?: {
    stationName: string;
    startDirection: "up" | "down";
    endDirection: "left" | "right";
  }[];
}

const ALIGN_LEFT = 280;
const ALIGN_CENTER = 300;
const ALIGN_RIGHT = 320;

export const northernLineLayout: LineLayout = {
  stationLocations: {
    // High Barnet branch
    highBarnet: {x: ALIGN_RIGHT, y: 40, labelSide: "right", stationId: "940GZZLUHBT"},
    totteridgeWhetstone: {x: ALIGN_RIGHT, y: 80, labelSide: "right", stationId: "940GZZLUTAW"},
    woodsidePark: {x: ALIGN_RIGHT, y: 120, labelSide: "right", stationId: "940GZZLUWOP"},
    westFinchley: {x: ALIGN_RIGHT, y: 160, labelSide: "right", stationId: "940GZZLUWFN"},
    finchleyCentral: {x: ALIGN_RIGHT, y: 200, labelSide: "right", stationId: "940GZZLUFYC"},
    eastFinchley: {x: ALIGN_RIGHT, y: 240, labelSide: "right", stationId: "940GZZLUEFY"},
    highgate: {x: ALIGN_RIGHT, y: 280, labelSide: "right", stationId: "940GZZLUHGT"},
    archway: {x: ALIGN_RIGHT, y: 320, labelSide: "right", stationId: "940GZZLUACY"},
    tufnellPark: {x: ALIGN_RIGHT, y: 360, labelSide: "right", stationId: "940GZZLUTFP"},
    kentishTown: {x: ALIGN_RIGHT, y: 400, labelSide: "right", stationId: "940GZZLUKSH"},
    camdenTown: {x: ALIGN_CENTER, y: 440, labelSide: "right", stationId: "940GZZLUCTN"},
    // Edgeware branch
    edgware: {x: ALIGN_LEFT, y: 80, labelSide: "left", stationId: "940GZZLUEGW"},
    burntOak: {x: ALIGN_LEFT, y: 120, labelSide: "left", stationId: "940GZZLUBTK"},
    colindale: {x: ALIGN_LEFT, y: 160, labelSide: "left", stationId: "940GZZLUCND"},
    hendonCentral: {x: ALIGN_LEFT, y: 200, labelSide: "left", stationId: "940GZZLUHCL"},
    brentCross: {x: ALIGN_LEFT, y: 240, labelSide: "left", stationId: "940GZZLUBTX"},
    goldersGreen: {x: ALIGN_LEFT, y: 280, labelSide: "left", stationId: "940GZZLUGGN"},
    hampstead: {x: ALIGN_LEFT, y: 320, labelSide: "left", stationId: "940GZZLUHTD"},
    belsizePark: {x: ALIGN_LEFT, y: 360, labelSide: "left", stationId: "940GZZLUBZP"},
    chalkFarm: {x: ALIGN_LEFT, y: 400, labelSide: "left", stationId: "940GZZLUCFM"},
    // CX branch
    morningtonCrescent: {x: ALIGN_LEFT, y: 480, labelSide: "left", stationId: "940GZZLUMTC"},
    euston: {x: ALIGN_CENTER, y: 520, labelSide: "right", stationId: "940GZZLUEUS"},
    warrenStreet: {x: ALIGN_LEFT, y: 565, labelSide: "left", stationId: "940GZZLUWRR"},
    goodgeStreet: {x: ALIGN_LEFT, y: 610, labelSide: "left", stationId: "940GZZLUGDG"},
    tottenhamCourtRoad: {x: ALIGN_LEFT, y: 655, labelSide: "left", stationId: "940GZZLUTCR"},
    leicesterSquare: {x: ALIGN_LEFT, y: 700, labelSide: "left", stationId: "940GZZLULSQ"},
    charingCross: {x: ALIGN_LEFT, y: 745, labelSide: "left", stationId: "940GZZLUCHX"},
    embankment: {x: ALIGN_LEFT, y: 790, labelSide: "left", stationId: "940GZZLUEMB"},
    waterloo: {x: ALIGN_LEFT, y: 835, labelSide: "left", stationId: "940GZZLUWLO"},
    // Bank branch
    kingsCross: {x: ALIGN_RIGHT, y: 560, labelSide: "right", stationId: "940GZZLUKSX"},
    angel: {x: ALIGN_RIGHT, y: 600, labelSide: "right", stationId: "940GZZLUAGL"},
    oldStreet: {x: ALIGN_RIGHT, y: 640, labelSide: "right", stationId: "940GZZLUODS"},
    moorgate: {x: ALIGN_RIGHT, y: 680, labelSide: "right", stationId: "940GZZLUMGT"},
    bank: {x: ALIGN_RIGHT, y: 720, labelSide: "right", stationId: "940GZZLUBNK"},
    londonBridge: {x: ALIGN_RIGHT, y: 760, labelSide: "right", stationId: "940GZZLULNB"},
    borough: {x: ALIGN_RIGHT, y: 800, labelSide: "right", stationId: "940GZZLUBOR"},
    elephantAndCastle: {x: ALIGN_RIGHT, y: 840, labelSide: "right", stationId: "940GZZLUEAC"},
    kennington: {x: ALIGN_CENTER, y: 880, labelSide: "right", stationId: "940GZZLUKNG"},
    // Morden branch
    oval: {x: ALIGN_RIGHT, y: 920, labelSide: "right", stationId: "940GZZLUOVL"},
    stockwell: {x: ALIGN_RIGHT, y: 960, labelSide: "right", stationId: "940GZZLUSKW"},
    claphamNorth: {x: ALIGN_RIGHT, y: 1000, labelSide: "right", stationId: "940GZZLUCPN"},
    claphamCommon: {x: ALIGN_RIGHT, y: 1040, labelSide: "right", stationId: "940GZZLUCPC"},
    claphamSouth: {x: ALIGN_RIGHT, y: 1080, labelSide: "right", stationId: "940GZZLUCPS"},
    balham: {x: ALIGN_RIGHT, y: 1120, labelSide: "right", stationId: "940GZZLUBLM"},
    tootingBec: {x: ALIGN_RIGHT, y: 1160, labelSide: "right", stationId: "940GZZLUTBC"},
    tootingBroadway: {x: ALIGN_RIGHT, y: 1200, labelSide: "right", stationId: "940GZZLUTBY"},
    colliersWood: {x: ALIGN_RIGHT, y: 1240, labelSide: "right", stationId: "940GZZLUCSD"},
    southWimbledon: {x: ALIGN_RIGHT, y: 1280, labelSide: "right", stationId: "940GZZLUSWN"},
    morden: {x: ALIGN_RIGHT, y: 1320, labelSide: "right", stationId: "940GZZLUMDN"},
    // Battersea branch
    nineElms: {x: ALIGN_LEFT, y: 920, labelSide: "left", stationId: "940GZZNEUGST"},
    batterseaPowerStation: {
      x: ALIGN_LEFT,
      y: 960,
      labelSide: "left",
      stationId: "940GZZBPSUST",
    },
  },
  edges: [
    [
      "highBarnet",
      "totteridgeWhetstone",
      "woodsidePark",
      "westFinchley",
      "finchleyCentral",
      "eastFinchley",
      "highgate",
      "archway",
      "tufnellPark",
      "kentishTown",
      "camdenTown",
    ],
    [
      "edgware",
      "burntOak",
      "colindale",
      "hendonCentral",
      "brentCross",
      "goldersGreen",
      "hampstead",
      "belsizePark",
      "chalkFarm",
      "camdenTown",
    ],
    [
      "camdenTown",
      "morningtonCrescent",
      "euston",
      "warrenStreet",
      "goodgeStreet",
      "tottenhamCourtRoad",
      "leicesterSquare",
      "charingCross",
      "embankment",
      "waterloo",
      "kennington",
      "nineElms",
      "batterseaPowerStation",
    ],
    // Bank branch
    [
      "camdenTown",
      "euston",
      "kingsCross",
      "angel",
      "oldStreet",
      "moorgate",
      "bank",
      "londonBridge",
      "borough",
      "elephantAndCastle",
      "kennington",
      "oval",
      "stockwell",
      "claphamNorth",
      "claphamCommon",
      "claphamSouth",
      "balham",
      "tootingBec",
      "tootingBroadway",
      "colliersWood",
      "southWimbledon",
      "morden",
    ],
  ],
  spurs: [
    {
      stationName: "finchleyCentral",
      startDirection: "up",
      endDirection: "left",
    },
  ],
};
