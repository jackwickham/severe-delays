import {useParams} from "@solidjs/router";
import {createResource, type Component, createMemo, For, type JSX} from "solid-js";
import {TrainIndicator} from "./TrainIndicator";
import type {Direction, Location, Station, Stations, Train} from "./types";
import {lineColors} from "../constants";

interface TflRouteApiResponse {
  stations: [];
  stopPointSequences: Array<{
    direction: Direction;
    branchId: number;
    nextBranchIds: number[];
    prevBranchIds: number[];
    stopPoint: Array<{
      stationId: string;
      name: string;
    }>;
  }>;
}

interface TflArrivalApiResponse {
  vehicleId: string;
  currentLocation: string;
  towards: string;
  destinationNaptanId: string;
  direction: Direction;
}

export const LiveLineView: Component = () => {
  const routeParams = useParams();
  const line = routeParams.line;
  const [routeApiResponse] = createResource(async (): Promise<TflRouteApiResponse> => {
    const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Route/Sequence/outbound`);
    return await resp.json();
  });
  const [arrivalsApiResponse] = createResource(async (): Promise<TflArrivalApiResponse[]> => {
    const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Arrivals`);
    return await resp.json();
  });
  const stations = createMemo((): Stations => {
    if (routeApiResponse.loading || !routeApiResponse.latest) {
      return {};
    }
    const stations: Stations = {};
    for (let stopPointSeq of routeApiResponse.latest.stopPointSequences) {
      let prevStation: Station | undefined;
      for (let stopPoint of stopPointSeq.stopPoint) {
        let station = stations[stopPoint.stationId];
        if (!station) {
          station = {
            id: stopPoint.stationId,
            name: stopPoint.name,
            friendlyName: stopPoint.name.replace(
              /(?:\([^\)]+ Line\))?[ -]Underground(?: Station)?$/,
              ""
            ),
            predecessors: [],
            successors: [],
          };
          stations[stopPoint.stationId] = station;
        }
        if (prevStation) {
          if (!station.predecessors.includes(prevStation.id)) {
            station.predecessors.push(prevStation.id);
          }
          if (!prevStation.successors.includes(station.id)) {
            prevStation.successors.push(station.id);
          }
        }
        prevStation = station;
      }
    }

    return stations;
  });
  const trains: () => Train[] = createMemo(() => {
    const res: {[vehicle: string]: Omit<Train, "direction"> & {direction?: Direction}} = {};
    if (arrivalsApiResponse.loading || !arrivalsApiResponse.latest) {
      return [];
    }
    for (let resp of arrivalsApiResponse.latest) {
      let existing = res[resp.vehicleId];
      if (!existing || !existing.direction) {
        const parsedLocation = parseLocation(resp.currentLocation, stations());
        if (parsedLocation) {
          res[resp.vehicleId] = {
            vehicleId: resp.vehicleId,
            currentLocation: resp.currentLocation,
            direction: resp.direction,
            location: parsedLocation,
          };
        }
      }
    }
    return Object.values(res);
  });

  const pathComputer = createMemo(
    (): [string, number, JSX.Element[], {[stationId: string]: {y: number}}] => {
      const roots = Object.values(stations()).filter(
        (station) => station.predecessors.length === 0
      );
      let node = roots[0];
      const yOffset = 40;
      let y = 10;
      const path = [`M 70 ${y}`];
      const labels: JSX.Element[] = [];
      const stationLocations: {[stationId: string]: {y: number}} = {};
      let isFirstNode = true;
      while (node) {
        if (node.id in stationLocations) {
          // There's a loop
          break;
        }
        stationLocations[node.id] = {
          y,
        };
        if (node.predecessors.length > 1) {
          path.push("c 0 -7, -7 -12, -12 -12 m 12 12");
        }
        if (isFirstNode) {
          path.push(`m 10 0 l -10 0`);
        } else {
          path.push(`l 10 0 m -10 0`);
        }
        labels.push(
          <text x="85" y={y + 5}>
            {node.friendlyName}
          </text>
        );
        if (node.successors.length > 1) {
          path.push("c 0 7, -7 12, -12 12 m 12 -12");
        }
        node = stations()[node.successors[0]];
        if (node) {
          path.push(`l 0 ${yOffset}`);
          y += yOffset;
        }
        isFirstNode = false;
      }
      return [path.join(" "), y + 10, labels, stationLocations];
    }
  );
  const path = () => pathComputer()[0];
  const svgHeight = () => pathComputer()[1];
  const labels = () => pathComputer()[2];
  const stationLocations = () => pathComputer()[3];

  return (
    <>
      <svg width={300} height={svgHeight()} class="mx-auto">
        <path
          d={path()}
          stroke={`rgb(${lineColors[line].r}, ${lineColors[line].g}, ${lineColors[line].b})`}
          stroke-width="4"
          stroke-linecap="round"
          fill="transparent"
        />
        {...labels()}
        <For each={trains()}>
          {(train) => {
            const location = train.location;
            if (!location) {
              return null;
            }
            const offsetMultiplier = train.direction === "inbound" ? -1 : 1;
            const x = train.direction === "inbound" ? 10 : 35;
            if (location.type === "at" && location.station in stationLocations()) {
              return (
                <TrainIndicator x={x} y={stationLocations()[location.station].y} train={train} />
              );
            } else if (location.type === "leaving" && location.station in stationLocations()) {
              return (
                <TrainIndicator
                  x={x}
                  y={stationLocations()[location.station].y + 1 * offsetMultiplier}
                  train={train}
                />
              );
            } else if (location.type === "left" && location.station in stationLocations()) {
              return (
                <TrainIndicator
                  x={x}
                  y={stationLocations()[location.station].y + 4 * offsetMultiplier}
                  train={train}
                />
              );
            } else if (location.type === "approaching" && location.station in stationLocations()) {
              return (
                <TrainIndicator
                  x={x}
                  y={stationLocations()[location.station].y - 4 * offsetMultiplier}
                  train={train}
                />
              );
            } else if (
              location.type === "between" &&
              location.startStation in stationLocations() &&
              location.endStation in stationLocations()
            ) {
              return (
                <TrainIndicator
                  x={x}
                  y={
                    (stationLocations()[location.startStation].y +
                      stationLocations()[location.endStation].y) /
                    2
                  }
                  train={train}
                />
              );
            }

            return null;
          }}
        </For>
      </svg>
    </>
  );
};

