import {For, type Component, createMemo, Show, createSignal} from "solid-js";
import {LineStatus, State} from "./types";
import {Popover} from "../Popover";
import {Settings} from "./Settings";

export interface HistoryEntry {
  startTime: Date;
  statuses: LineStatus[];
  overallState: State;
}

export interface LineProps {
  name: string;
  statusHistory: HistoryEntry[];
  displayRange: {
    start: Date;
    end: Date;
  };
  color?: {
    r: number;
    g: number;
    b: number;
  };
  settings: Settings;
}

interface RenderedHistoryEntry {
  startTime: Date | null;
  endTime: Date | null;
  displayStartTime: number;
  displayEndTime: number;
  statuses: LineStatus[];
  overallState: State;
}

interface RenderedLineStatus {
  state: State[];
  reason: string | null;
}

export const Line: Component<LineProps> = (props: LineProps) => {
  const statusHistoryInRange = createMemo<RenderedHistoryEntry[]>(() => {
    if (props.statusHistory.length === 0) {
      return [];
    }

    const result: RenderedHistoryEntry[] = [];
    if (props.statusHistory[0].startTime.getTime() > props.displayRange.start.getTime()) {
      result.push({
        startTime: null,
        endTime: props.statusHistory[0].startTime,
        displayStartTime: props.displayRange.start.getTime(),
        displayEndTime: props.statusHistory[0].startTime.getTime(),
        statuses: [
          {
            state: State.OTHER,
            reason: "No data",
          },
        ],
        overallState: State.OTHER,
      });
    }
    for (let i = 0; i < props.statusHistory.length; i++) {
      const entry = props.statusHistory[i];
      const startTime = Math.max(entry.startTime.getTime(), props.displayRange.start.getTime());

      const nextEntryStartTime = props.statusHistory[i + 1]?.startTime;
      const endTime = nextEntryStartTime
        ? Math.min(nextEntryStartTime.getTime(), props.displayRange.end.getTime())
        : props.displayRange.end.getTime();
      if (startTime <= endTime) {
        result.push({
          startTime: entry.startTime,
          endTime: nextEntryStartTime || null,
          displayStartTime: startTime,
          displayEndTime: endTime,
          statuses: entry.statuses,
          overallState: entry.overallState,
        });
      }
    }
    return result;
  });
  // Set flex-basis based on 10k px width, then rely on flex-shrink to fit the container
  const basisMultiplier = () =>
    10000 / (props.displayRange.end.getTime() - props.displayRange.start.getTime());

  const performanceStats = createMemo(() => {
    const durations: Partial<{[key in State]: number}> = {};
    let total = 0;
    for (const statusHistory of statusHistoryInRange()) {
      if (
        statusHistory.overallState !== State.OTHER &&
        (props.settings.includeClosedInStats ||
          statusHistory.overallState !== State.SERVICE_CLOSED) &&
        (props.settings.includePlannedClosuresInStats ||
          (statusHistory.overallState !== State.PLANNED_CLOSURE &&
            statusHistory.overallState !== State.PART_CLOSURE))
      ) {
        durations[statusHistory.overallState] =
          (durations[statusHistory.overallState] || 0) +
          statusHistory.displayEndTime -
          statusHistory.displayStartTime;
        total += statusHistory.displayEndTime - statusHistory.displayStartTime;
      }
    }
    // Convert to percentages
    const results: {state: State; performancePercentage: number}[] = [];
    for (const state of Object.values(State)) {
      if (state in durations) {
        results.push({
          state: state as State,
          performancePercentage: (durations[state as State]! / total) * 100,
        });
      }
    }
    return results;
  });

  return (
    <div>
      <h2 class="text-2xl mb-3">
        <Show when={props.color}>
          <div
            class="inline-block w-4 h-4 rounded-full mr-2"
            style={`background-color: rgb(${props.color!.r}, ${props.color!.g}, ${props.color!.b})`}
          ></div>
        </Show>
        {props.name}
      </h2>
      <div class="flex flex-row flex-wrap justify-after text-sm text-slate-500 space-x-3 mb-2">
        <p>Performance: </p>
        <For each={performanceStats()}>
          {(perf) => (
            <p>
              <span
                class={`w-2 h-2 rounded-full inline-block ${getStatusColour(perf.state)}`}
              ></span>{" "}
              {perf.state}: {perf.performancePercentage.toFixed(1)}%
            </p>
          )}
        </For>
      </div>
      <div class="flex flex-row items-center bg-slate-300 h-2 rounded">
        <For each={statusHistoryInRange()}>
          {(entry, i) => {
            const basis = (entry.displayEndTime - entry.displayStartTime) * basisMultiplier();
            const colour = getStatusColour(entry.overallState);
            const [onPopoverShowHandler, setOnPopoverShowHandler] = createSignal<() => void>();
            const collapsedStatuses = () => {
              const result: RenderedLineStatus[] = [];
              const resultsByReason: Map<string | null, RenderedLineStatus> = new Map();
              for (const status of entry.statuses) {
                if (resultsByReason.has(status.reason)) {
                  const existingEntry = resultsByReason.get(status.reason)!;
                  existingEntry.state.push(status.state);
                } else {
                  const renderedStatus: RenderedLineStatus = {
                    state: [status.state],
                    reason: status.reason,
                  };
                  resultsByReason.set(status.reason, renderedStatus);
                  result.push(renderedStatus);
                }
              }
              return result;
            };
            return (
              <div
                class="flex-grow flex-shrink h-2 hover:py-1 transition-all ease-linear box-content group/popover"
                classList={{
                  [colour]: true,
                  "rounded-l": i() === 0,
                  "rounded-r": i() === statusHistoryInRange().length - 1,
                }}
                style={{
                  "flex-basis": `${basis}px`,
                }}
                onMouseOver={() => onPopoverShowHandler()?.()}
              >
                <div class="relative w-full h-full hidden group-hover/popover:block">
                  <Popover setOnShowHandler={setOnPopoverShowHandler}>
                    <div class="text-sm flex flex-col space-y-1">
                      <For each={collapsedStatuses()}>
                        {(status) => (
                          <>
                            <p class="font-semibold">{status.state.join(" / ")}</p>
                            <Show when={status.reason !== null}>
                              <p>{status.reason}</p>
                            </Show>
                            <p class="text-slate-500 text-xs">
                              {renderTimeRange(entry.startTime, entry.endTime)}
                            </p>
                          </>
                        )}
                      </For>
                    </div>
                  </Popover>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

const getStatusColour = (state: State): string => {
  switch (state) {
    case State.GOOD_SERVICE:
      return "bg-green-500";
    case State.MINOR_DELAYS:
      return "bg-yellow-400";
    case State.SEVERE_DELAYS:
      return "bg-orange-600";
    case State.PART_SUSPENDED:
      return "bg-red-700";
    case State.SUSPENDED:
      return "bg-red-800";
    case State.PART_CLOSURE:
      return "bg-red-300";
    case State.PLANNED_CLOSURE:
      return "bg-red-400";
    case State.REDUCED_SERVICE:
      return "bg-yellow-500";
    case State.OTHER:
    case State.SERVICE_CLOSED:
    default:
      return "bg-gray-500";
  }
};

const renderTimeRange = (startTime: Date | null, endTime: Date | null) => {
  if (startTime === null && endTime === null) {
    return null;
  }
  if (startTime === null) {
    return `Until ${endTime!.toLocaleString()}`;
  }
  if (endTime === null) {
    return `Since ${startTime.toLocaleString()}`;
  }
  // Render the date once if the start and end times are on the same day
  if (startTime.toLocaleDateString() === endTime.toLocaleDateString()) {
    return `${startTime.toLocaleDateString()}, ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`;
  }
  return `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`;
};
