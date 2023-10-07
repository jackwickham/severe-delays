import {For, type Component, createResource} from "solid-js";
import {HistoryEntry, Line} from "./Line";
import {LineStatus, State} from "./types";
import {loadStatuses} from "../api/api";
import { Status } from "../api/types";

export const LineHistory: Component = () => {
  const displayRange = {
    start: new Date("2023-10-07T23:00:00Z"),
    end: new Date(),
  };
  // Colours from https://content.tfl.gov.uk/tfl-colour-standard-issue-08.pdf
  const lineColors: { [line: string]: {r: number, g: number, b: number} } = {
    bakerloo: { r: 166, g: 90, b: 42},
    central: { r: 255, g: 37, b: 27 },
    circle: { r: 255, g: 205, b: 0},
    district: { r: 0, g: 121, b: 52 },
    "hammersmith-city": { r: 246, g: 155, b: 173 },
    jubilee: { r: 123, g: 134, b: 140 },
    metropolitan: {
      r: 135,
      g: 15,
      b: 84,
    },
    northern: {
      r: 0,
      g: 0,
      b: 0,
    },
    picadilly: {
      r: 0, g: 15, b: 159
    },
    victoria: {
      r: 0, g: 160, b: 223
    },
    "waterloo-city": {
      r: 107, g: 205, b: 178,
    },
    elizabeth: {
      r: 119,
      g: 61,
      b: 189,
    },
    "london-overground": {
      r: 238, g: 118, b: 35
    },
    dlr: {
      r: 0, g: 175, b: 170,
    },
  };
  const [apiResponse] = createResource(async () => await loadStatuses());
  const lines = () => {
    const resp = apiResponse();
    if (!resp) {
      return [];
    }
    const result: {statusHistory: HistoryEntry[], color?: {r: number, g: number, b: number}, name: string}[] = [];
    for (const [lineId, historyEntries] of Object.entries(resp)) {
      result.push({
        statusHistory: historyEntries.map((entry) => ({
          startTime: new Date(entry.from),
          status: {
            state: mapState(entry.status),
            reason: entry.reason || null,
          },
        })),
        color: lineColors[lineId],
        name: lineId,
      });
    }
    return result;
  };
  return (
    <div class="space-y-10">
      <For each={lines()}>
        {(line) => (
          <Line
            name={line.name}
            statusHistory={line.statusHistory}
            color={line.color}
            displayRange={displayRange}
          />
        )}
      </For>
    </div>
  );
};

const mapState = (state: Status): State => {
  switch (state) {
    case "GoodService":
      return State.GOOD_SERVICE;
    case "MinorDelays":
      return State.MINOR_DELAYS;
    case "SevereDelays":
      return State.SEVERE_DELAYS;
    case "PartClosure":
      return State.PART_CLOSED;
    case "Closed":
      return State.CLOSED;
    case "PartSuspended":
      return State.PART_SUSPENDED;
    case "Suspended":
      return State.SUSPENDED;
    default:
      return State.OTHER;
  }
};
