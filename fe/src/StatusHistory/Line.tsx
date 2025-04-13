import {type Component} from "solid-js";
import {StatusHistoryBase, type HistoryEntry} from "./StatusHistoryBase";
import {LineState} from "./types";

export interface LineProps {
  name: string;
  statusHistory: HistoryEntry<LineState>[];
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
}

export const Line: Component<LineProps> = (props: LineProps) => {
  const getStatusColour = (state: LineState): string => {
    switch (state) {
      case LineState.GOOD_SERVICE:
        return "bg-green-500";
      case LineState.MINOR_DELAYS:
        return "bg-yellow-400";
      case LineState.SEVERE_DELAYS:
        return "bg-orange-600";
      case LineState.PART_SUSPENDED:
        return "bg-red-700";
      case LineState.SUSPENDED:
        return "bg-red-800";
      case LineState.PART_CLOSURE:
        return "bg-red-300";
      case LineState.PLANNED_CLOSURE:
        return "bg-red-400";
      case LineState.REDUCED_SERVICE:
        return "bg-blue-400";
      case LineState.OTHER:
      case LineState.SERVICE_CLOSED:
      default:
        return "bg-gray-500";
    }
  };

  return (
    <StatusHistoryBase<LineState>
      name={props.name}
      statusHistory={props.statusHistory}
      displayRange={props.displayRange}
      color={props.color}
      mode={props.mode}
      favourite={props.favourite}
      toggleFavourite={props.toggleFavourite}
      getStatusColour={getStatusColour}
      detailUrl={props.mode === "tube" ? `/live/${props.name}` : undefined}
      detailIcon="radio"
      detailTitle="Current train locations"
      entityType="line"
      noDataState={{state: LineState.OTHER, reason: "No data"}}
      otherState={LineState.OTHER}
    />
  );
};