const atRe = /^At (.+?)(?: Platform .*)?$/;
const leavingRe = /^Leaving (.+?)(?: Platform .*)?$/;
const leftRe = /^Left (.+?)(?: Platform .*)?$/;
const betweenRe = /^(?:In between|Between) (.+) and (.+)$/;
const approachingRe = /^Approaching (.+?)(?: Platform .*)?$/;
const knownEdgeCases = /^.* Sidings?$/;
const todo = /^$|^Near (.*)$|^(.*) area( fast)?$|^(North|South) of (.*)$/;

const parseLocation = (currentLocation: string, stations: Stations): Location | null => {
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
  } else if (knownEdgeCases.test(currentLocation) || todo.test(currentLocation)) {
    return null;
  } else {
    // Handle unrecognized location format
    console.warn(`Unrecognized location format: ${currentLocation}`);
    return null;
  }
};

const constructLocation = (
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
  const normalizedSearchName = normalizeName(stationName.toLowerCase());
  let best: Station | null = null;
  for (let id in stations) {
    const station = stations[id];
    const normalizedThisName = normalizeName(station.friendlyName);
    if (normalizedSearchName === normalizedThisName) {
      return station.id;
    }
    if (
      normalizedThisName.startsWith(normalizedSearchName) &&
      (!best || best.name.length > station.name.length)
    ) {
      best = station;
    }
  }
  return best && best.id;
};

const normalizeName = (stationName: string) =>
  stationName.toLowerCase().replace(/s?'s?/, "").replace("-", " ").trim();
