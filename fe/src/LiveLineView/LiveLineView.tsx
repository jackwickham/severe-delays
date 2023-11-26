import {useParams} from "@solidjs/router";
import {createResource, type Component, createMemo, For, type JSX, onCleanup} from "solid-js";
import {TrainIndicator} from "./TrainIndicator";
import type {Direction, Location, Station, Stations, Train} from "./types";
import {lineColors} from "../constants";
import {parseLocation} from "./locationParser";

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
  naptanId: string;
  timeToStation: number;
}

const REFRESH_INTERVAL = 30000;

export const LiveLineView: Component = () => {
  let refreshIndicator: SVGAnimateElement | undefined;
  const routeParams = useParams();
  const line = routeParams.line;
  const [routeApiResponse] = createResource(async (): Promise<TflRouteApiResponse | null> => {
    const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Route/Sequence/outbound`);
    if (resp.status >= 400) {
      return null;
    }
    return await resp.json();
  });

  let refreshTimeout: NodeJS.Timeout | undefined;
  let lastRefreshed = Date.now();
  let visible = true;
  const [arrivalsApiResponse, {refetch: refreshArrivals}] = createResource(
    async (): Promise<TflArrivalApiResponse[] | null> => {
      const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Arrivals`);
      if (resp.status >= 400) {
        refreshTimeout = undefined;
        return null;
      }
      const json = await resp.json();

      lastRefreshed = Date.now();
      if (visible) {
        refreshTimeout = setTimeout(() => refreshArrivals(), REFRESH_INTERVAL);
      } else {
        refreshTimeout = undefined;
      }
      if (refreshIndicator) {
        refreshIndicator.beginElement();
      }
      return json;
    }
  );
  const handleVisibilityChange = () => {
    visible = document.visibilityState === "visible";
    if (visible) {
      if (!refreshTimeout) {
        if (Date.now() - lastRefreshed < REFRESH_INTERVAL) {
          refreshTimeout = setTimeout(() => refreshArrivals(), Date.now() - lastRefreshed);
        } else {
          refreshArrivals();
        }
      }
    } else if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = undefined;
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  onCleanup(() => {
    visible = false;
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = undefined;
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
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
          const minutesUntilNextTrains = {
            inbound: [] as number[],
            outbound: [] as number[],
          };
          if (arrivalsApiResponse.latest) {
            arrivalsApiResponse.latest.forEach((arrival) => {
              if (arrival.naptanId === stopPoint.stationId && arrival.direction) {
                minutesUntilNextTrains[arrival.direction].push(arrival.timeToStation / 60);
                minutesUntilNextTrains[arrival.direction].sort((a, b) => a - b).splice(2);
              }
            });
          }
          station = {
            id: stopPoint.stationId,
            name: stopPoint.name,
            friendlyName: stopPoint.name.replace(
              /(?:\([^\)]+ Line\))?[ -]Underground(?: Station)?$/,
              ""
            ),
            predecessors: [],
            successors: [],
            minutesUntilNextTrains: minutesUntilNextTrains,
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
            {node.friendlyName} &nbsp;
            <tspan class="fill-slate-500 text-sm">
              {`${
                node.minutesUntilNextTrains.inbound.length > 0
                  ? `↑ ${node.minutesUntilNextTrains.inbound.map((t) => t.toFixed(0)).join(", ")}`
                  : ""
              }
              ${
                node.minutesUntilNextTrains.inbound.length > 0 &&
                node.minutesUntilNextTrains.outbound.length > 0
                  ? " / "
                  : ""
              }
              ${
                node.minutesUntilNextTrains.outbound.length > 0
                  ? `↓ ${node.minutesUntilNextTrains.outbound.map((t) => t.toFixed(0)).join(", ")}`
                  : ""
              }`}
            </tspan>
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

  const trains: () => Train[] = createMemo(() => {
    const res: {[vehicle: string]: Train} = {};
    if (!arrivalsApiResponse.latest! || !routeApiResponse.latest) {
      return [];
    }
    for (let resp of arrivalsApiResponse.latest) {
      let existing = res[resp.vehicleId];
      if (!existing || !existing.direction || !existing.location) {
        const parsedLocation = parseLocation(resp.currentLocation, stations());
        res[resp.vehicleId] = {
          vehicleId: resp.vehicleId,
          currentLocation: resp.currentLocation,
          direction:
            resp.direction ||
            (parsedLocation &&
              maybeInferDirection(parsedLocation, resp.destinationNaptanId, stations())) ||
            existing?.direction,
          location: parsedLocation || existing?.location,
          destination: resp.towards,
        };
      }
    }
    return fillInMissingDirections(Object.values(res), stations());
  });

  const lineColor = lineColors[line] || {r: 0, g: 0, b: 0};

  return (
    <>
      {(!routeApiResponse.loading && !routeApiResponse.latest) ||
      (!arrivalsApiResponse.loading && !arrivalsApiResponse) ? (
        <p>Line {line} not found</p>
      ) : (
        <div class="mx-auto w-fit">
          <div class="ps-[52px] mb-4">
            <svg width="32" height="32">
              <circle
                cx="16"
                cy="16"
                r="8"
                fill="none"
                stroke-width="16"
                stroke-dasharray="50" // 2πr = 50
                stroke-dashoffset="50"
                transform="rotate(-90 16 16)"
                class="stroke-teal-500"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  dur={`${REFRESH_INTERVAL}ms`}
                  to="0"
                  fill="freeze"
                  restart="always"
                  begin="indefinite"
                  ref={refreshIndicator}
                />
              </circle>
            </svg>
          </div>
          <svg
            height={svgHeight()}
            viewBox={`0 0 380 ${svgHeight()}`}
            preserveAspectRatio="xMidYMin meet"
            class="max-w-full"
          >
            <path
              d={path()}
              stroke={`rgb(${lineColor.r}, ${lineColor.g}, ${lineColor.b})`}
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
                if (!train.direction) {
                  console.log(
                    `Train with no direction. Destination=${train.destination}, location=${train.currentLocation}`
                  );
                }
                const offsetMultiplier = train.direction === "inbound" ? -1 : 1;
                const x = train.direction === "inbound" ? 10 : 35;
                if (location.type === "at" && location.station in stationLocations()) {
                  return (
                    <TrainIndicator
                      x={x}
                      y={stationLocations()[location.station].y}
                      train={train}
                    />
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
                } else if (
                  location.type === "approaching" &&
                  location.station in stationLocations()
                ) {
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
        </div>
      )}
    </>
  );
};

const maybeInferDirection = (
  location: Location,
  destination: string,
  stations: Stations
): Direction | null => {
  if (stations[destination]?.predecessors.length === 0) {
    return "inbound";
  } else if (stations[destination]?.successors.length === 0) {
    return "outbound";
  }

  switch (location.type) {
    case "between": {
      if (stations[location.startStation]?.successors.includes(location.endStation)) {
        return "outbound";
      } else if (stations[location.startStation]?.predecessors.includes(location.endStation)) {
        return "inbound";
      }
      break;
    }
    case "approaching":
    case "at":
    case "leaving":
    case "left": {
      if (stations[location.station]?.successors.includes(destination)) {
        return "outbound";
      } else if (stations[location.station]?.predecessors.includes(destination)) {
        return "inbound";
      }
      break;
    }
  }

  return null;
};

const fillInMissingDirections = (trains: Train[], stations: Stations): Train[] => {
  return trains.map((train) => {
    if (train.direction) {
      return train;
    }
    let predecessorsToTry = [stations[train.destination]];
    let successorsToTry = [stations[train.destination]];
    for (let i = 0; i < 10; i++) {
      const newPredecessorsToTry: Station[] = [];
      for (let predecessor of predecessorsToTry) {
        if (!predecessor) {
          continue;
        }
        if (predecessor.predecessors.length === 0) {
          train.direction = "inbound";
          return train;
        }
        predecessor.predecessors.forEach((id) => newPredecessorsToTry.push(stations[id]));
      }
      predecessorsToTry = newPredecessorsToTry;

      const newSuccessorsToTry: Station[] = [];
      for (let successor of successorsToTry) {
        if (!successor) {
          continue;
        }
        if (successor.successors.length === 0) {
          train.direction = "outbound";
          return train;
        }
        successor.successors.forEach((id) => newSuccessorsToTry.push(stations[id]));
      }
      successorsToTry = newSuccessorsToTry;
    }
    return train;
  });
};
