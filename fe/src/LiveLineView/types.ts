export type Direction = "inbound" | "outbound";

export interface Train {
  vehicleId: string;
  direction?: Direction;
  currentLocation: string;
  location?: Location;
  destination: string;
}

export type Location =
  | {
      type: "at" | "leaving" | "left" | "approaching";
      station: string;
    }
  | {
      type: "between";
      startStation: string;
      endStation: string;
    };

export interface Station {
  id: string;
  name: string;
  friendlyName: string;
  predecessors: string[];
  successors: string[];
  minutesUntilNextTrains: {
    outbound: number[];
    inbound: number[];
  };
}

export type Stations = {[id: string]: Station};

export interface TflRouteApiResponse {
  stations: [];
  stopPointSequences: Array<{
    direction: Direction;
    branchId: number;
    nextBranchIds: number[];
    prevBranchIds: number[];
    stopPoint: Array<{
      stationId: string;
      name: string;
    }>;
  }>;
}
