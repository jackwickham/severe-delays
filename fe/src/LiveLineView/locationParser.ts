import type {Location, Station, Stations} from "./types";

const atRe = /^At (.+?)(?: (?:Platform |P).*)?$/;
const leavingRe = /^(?:Leaving|Departing) (.+?)(?: (?:Platform |P).*)?$/;
const leftRe = /^(?:Left|Departed) (.+?)(?: (?:Platform |P).*)?$/;
const betweenRe = /^(?:In between|Between) (.+) and (.+)$/;
const approachingRe = /^Approachih?ng (.+?)(?: (?:Platform |P).*)?$/;
const atFallback = /^(.+?) Platform .*$/;
const knownEdgeCases = /^.* (Sidings?|Depot|Loop)$/;
const todo = /^$|^Near (.*)$|^(.*) [aA]rea( fast)?$|^(North|South) of (.*)$|^Around (.*)$/;

export const parseLocation = (currentLocation: string, stations: Stations): Location | null => {
  let matches;

  if ((matches = atRe.exec(currentLocation)) !== null) {
    return constructLocation("at", matches[1], stations);
  } else if ((matches = leavingRe.exec(currentLocation)) !== null) {
    return constructLocation("leaving", matches[1], stations);
  } else if ((matches = leftRe.exec(currentLocation)) !== null) {
    return constructLocation("left", matches[1], stations);
  } else if ((matches = betweenRe.exec(currentLocation)) !== null) {
    const startStation = parseStation(matches[1], stations);
    const endStation = parseStation(matches[2], stations);
    if (!startStation || !endStation) {
      console.warn(
        `Failed to find stations. ${matches[1]} => ${startStation}, ${matches[2]} => ${endStation}`
      );
      return null;
    }
    return {
      type: "between",
      startStation,
      endStation,
    };
  } else if ((matches = approachingRe.exec(currentLocation)) !== null) {
    return constructLocation("approaching", matches[1], stations);
  } else if ((matches = atFallback.exec(currentLocation)) !== null) {
    return constructLocation("at", matches[1], stations);
  } else if (knownEdgeCases.test(currentLocation) || todo.test(currentLocation)) {
    return null;
  } else {
    console.warn(`Unrecognized location format: ${currentLocation}`);
    return null;
  }
};

export const constructLocation = (
  type: "at" | "leaving" | "left" | "approaching",
  stationName: string,
  stations: Stations
): Location | null => {
  const station = parseStation(stationName, stations);
  if (station === null) {
    console.warn("Failed to find station", stationName);
    return null;
  }
  return {
    type,
    station,
  };
};

const parseStation = (stationName: string, stations: Stations): string | null => {
  const normalizedSearchName = normalizeName(stationName);
  let best: Station | null = null;
  for (let id in stations) {
    const station = stations[id];
    const normalizedThisName = normalizeName(station.friendlyName);
    if (normalizedSearchName === normalizedThisName) {
      return station.id;
    }
    if (
      (normalizedThisName.startsWith(normalizedSearchName) ||
        normalizedSearchName.startsWith(normalizedThisName)) &&
      (!best || best.name.length > station.name.length)
    ) {
      best = station;
    }
  }
  return best && best.id;
};

const SPECIAL_CASES = {
  "st john wood": "st johns wood",
  "willlesden green": "willesden green",
  castle: "elephant and castle",
};

// There are a bunch of inconsistencies in station naming, even for different locations within the same data
const normalizeName = (stationName: string) => {
  const normalized = stationName
    .toLowerCase()
    .replaceAll(/s?'s?/g, "s")
    .replaceAll("-", " ")
    .replaceAll("&", "and")
    .replaceAll(".", "")
    .trim();
  if (normalized in SPECIAL_CASES) {
    return SPECIAL_CASES[normalized as keyof typeof SPECIAL_CASES];
  }
  return normalized;
};
