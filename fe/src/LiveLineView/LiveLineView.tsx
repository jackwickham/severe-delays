import {A, useParams} from "@solidjs/router";
import {createResource, type Component, createMemo, For, type JSX, onCleanup, Show} from "solid-js";
import {TrainIndicator} from "./TrainIndicator";
import type {Direction, Location, Station, Stations, TflRouteApiResponse, Train} from "./types";
import {lineConfigs} from "../constants";
import {parseLocation} from "./locationParser";
import {Button} from "../components/Button";
import feather from "feather-icons";
import {getLineLayout} from "./lineLayouts";

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
  const lineConfig = lineConfigs[line];
  const direction = lineConfig?.direction || "outbound";
  const [routeApiResponse] = createResource(async (): Promise<TflRouteApiResponse | null> => {
    const resp = await fetch(`https://api.tfl.gov.uk/Line/${line}/Route/Sequence/${direction}`);
    if (resp.status >= 400) {
      return null;
    }
    return await resp.json();
  });

  let refreshTimeout: number | undefined;
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
    (): [
      string,
      number,
      JSX.Element[],
      {[stationId: string]: {x: number; y: number; labelSide: "left" | "right"}},
    ] => {
      if (routeApiResponse.loading || !routeApiResponse.latest) {
        return ["", 0, [], {}];
      }

      if (true) {
        const lineLayout = getLineLayout(line, routeApiResponse.latest);
        let path = lineLayout.edges
          .map((edge) => {
            const vertices = edge.map((vertex) => lineLayout.stationLocations[vertex]);
            const components = [`M ${vertices[0].x} ${vertices[0].y}`];
            for (let i = 1; i < vertices.length; i++) {
              components.push(
                `C ${vertices[i - 1].x},${vertices[i - 1].y + 20} ${vertices[i].x},${
                  vertices[i].y - 20
                } ${vertices[i].x},${vertices[i].y}`
              );
            }
            return components.join(" ");
          })
          .join(" ");
        const labelMarkers = Object.values(lineLayout.stationLocations)
          .map((loc) => `M ${loc.x} ${loc.y} l ${loc.labelSide === "left" ? -10 : 10} 0`)
          .join(" ");
        const spurs = (lineLayout.spurs || [])
          .map((spur) => {
            const start = lineLayout.stationLocations[spur.stationName];
            const vSign = spur.startDirection === "up" ? "-" : "";
            const hSign = spur.endDirection === "left" ? "-" : "";
            return `M ${start.x} ${start.y} c 0 ${vSign}7, ${hSign}7 ${vSign}12, ${hSign}12 ${vSign}12`;
          })
          .join(" ");
        const labels = Object.values(lineLayout.stationLocations).map((location) => (
          <text
            x={location.x + (location.labelSide === "left" ? -55 : 55)}
            y={location.y + 5}
            text-anchor={location.labelSide === "left" ? "end" : "start"}
          >
            {stations()[location.stationId]?.friendlyName}
          </text>
        ));
        return [
          `${path} ${labelMarkers} ${spurs}`,
          Math.max(...Object.values(lineLayout.stationLocations).map((layout) => layout.y)) + 20,
          labels,
          Object.fromEntries(
            Object.values(lineLayout.stationLocations).map((location) => [
              location.stationId,
              location,
            ])
          ),
        ];
      }

      const roots = Object.values(stations()).filter(
        (station) => station.predecessors.length === 0
      );
      let node = roots[0];
      const yOffset = 40;
      let y = 10;
      const x = 70;
      const path = [`M ${x} ${y}`];
      const labels: JSX.Element[] = [];
      const stationLocations: {
        [stationId: string]: {x: number; y: number; labelSide: "left" | "right"};
      } = {};
      let isFirstNode = true;
      while (node) {
        if (node.id in stationLocations) {
          // There's a loop
          break;
        }
        stationLocations[node.id] = {
          x,
          y,
          labelSide: "right",
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
          <text x={x + 55} y={y + 5}>
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
      let vehicle = resp.vehicleId != "000" ? resp.vehicleId : resp.currentLocation;
      let existing = res[vehicle];
      if (!existing || !existing.direction || !existing.location) {
        const parsedLocation = parseLocation(resp.currentLocation, stations());
        res[vehicle] = {
          vehicleId: resp.vehicleId,
          currentLocation: resp.currentLocation,
          direction:
            resp.direction ||
            (parsedLocation &&
              maybeInferDirection(
                parsedLocation,
                resp.destinationNaptanId,
                stations(),
                direction
              )) ||
            existing?.direction,
          location: parsedLocation || existing?.location,
          destination: resp.towards,
        };
      }
    }
    return fillInMissingDirections(Object.values(res), stations());
  });

  const lineColor = lineConfig?.color || {r: 0, g: 0, b: 0};

  return (
    <>
      {(!routeApiResponse.loading && !routeApiResponse.latest) ||
      (!arrivalsApiResponse.loading && !arrivalsApiResponse) ? (
        <p>Line {line} not found</p>
      ) : (
        <div class="mx-auto w-fit">
          <div class="mb-4 flex flex-row items-center">
            <A href="/" class="me-8">
              <Button class="flex flex-row items-center">
                <span
                  innerHTML={feather.icons["chevron-left"].toSvg({width: 16, class: "inline"})}
                />{" "}
                Back
              </Button>
            </A>
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
                class={arrivalsApiResponse.error ? "stroke-red-500" : "stroke-teal-500"}
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
              <Show when={arrivalsApiResponse.error}>
                <text
                  x="50%"
                  y="50%"
                  dominant-baseline="middle"
                  text-anchor="middle"
                  class="text-xl"
                >
                  !
                </text>
              </Show>
            </svg>
          </div>
          <svg
            height={svgHeight()}
            viewBox={`0 0 600 ${svgHeight()}`}
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
                const yOffsetMultiplier = train.direction === direction ? 1 : -1;
                const xOffset = train.direction === direction ? 23 : 41;
                if (location.type === "at" && location.station in stationLocations()) {
                  const station = stationLocations()[location.station];
                  return (
                    <TrainIndicator
                      x={station.x + xOffset * (station.labelSide === "left" ? -1 : 1)}
                      y={station.y}
                      train={train}
                      mapDirection={direction}
                    />
                  );
                } else if (location.type === "leaving" && location.station in stationLocations()) {
                  const station = stationLocations()[location.station];
                  return (
                    <TrainIndicator
                      x={station.x + xOffset * (station.labelSide === "left" ? -1 : 1)}
                      y={station.y + 1 * yOffsetMultiplier}
                      train={train}
                      mapDirection={direction}
                    />
                  );
                } else if (location.type === "left" && location.station in stationLocations()) {
                  const station = stationLocations()[location.station];
                  return (
                    <TrainIndicator
                      x={station.x + xOffset * (station.labelSide === "left" ? -1 : 1)}
                      y={station.y + 4 * yOffsetMultiplier}
                      train={train}
                      mapDirection={direction}
                    />
                  );
                } else if (
                  location.type === "approaching" &&
                  location.station in stationLocations()
                ) {
                  const station = stationLocations()[location.station];
                  return (
                    <TrainIndicator
                      x={station.x + xOffset * (station.labelSide === "left" ? -1 : 1)}
                      y={station.y - 4 * yOffsetMultiplier}
                      train={train}
                      mapDirection={direction}
                    />
                  );
                } else if (
                  location.type === "between" &&
                  location.startStation in stationLocations() &&
                  location.endStation in stationLocations()
                ) {
                  const startStation = stationLocations()[location.startStation];
                  const endStation = stationLocations()[location.endStation];
                  return (
                    <TrainIndicator
                      x={
                        (startStation.x + endStation.x) / 2 +
                        xOffset *
                          (startStation.labelSide === "left" || endStation.labelSide === "left"
                            ? -1
                            : 1)
                      }
                      y={(startStation.y + endStation.y) / 2}
                      train={train}
                      mapDirection={direction}
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
  stations: Stations,
  direction: Direction
): Direction | null => {
  const oppositeDirection: Direction = direction === "inbound" ? "outbound" : "inbound";
  if (stations[destination]?.predecessors.length === 0) {
    return oppositeDirection;
  } else if (stations[destination]?.successors.length === 0) {
    return direction;
  }

  switch (location.type) {
    case "between": {
      if (stations[location.startStation]?.successors.includes(location.endStation)) {
        return direction;
      } else if (stations[location.startStation]?.predecessors.includes(location.endStation)) {
        return oppositeDirection;
      }
      break;
    }
    case "approaching":
    case "at":
    case "leaving":
    case "left": {
      if (stations[location.station]?.successors.includes(destination)) {
        return direction;
      } else if (stations[location.station]?.predecessors.includes(destination)) {
        return oppositeDirection;
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
