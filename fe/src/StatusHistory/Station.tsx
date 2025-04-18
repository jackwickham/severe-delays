import {type Component} from "solid-js";
import {StatusHistoryBase, type HistoryEntry} from "./StatusHistoryBase";
import {StationState} from "./types";

export interface StationProps {
  name: string;
  statusHistory: HistoryEntry<StationState>[];
  displayRange: {
    start: Date;
    end: Date;
  };
  icon?: string; // Optional icon for the station (e.g., wheelchair, interchange)
  stationId: string;
  favourite: boolean;
  toggleFavourite: () => void;
}

export const Station: Component<StationProps> = (props: StationProps) => {
  const getStatusColour = (state: StationState): string => {
    switch (state) {
      case StationState.NO_DISRUPTION:
        return "bg-green-500";
      case StationState.CLOSURE:
        return "bg-red-800";
      case StationState.INTERCHANGE_MESSAGE:
        return "bg-blue-400";
      case StationState.INFORMATION:
        return "bg-blue-400";
      case StationState.OTHER:
      default:
        return "bg-gray-500";
    }
  };

  return (
    <StatusHistoryBase<StationState>
      name={props.name}
      statusHistory={props.statusHistory}
      displayRange={props.displayRange}
      favourite={props.favourite}
      toggleFavourite={props.toggleFavourite}
      getStatusColour={getStatusColour}
      detailTitle="Station details"
      entityType="station"
      mode="station"
      noDataState={{state: StationState.NO_DISRUPTION, reason: null}}
      otherState={StationState.OTHER}
    />
  );
};
