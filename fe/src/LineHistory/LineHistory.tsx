import {For, type Component, createResource, createSignal, Show} from "solid-js";
import {type HistoryEntry, Line} from "./Line";
import {State} from "./types";
import {loadStatuses} from "../api/api";
import {type LineStatusEntry, type Status} from "../api/types";
import {Button} from "../components/Button";
import {SplitButton} from "../components/SplitButton";
import {Settings, createSettingsStore} from "./Settings";
import {lineConfigs} from "../constants";

interface LineEntry {
  statusHistory: HistoryEntry[];
  color?: {r: number; g: number; b: number};
  name: string;
  mode?: string;
  favourite: boolean;
}

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
    const result: LineEntry[] = [];
    for (const [lineId, {history: historyEntries, metadata}] of Object.entries(resp)) {
      result.push({
        statusHistory: historyEntries.map((status) => ({
          startTime: new Date(status.from),
          statuses: status.entries.map((entry) => ({
            state: mapState(entry.status),
            reason: entry.reason || null,
          })),
          overallState: getOverallState(status.entries, settingsStore),
        })),
        color: lineConfigs[lineId]?.color,
        name: lineId,
        mode: metadata.mode,
        favourite: settingsStore.favouriteLines.includes(lineId),
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  };
  const LineRenderer: Component<{line: LineEntry}> = (props) => (
    <Line
      name={props.line.name}
      statusHistory={props.line.statusHistory}
      color={props.line.color}
      displayRange={displayRange()}
      mode={props.line.mode}
      favourite={props.line.favourite}
      toggleFavourite={() =>
        props.line.favourite
          ? setSettingsStore("favouriteLines", (favouriteLines) =>
              favouriteLines.filter((l) => l !== props.line.name)
            )
          : setSettingsStore("favouriteLines", settingsStore.favouriteLines.length, props.line.name)
      }
    />
  );

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
      <div class="space-y-10 mb-20">
        <Show when={settingsStore.favouriteLines.length > 0}>
          <div>
            <h2 class="text-2xl font-medium mb-4">Favourites</h2>
            <div class="space-y-6">
              <For each={lines()}>
                {(line) => (
                  <Show when={line.favourite}>
                    <LineRenderer line={line} />
                  </Show>
                )}
              </For>
            </div>
          </div>
        </Show>
        <div>
          <h2 class="text-2xl font-medium mb-4">All lines</h2>
          <div class="space-y-6">
            <For each={lines()}>
              {(line) => (
                <Show when={!line.favourite}>
                  <LineRenderer line={line} />
                </Show>
              )}
            </For>
          </div>
        </div>
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
