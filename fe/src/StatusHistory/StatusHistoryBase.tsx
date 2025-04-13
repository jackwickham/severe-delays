import {For, createMemo, createSignal, onMount, Show} from "solid-js";
import {Popover} from "../Popover";
import {Button} from "../components/Button";
import feather, {type FeatherIconNames} from "feather-icons";
import {A} from "@solidjs/router";

export interface HistoryEntry<T> {
  startTime: Date;
  statuses: Status<T>[];
  overallState: T;
}

export interface Status<T> {
  state: T;
  reason: string | null;
}

export interface RenderedHistoryEntry<T> {
  startTime: Date | null;
  endTime: Date | null;
  displayStartTime: number;
  displayEndTime: number;
  statuses: Status<T>[];
  overallState: T;
}

interface RenderedStatus<T> {
  state: T[];
  reason: string | null;
}

export interface StatusHistoryBaseProps<T> {
  name: string;
  statusHistory: HistoryEntry<T>[];
  displayRange: {
    start: Date;
    end: Date;
  };
  color?: {
    r: number;
    g: number;
    b: number;
  };
  mode?: string;
  favourite: boolean;
  toggleFavourite: () => void;
  getStatusColour: (state: T) => string;
  detailUrl?: string;
  detailIcon?: FeatherIconNames;
  detailTitle?: string;
  entityType: "line" | "station";
  noDataState: Status<T>; // Default state for no data
  otherState: T; // Used for filtering non-significant states in performance stats
}

