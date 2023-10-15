export enum State {
  GOOD_SERVICE = "Good service",
  MINOR_DELAYS = "Minor delays",
  SEVERE_DELAYS = "Severe delays",
  PART_SUSPENDED = "Part suspended",
  SUSPENDED = "Suspended",
  PLANNED_CLOSURE = "Planned closure",
  PART_CLOSURE = "Part closure",
  SERVICE_CLOSED = "Service closed",
  REDUCED_SERVICE = "Reduced service",
  CLOSED = "Closed",
  OTHER = "Other",
}

export interface LineStatus {
  state: State;
  reason: string | null;
}
