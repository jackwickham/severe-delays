import {For, type Component, createResource, createSignal, Show} from "solid-js";
import {Line} from "./Line";
import {Station} from "./Station";
import {type HistoryEntry} from "./StatusHistoryBase";
import {LineState, StationState} from "./types";
import {loadLineStatuses, loadStationStatuses, loadStationDetails} from "../api/api";
import {type LineStatusEntry, type StationStatusDetails} from "../api/types";
import {Button} from "../components/Button";
import {SplitButton} from "../components/SplitButton";
import {Settings, createSettingsStore} from "./Settings";
import {lineConfigs} from "../constants";

interface LineEntry {
  statusHistory: HistoryEntry<LineState>[];
  color?: {r: number; g: number; b: number};
  name: string;
  mode?: string;
  favourite: boolean;
}

interface StationEntry {
  statusHistory: HistoryEntry<StationState>[];
  name: string;
  stationId: string;
  favourite: boolean;
}

export const StatusHistory: Component = () => {
  const [duration, setDuration] = createSignal(1000 * 60 * 60 * 4);
  const [displayRange, setDisplayRange] = createSignal({
    start: new Date(new Date().getTime() - duration()),
    end: new Date(),
  });
  const [viewMode, setViewMode] = createSignal<"lines" | "stations" | "both">("both");

  const refreshDisplayRange = () =>
    setDisplayRange({
      start: new Date(new Date().getTime() - duration()),
      end: new Date(),
    });

  const [lineResponse] = createResource(
    displayRange,
    async (range) => await loadLineStatuses(range.start, range.end)
  );

  const [stationResponse] = createResource(
    displayRange,
    async (range) => await loadStationStatuses(range.start, range.end)
  );

  // Load station details (names) once
  const [stationDetailsResponse] = createResource(async () => await loadStationDetails());

  const [settingsStore, setSettingsStore] = createSettingsStore();

  const lines = () => {
    if (lineResponse.error || !lineResponse.latest) {
      return [];
    }

    const resp = lineResponse.latest;
    const result: LineEntry[] = [];

    for (const [lineId, {history: historyEntries, metadata}] of Object.entries(resp)) {
      result.push({
        statusHistory: historyEntries.map((status) => ({
          startTime: new Date(status.from),
          statuses: status.entries.map((entry) => ({
            state: mapLineState(entry.status),
            reason: entry.reason || null,
          })),
          overallState: getOverallLineState(status.entries, settingsStore),
        })),
        color: lineConfigs[lineId]?.color,
        name: lineId,
        mode: metadata?.mode,
        favourite: settingsStore.favouriteLines.includes(lineId),
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  };

  const stations = () => {
    // Get station history
    const resp = stationResponse.error || !stationResponse.latest ? {} : stationResponse.latest;

    // Get station details (names)
    const stationDetails =
      !stationDetailsResponse.error && stationDetailsResponse.latest
        ? stationDetailsResponse.latest
        : {};

    const result: StationEntry[] = [];
    const addedStations = new Set<string>();

    // First, add stations with history
    for (const [stationId, {history: historyEntries}] of Object.entries(resp)) {
      // Get friendly name from station details if available
      const friendlyName = formatStationName(stationDetails[stationId]?.name || stationId);

      result.push({
        statusHistory: historyEntries.flatMap((status) => {
          const disruption = {
            startTime: new Date(status.from),
            statuses: status.entries.map((entry) => ({
              state: mapStationState(entry.status),
              reason: entry.description || null,
            })),
            overallState: getOverallStationState(status.entries, settingsStore),
          };
          if (status.to) {
            const recovery = {
              startTime: new Date(status.to),
              statuses: [{state: StationState.NO_DISRUPTION, reason: null}],
              overallState: StationState.NO_DISRUPTION,
            };
            return [disruption, recovery];
          } else {
            return [disruption];
          }
        }),
        name: friendlyName,
        stationId: stationId,
        favourite: settingsStore.favouriteStations?.includes(stationId) || false,
      });

      addedStations.add(stationId);
    }

    // Add favorite stations that don't have history
    for (const stationId of settingsStore.favouriteStations || []) {
      if (!addedStations.has(stationId)) {
        const friendlyName = formatStationName(stationDetails[stationId]?.name || stationId);
        result.push({
          statusHistory: [],
          name: friendlyName,
          stationId: stationId,
          favourite: true,
        });

        addedStations.add(stationId);
      }
    }

    // Add all remaining stations from station details
    if (stationDetailsResponse.latest) {
      for (const [stationId, details] of Object.entries(stationDetailsResponse.latest)) {
        if (!addedStations.has(stationId)) {
          const friendlyName = formatStationName(details.name);
          result.push({
            statusHistory: [],
            name: friendlyName,
            stationId: stationId,
            favourite: false,
          });

          addedStations.add(stationId);
        }
      }
    }

    // Sort by name
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

  const StationRenderer: Component<{station: StationEntry}> = (props) => (
    <Station
      name={props.station.name}
      statusHistory={props.station.statusHistory}
      displayRange={displayRange()}
      stationId={props.station.stationId}
      favourite={props.station.favourite}
      toggleFavourite={() =>
        props.station.favourite
          ? setSettingsStore("favouriteStations", (favouriteStations) =>
              (favouriteStations || []).filter((s) => s !== props.station.stationId)
            )
          : setSettingsStore(
              "favouriteStations",
              (settingsStore.favouriteStations || []).length,
              props.station.stationId
            )
      }
    />
  );

  // Station search functionality
  const [stationSearchQuery, setStationSearchQuery] = createSignal("");

  // Filtered stations based on search query
  const filteredStations = () => {
    const query = stationSearchQuery().toLowerCase().trim();

    if (!query) {
      // When no search, only show stations with disruptions (non-empty status history)
      return stations().filter(
        (station) =>
          !station.favourite &&
          station.statusHistory.some(
            (e) =>
              settingsStore.includeStationInformationInStats || e.overallState !== "No disruption"
          )
      );
    }

    // When searching, show all stations matching the query
    return stations().filter(
      (station) => !station.favourite && station.name.toLowerCase().includes(query)
    );
  };

  // Check if any API request is loading or has an error
  const isLoading = () => lineResponse.loading || stationResponse.loading;
  const hasError = () => lineResponse.error || stationResponse.error;

  const favouriteLinesToShow = () =>
    viewMode() === "both" || viewMode() === "lines" ? lines().filter((line) => line.favourite) : [];
  const favouriteStationsToShow = () =>
    viewMode() === "both" || viewMode() === "stations"
      ? stations().filter((station) => station.favourite)
      : [];

  return (
    <>
      <div class="flex flex-wrap justify-between items-center gap-y-4 text-sm mb-4 gap-x-4">
        <div>
          <SplitButton
            buttons={[
              {
                label: "Lines & Stations",
                active: viewMode() === "both",
                onClick: () => setViewMode("both"),
              },
              {
                label: "Lines Only",
                active: viewMode() === "lines",
                onClick: () => setViewMode("lines"),
              },
              {
                label: "Stations Only",
                active: viewMode() === "stations",
                onClick: () => setViewMode("stations"),
              },
            ]}
          />
        </div>
        <div class="flex flex-row space-x-4">
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
            {hasError() ? "Refresh (failed)" : isLoading() ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div class="space-y-10 mb-20">
        <Show when={favouriteLinesToShow().length > 0 || favouriteStationsToShow().length > 0}>
          <div>
            <h2 class="text-2xl font-medium mb-4">Favourites</h2>
            <div class="space-y-6">
              <For each={favouriteLinesToShow()}>{(line) => <LineRenderer line={line} />}</For>
              <For each={favouriteStationsToShow()}>
                {(station) => <StationRenderer station={station} />}
              </For>
            </div>
          </div>
        </Show>

        <Show when={viewMode() === "both" || viewMode() === "lines"}>
          <div>
            <h2 class="text-2xl font-medium mb-4">All Lines</h2>
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
        </Show>

        <Show when={viewMode() === "both" || viewMode() === "stations"}>
          <div>
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-baseline gap-3">
                <h2 class="text-2xl font-medium">All Stations</h2>
                <Show when={stationSearchQuery().trim().length > 0}>
                  <span class="text-sm text-slate-500">
                    {filteredStations().length} result{filteredStations().length !== 1 ? "s" : ""}
                  </span>
                </Show>
              </div>
              <div class="relative w-64">
                <input
                  type="text"
                  placeholder="Search stations..."
                  value={stationSearchQuery()}
                  onInput={(e) => setStationSearchQuery(e.target.value)}
                  class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <Show when={stationSearchQuery().length > 0}>
                  <button
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setStationSearchQuery("")}
                  >
                    ✕
                  </button>
                </Show>
              </div>
            </div>
            <div class="space-y-6">
              <Show
                when={filteredStations().length > 0}
                fallback={
                  <div class="text-center py-8 text-slate-500">
                    No stations found matching "{stationSearchQuery()}"
                  </div>
                }
              >
                <For each={filteredStations()}>
                  {(station) => <StationRenderer station={station} />}
                </For>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </>
  );
};

const mapLineState = (state: string | undefined): LineState => {
  switch (state) {
    case "GoodService":
      return LineState.GOOD_SERVICE;
    case "MinorDelays":
      return LineState.MINOR_DELAYS;
    case "SevereDelays":
      return LineState.SEVERE_DELAYS;
    case "PartClosure":
      return LineState.PART_CLOSURE;
    case "PlannedClosure":
      return LineState.PLANNED_CLOSURE;
    case "ServiceClosed":
      return LineState.SERVICE_CLOSED;
    case "PartSuspended":
      return LineState.PART_SUSPENDED;
    case "Suspended":
      return LineState.SUSPENDED;
    case "ReducedService":
      return LineState.REDUCED_SERVICE;
    default:
      return LineState.OTHER;
  }
};

const mapStationState = (state: string | null | undefined): StationState => {
  switch (state) {
    case "Closure":
    case "PartClosure":
      return StationState.CLOSURE;
    case "InterchangeMessage":
      return StationState.INTERCHANGE_MESSAGE;
    case "Information":
      return StationState.INFORMATION;
    case null: // null means good service for stations
      return StationState.NO_DISRUPTION;
    default:
      return StationState.OTHER;
  }
};

const getOverallLineState = (entries: LineStatusEntry[], settingsStore: Settings): LineState => {
  let fallback = LineState.OTHER;
  for (let entry of entries) {
    let state = mapLineState(entry.status);
    if (!settingsStore.includeClosedInStats && state === LineState.SERVICE_CLOSED) {
      continue;
    }
    if (!settingsStore.includePlannedClosuresInStats && state === LineState.PLANNED_CLOSURE) {
      continue;
    }
    if (
      !settingsStore.includePlannedClosuresInStats &&
      (state === LineState.PART_CLOSURE || state === LineState.REDUCED_SERVICE)
    ) {
      // Only part closure, so we should fall back to good service for the rest of the line
      fallback = LineState.GOOD_SERVICE;
      continue;
    }
    return state;
  }
  return fallback;
};

const getOverallStationState = (
  entries: StationStatusDetails[],
  settingsStore: Settings
): StationState => {
  let fallback = StationState.OTHER;
  for (let entry of entries) {
    const state = mapStationState(entry.status);
    if (
      (state === StationState.INTERCHANGE_MESSAGE || state == StationState.INFORMATION) &&
      !settingsStore.includeStationInformationInStats
    ) {
      fallback = StationState.NO_DISRUPTION;
    } else {
      return state;
    }
  }
  return fallback;
};

// Helper function to format station names by removing standard suffixes
const formatStationName = (name: string): string => {
  return name
    .replace(/ Underground Station$/, "")
    .replace(/ Rail Station$/, "")
    .replace(/ DLR Station$/, "");
};
