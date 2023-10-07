import {For, type Component, createMemo, Show} from "solid-js";
import {LineStatus, State} from "./types";
import {Popover} from "../Popover";

export interface HistoryEntry {
  startTime: Date;
  status: LineStatus;
}

export interface LineProps {
  name: string;
  statusHistory: HistoryEntry[];
  displayRange: {
    start: Date;
    end: Date;
  };
  colour?: {
    r: number;
    g: number;
    b: number;
  };
}

interface RenderedHistoryEntry {
  startTime: Date | null;
  endTime: Date | null;
  displayStartTime: number;
  displayEndTime: number;
  status: LineStatus;
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
        status: {
          state: State.OTHER,
          reason: "No data",
        },
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
          status: entry.status,
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
      if (statusHistory.status.state !== State.OTHER) {
        durations[statusHistory.status.state] =
          statusHistory.displayEndTime - statusHistory.displayStartTime;
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
        <Show when={props.colour}>
          <div
            class="inline-block w-4 h-4 rounded-full mr-2"
            style={`background-color: rgb(${props.colour!.r}, ${props.colour!.g}, ${
              props.colour!.b
            })`}
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
            const colour = getStatusColour(entry.status.state);
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
              >
                <div class="relative mx-auto w-0">
                  <Popover>
                    <div class="text-xs flex flex-col space-y-1">
                      <p class="font-semibold">{entry.status.state}</p>
                      <Show when={entry.status.reason !== null}>
                        <p>{entry.status.reason}</p>
                      </Show>
                      <p class="text-slate-500">
                        {renderTimeRange(entry.startTime, entry.endTime)}
                      </p>
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

const getStatusColour = (state: State) => {
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
    case State.PART_CLOSED:
      return "bg-red-300";
    case State.CLOSED:
      return "bg-red-400";
    case State.OTHER:
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