export const StatusHistoryBase = <T,>(props: StatusHistoryBaseProps<T>) => {
  const statusHistoryInRange = createMemo<RenderedHistoryEntry<T>[]>(() => {
    // if (props.statusHistory.length === 0) {
    //   return [];
    // }

    const result: RenderedHistoryEntry<T>[] = [];
    if (
      props.statusHistory.length == 0 ||
      props.statusHistory[0].startTime.getTime() > props.displayRange.start.getTime()
    ) {
      result.push({
        startTime: null,
        endTime: props.statusHistory.length === 0 ? null : props.statusHistory[0].startTime,
        displayStartTime: props.displayRange.start.getTime(),
        displayEndTime:
          props.statusHistory.length === 0
            ? props.displayRange.end.getTime()
            : props.statusHistory[0].startTime.getTime(),
        statuses: [props.noDataState],
        overallState: props.noDataState.state,
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
    const durations: Map<T, number> = new Map();
    let total = 0;
    for (const statusHistory of statusHistoryInRange()) {
      if (statusHistory.overallState !== props.otherState) {
        const currentDuration = durations.get(statusHistory.overallState) || 0;
        const entryDuration = statusHistory.displayEndTime - statusHistory.displayStartTime;
        durations.set(statusHistory.overallState, currentDuration + entryDuration);
        total += entryDuration;
      }
    }

    // Convert to percentages
    const results: {state: T; performancePercentage: number}[] = [];
    durations.forEach((duration, state) => {
      results.push({
        state,
        performancePercentage: (duration / total) * 100,
      });
    });

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
            <h3 class="text-2xl mb-2">
              <Show when={props.color}>
                <div
                  class="w-4 h-4 rounded-full mr-2 inline-flex items-center justify-center relative"
                  style={`background-color: rgb(${props.color!.r}, ${props.color!.g}, ${
                    props.color!.b
                  })`}
                >
                  <Show when={props.mode === "overground"}>
                    <div class="h-1.5 w-full bg-page-background absolute"></div>
                  </Show>
                </div>
              </Show>
              <Show when={props.mode === "station" && props.favourite}>
                <div class="w-4 h-4 mr-2 inline-flex items-center justify-center align-baseline relative">
                  <span
                    class="flex justify-around"
                    innerHTML={feather.icons["home"].toSvg({
                      width: 16,
                      height: 16,
                    })}
                  />
                </div>
              </Show>
              {props.name}
            </h3>
            <div class="flex flex-row flex-wrap justify-after text-sm text-slate-500 space-x-3 mb-2">
              <p>Performance: </p>
              <For each={performanceStats()}>
                {(perf) => (
                  <p>
                    <span
                      class={`w-2 h-2 rounded-full inline-block ${props.getStatusColour(perf.state)}`}
                    ></span>{" "}
                    {String(perf.state).replace(/_/g, " ")}: {perf.performancePercentage.toFixed(1)}
                    %
                  </p>
                )}
              </For>
            </div>
          </div>
          <div class="flex flex-row gap-x-2">
            <Button
              rounded={false}
              padded={false}
              class="rounded-full w-8 h-8 p-0"
              onClick={props.toggleFavourite}
            >
              <span
                class="flex justify-around"
                innerHTML={feather.icons["star"].toSvg({
                  width: 16,
                  fill: props.favourite ? "currentColor" : "none",
                })}
              />
            </Button>
            <Show when={props.detailUrl && props.detailIcon && props.detailTitle}>
              <A href={props.detailUrl!} title={props.detailTitle}>
                <Button rounded={false} padded={false} class="rounded-full w-8 h-8 p-0">
                  <span
                    class="flex justify-around"
                    innerHTML={feather.icons[props.detailIcon!].toSvg({width: 16})}
                  />
                </Button>
              </A>
            </Show>
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
              const colour = props.getStatusColour(entry.overallState);
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
                            </>
                          )}
                        </For>
                        <p class="text-slate-500 text-xs">
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
      <Show when={historyShowing()}>
        <div class="mt-2 mx-4 md:mx-10 border-s-2 border-s-slate-400">
          <For each={statusHistoryInRange()}>
            {(entry) => {
              const collapsedStatuses = () => collapseStatuses(entry.statuses);
              return (
                <div class="relative mb-3 last:mb-0">
                  <span
                    class={`absolute w-3 h-3 rounded-full inline-block top-1.5 -left-px -translate-x-1/2 ${props.getStatusColour(
                      entry.overallState
                    )}`}
                  ></span>
                  <div class="inline-block ms-3">
                    <For each={collapsedStatuses()}>
                      {(status) => {
                        const [showReasonHoverShadow, setShowReasonHoverShadow] =
                          createSignal(true);
                        const [reasonElem, setReasonElem] = createSignal<HTMLParagraphElement>();
                        onMount(() => {
                          const elem = reasonElem();
                          if (elem) {
                            setShowReasonHoverShadow(elem.clientHeight < elem.scrollHeight);
                          } else {
                            console.warn("reason element not initialized");
                          }
                        });
                        return (
                          <>
                            <h3 class="font-semibold">{status.state.join(" / ")}</h3>
                            <div class="text-sm max-h-10">
                              <p
                                class="line-clamp-2 hover:line-clamp-none hover:bg-page-background hover:z-10 relative"
                                classList={{
                                  "hover:shadow-[0_4px_2px_-2px_rgba(0,0,0,0.2)]":
                                    showReasonHoverShadow(),
                                }}
                                ref={setReasonElem}
                              >
                                {status.reason}
                              </p>
                            </div>
                          </>
                        );
                      }}
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

const renderTimeRange = (startTime: Date | null, endTime: Date | null) => {
  if (startTime === null && endTime === null) {
    return null;
  }
  if (startTime === null) {
    return `Until ${endTime!.toLocaleString()}`;
  }
  if (endTime === null) {
    return `Since ${startTime.toLocaleString()} (${renderShortDuration(startTime, new Date())})`;
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

const collapseStatuses = <T,>(statuses: Status<T>[]) => {
  const result: RenderedStatus<T>[] = [];
  const resultsByReason: Map<string | null, RenderedStatus<T>> = new Map();
  for (const status of statuses) {
    const reasonKey = status.reason;
    if (resultsByReason.has(reasonKey)) {
      const existingEntry = resultsByReason.get(reasonKey)!;
      if (!existingEntry.state.includes(status.state)) {
        existingEntry.state.push(status.state);
      }
    } else {
      const renderedStatus: RenderedStatus<T> = {
        state: [status.state],
        reason: status.reason,
      };
      resultsByReason.set(reasonKey, renderedStatus);
      result.push(renderedStatus);
    }
  }
  return result;
};
