import {For, type Component, createMemo, Show, createSignal, onMount} from "solid-js";
import {type LineStatus, State} from "./types";
import {Popover} from "../Popover";
import {Settings} from "./Settings";
import {Button} from "../components/Button";
import feather from "feather-icons";

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
      if (statusHistory.overallState !== State.OTHER) {
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

  let headerElem: HTMLDivElement | undefined;
  let containerElem: HTMLDivElement | undefined;
  const [historyShowing, setHistoryShowing] = createSignal(false);
  const toggleHistoryShowing = () => {
    if (!historyShowing()) {
      setHistoryShowing(true);
    } else {
      const currentTop = headerElem!.getBoundingClientRect().top;
      if (currentTop <= 0) {
        const containerTop = containerElem!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: containerTop - currentTop,
          behavior: "instant",
        });
      }
      setHistoryShowing(false);
    }
  };

  return (
    <div ref={containerElem}>
      <div
        class="bg-page-background py-2"
        classList={{
          sticky: historyShowing(),
          "top-0": historyShowing(),
          "z-20": historyShowing(),
        }}
        ref={headerElem}
      >
        <div class="flex flex-row justify-between items-center">
          <div>
            <h2 class="text-2xl mb-2">
              <Show when={props.color}>
                <div
                  class="inline-block w-4 h-4 rounded-full mr-2"
                  style={`background-color: rgb(${props.color!.r}, ${props.color!.g}, ${
                    props.color!.b
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
          </div>
          <div>
            <Button
              rounded={false}
              padded={false}
              class="rounded-full w-8 h-8 p-0"
              onClick={toggleHistoryShowing}
            >
              <div
                class="flex justify-around"
                innerHTML={feather.icons[historyShowing() ? "minus" : "plus"].toSvg({
                  width: 16,
                })}
              />
            </Button>
          </div>
        </div>
        <div class="flex flex-row items-center bg-slate-300 h-3 rounded">
          <For each={statusHistoryInRange()}>
            {(entry, i) => {
              const basis = (entry.displayEndTime - entry.displayStartTime) * basisMultiplier();
              const colour = getStatusColour(entry.overallState);
              const [onPopoverShowHandler, setOnPopoverShowHandler] = createSignal<() => void>();
              const collapsedStatuses = () => collapseStatuses(entry.statuses);
              return (
                <div
                  class="flex-grow flex-shrink h-full hover:py-1 transition-all ease-linear box-content group/popover"
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
                  <div class="relative w-full h-full z-50 hidden group-hover/popover:block">
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
      <Show when={historyShowing()}>
        <div class="mt-2 mx-4 md:mx-10 border-s-2 border-s-slate-400">
          <For each={statusHistoryInRange()}>
            {(entry) => {
              const collapsedStatuses = () => collapseStatuses(entry.statuses);
              const [showReasonHoverShadow, setShowReasonHoverShadow] = createSignal(true);
              let reasonElem: HTMLParagraphElement;
              onMount(() =>
                setShowReasonHoverShadow(reasonElem!.clientHeight < reasonElem!.scrollHeight)
              );
              return (
                <div class="relative mb-3 last:mb-0">
                  <span
                    class={`absolute w-3 h-3 rounded-full inline-block top-1.5 -left-px -translate-x-1/2 ${getStatusColour(
                      entry.overallState
                    )}`}
                  ></span>
                  <div class="inline-block ms-3">
                    <For each={collapsedStatuses()}>
                      {(status) => (
                        <>
                          <h3 class="font-semibold">{status.state.join(" / ")}</h3>
                          <div class="text-sm max-h-10">
                            <p
                              class="line-clamp-2 hover:line-clamp-none hover:bg-page-background hover:z-10 relative"
                              classList={{
                                "hover:shadow-[0_4px_2px_-2px_rgba(0,0,0,0.2)]":
                                  showReasonHoverShadow(),
                              }}
                              ref={reasonElem}
                            >
                              {status.reason}
                            </p>
                          </div>
                        </>
                      )}
                    </For>
                    <p class="text-slate-500 text-xs">
                      {renderTimeRange(entry.startTime, entry.endTime)}
                    </p>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
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
      return "bg-blue-400";
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
    return `${startTime.toLocaleDateString()}, ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()} (${renderShortDuration(
      startTime,
      endTime
    )})`;
  }
  return `${startTime.toLocaleString()} - ${endTime.toLocaleString()} (${renderShortDuration(
    startTime,
    endTime
  )})`;
};

const renderShortDuration = (startTime: Date, endTime: Date) => {
  const minutes = (endTime.getTime() - startTime.getTime()) / 60_000;
  if (minutes >= 60 * 24) {
    return `${Math.round(minutes / (60 * 24))}d`;
  } else if (minutes >= 60) {
    return `${Math.round(minutes / 60)}h`;
  } else {
    return `${Math.max(Math.round(minutes), 1)}m`;
  }
};

const collapseStatuses = (statuses: LineStatus[]) => {
  const result: RenderedLineStatus[] = [];
  const resultsByReason: Map<string | null, RenderedLineStatus> = new Map();
  for (const status of statuses) {
    if (resultsByReason.has(status.reason)) {
      const existingEntry = resultsByReason.get(status.reason)!;
      if (!existingEntry.state.includes(status.state)) {
        existingEntry.state.push(status.state);
      }
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
