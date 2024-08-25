// Colours from https://content.tfl.gov.uk/tfl-colour-standard-issue-08.pdf
export const lineConfigs: {
  [line: string]: {color: {r: number; g: number; b: number}; direction?: "inbound" | "outbound"};
} = {
  bakerloo: {color: {r: 166, g: 90, b: 42}, direction: "inbound"},
  central: {color: {r: 255, g: 37, b: 27}, direction: "outbound"},
  circle: {color: {r: 255, g: 205, b: 0}, direction: "outbound"},
  district: {color: {r: 0, g: 121, b: 52}, direction: "outbound"},
  "hammersmith-city": {color: {r: 246, g: 155, b: 173}, direction: "outbound"},
  jubilee: {color: {r: 123, g: 134, b: 140}, direction: "outbound"},
  metropolitan: {color: {r: 135, g: 15, b: 84}, direction: "outbound"},
  northern: {color: {r: 0, g: 0, b: 0}, direction: "inbound"},
  piccadilly: {color: {r: 0, g: 15, b: 159}, direction: "outbound"},
  victoria: {color: {r: 0, g: 160, b: 223}, direction: "inbound"},
  "waterloo-city": {color: {r: 107, g: 205, b: 178}, direction: "outbound"},
  elizabeth: {color: {r: 119, g: 61, b: 189}},
  "london-overground": {color: {r: 238, g: 118, b: 35}},
  dlr: {color: {r: 0, g: 175, b: 170}},
};
