export type Direction = "inbound" | "outbound";

export interface Train {
  vehicleId: string;
  direction?: Direction;
  currentLocation: string;
  location: Location;
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
}

export type Stations = {[id: string]: Station};
