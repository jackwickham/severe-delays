import {For, type Component, createResource, createSignal, createEffect} from "solid-js";
import {type HistoryEntry, Line} from "./Line";
import {State} from "./types";
import {loadStatuses} from "../api/api";
import {type LineStatusEntry, type Status} from "../api/types";
import {Button} from "../components/Button";
import {SplitButton} from "../components/SplitButton";
import feather from "feather-icons";
import {Popover} from "../Popover";
import {Settings, createSettingsStore} from "./Settings";

// Colours from https://content.tfl.gov.uk/tfl-colour-standard-issue-08.pdf
const lineColors: {[line: string]: {r: number; g: number; b: number}} = {
  bakerloo: {r: 166, g: 90, b: 42},
  central: {r: 255, g: 37, b: 27},
  circle: {r: 255, g: 205, b: 0},
  district: {r: 0, g: 121, b: 52},
  "hammersmith-city": {r: 246, g: 155, b: 173},
  jubilee: {r: 123, g: 134, b: 140},
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
  piccadilly: {
    r: 0,
    g: 15,
    b: 159,
  },
  victoria: {
    r: 0,
    g: 160,
    b: 223,
  },
  "waterloo-city": {
    r: 107,
    g: 205,
    b: 178,
  },
  elizabeth: {
    r: 119,
    g: 61,
    b: 189,
  },
  "london-overground": {
    r: 238,
    g: 118,
    b: 35,
  },
  dlr: {
    r: 0,
    g: 175,
    b: 170,
  },
};

export const LineHistory: Component = () => {
  const [duration, setDuration] = createSignal(1000 * 60 * 60 * 4);
  const [displayRange, setDisplayRange] = createSignal({
    start: new Date(new Date().getTime() - duration()),
    end: new Date(),
  });
  const refreshDisplayRange = () =>
    setDisplayRange({
      start: new Date(new Date().getTime() - duration()),
      end: new Date(),
    });
  const [apiResponse] = createResource(
    displayRange,
    async (range) => await loadStatuses(range.start, range.end)
  );
  const [settingsStore, setSettingsStore] = createSettingsStore();
  const lines = () => {
    if (apiResponse.error) {
      return [];
    }
    const resp = apiResponse.latest;
    if (!resp) {
      return [];
    }
    const result: {
      statusHistory: HistoryEntry[];
      color?: {r: number; g: number; b: number};
      name: string;
    }[] = [];
    for (const [lineId, historyEntries] of Object.entries(resp)) {
      result.push({
        statusHistory: historyEntries.map((status) => ({
          startTime: new Date(status.from),
          statuses: status.entries.map((entry) => ({
            state: mapState(entry.status),
            reason: entry.reason || null,
          })),
          overallState: getOverallState(status.entries, settingsStore),
        })),
        color: lineColors[lineId],
        name: lineId,
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  };
  return (
    <>
      <div class="flex flex-row justify-end space-x-4 text-sm mb-4">
        <Settings store={settingsStore} setStore={setSettingsStore} />
        <SplitButton
          buttons={[
            {
              label: "1 week",
              active: duration() === 1000 * 86400 * 7,
              onClick: () => {
                setDuration(1000 * 86400 * 7);
                refreshDisplayRange();
              },
            },
            {
              label: "1 day",
              active: duration() === 1000 * 86400,
              onClick: () => {
                setDuration(1000 * 86400);
                refreshDisplayRange();
              },
            },
            {
              label: "4 hours",
              active: duration() === 1000 * 60 * 60 * 4,
              onClick: () => {
                setDuration(1000 * 60 * 60 * 4);
                refreshDisplayRange();
              },
            },
          ]}
        />
        <Button onClick={() => refreshDisplayRange()}>
          {apiResponse.error
            ? "Refresh (failed)"
            : apiResponse.loading
            ? "Refreshing..."
            : "Refresh"}
        </Button>
      </div>
      <div class="space-y-6 mb-20">
        <For each={lines()}>
          {(line) => (
            <Line
              name={line.name}
              statusHistory={line.statusHistory}
              color={line.color}
              displayRange={displayRange()}
            />
          )}
        </For>
      </div>
    </>
  );
};

const mapState = (state: Status | undefined): State => {
  switch (state) {
    case "GoodService":
      return State.GOOD_SERVICE;
    case "MinorDelays":
      return State.MINOR_DELAYS;
    case "SevereDelays":
      return State.SEVERE_DELAYS;
    case "PartClosure":
      return State.PART_CLOSURE;
    case "PlannedClosure":
      return State.PLANNED_CLOSURE;
    case "ServiceClosed":
      return State.SERVICE_CLOSED;
    case "PartSuspended":
      return State.PART_SUSPENDED;
    case "Suspended":
      return State.SUSPENDED;
    case "ReducedService":
      return State.REDUCED_SERVICE;
    default:
      return State.OTHER;
  }
};

const getOverallState = (entries: LineStatusEntry[], settingsStore: Settings): State => {
  let fallback = State.OTHER;
  for (let entry of entries) {
    let state = mapState(entry.status);
    if (!settingsStore.includeClosedInStats && state === State.SERVICE_CLOSED) {
      continue;
    }
    if (!settingsStore.includePlannedClosuresInStats && state === State.PLANNED_CLOSURE) {
      continue;
    }
    if (
      !settingsStore.includePlannedClosuresInStats &&
      (state === State.PART_CLOSURE || state === State.REDUCED_SERVICE)
    ) {
      // Only part closure, so we should fall back to good service for the rest of the line
      fallback = State.GOOD_SERVICE;
      continue;
    }
    return mapState(entry.status);
  }
  return fallback;
};
