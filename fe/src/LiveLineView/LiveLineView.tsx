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
}

const REFRESH_INTERVAL = 30000;

export const LiveLineView: Component = () => {
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
      lastRefreshed = Date.now();

      const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Arrivals`);
      if (resp.status >= 400) {
        return null;
      }
      const json = await resp.json();

      if (visible) {
        refreshTimeout = setTimeout(() => refreshArrivals(), REFRESH_INTERVAL);
      } else {
        refreshTimeout = undefined;
      }
      return json;
    }
  );
  const handleVisibilityChange = () => {
    visible = document.visibilityState === "visible";
    if (visible) {
      if (!refreshTimeout) {
        if (Date.now() - lastRefreshed < REFRESH_INTERVAL) {
          setTimeout(() => refreshArrivals(), Date.now() - lastRefreshed);
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

  const trains: () => Train[] = createMemo(() => {
    const res: {[vehicle: string]: Omit<Train, "direction"> & {direction?: Direction}} = {};
    if (!arrivalsApiResponse.latest) {
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
            destination: resp.towards,
          };
        }
      }
    }
    return Object.values(res);
  });

  const lineColor = lineColors[line] || {r: 0, g: 0, b: 0};

  return (
    <>
      {(!routeApiResponse.loading && !routeApiResponse.latest) ||
      (!arrivalsApiResponse.loading && !arrivalsApiResponse) ? (
        <p>Line {line} not found</p>
      ) : (
        <svg width={300} height={svgHeight()} class="mx-auto">
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
      )}
    </>
  );
};
