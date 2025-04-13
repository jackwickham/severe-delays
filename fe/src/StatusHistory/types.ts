export enum LineState {
  GOOD_SERVICE = "Good service",
  MINOR_DELAYS = "Minor delays",
  SEVERE_DELAYS = "Severe delays",
  PART_SUSPENDED = "Part suspended",
  SUSPENDED = "Suspended",
  PLANNED_CLOSURE = "Planned closure",
  PART_CLOSURE = "Part closure",
  SERVICE_CLOSED = "Service closed",
  REDUCED_SERVICE = "Reduced service",
  OTHER = "Other",
}

export enum StationState {
  NO_DISRUPTION = "No disruption",
  CLOSURE = "Closure",
  PART_CLOSURE = "Part closure",
  INTERCHANGE_MESSAGE = "Interchange message",
  INFORMATION = "Information",
  OTHER = "Other",
}

export interface LineStatus {
  state: LineState;
  reason: string | null;
}

export interface StationStatus {
  state: StationState;
  reason: string | null;
}

// Generic status interface that can be used for both Line and Station
export interface Status<T> {
  state: T;
  reason: string | null;
}
