
export enum State {
  GOOD_SERVICE = "Good service",
  MINOR_DELAYS = "Minor delays",
  SEVERE_DELAYS = "Severe delays",
  PART_SUSPENDED = "Part suspended",
  SUSPENDED = "Suspended",
  PART_CLOSED = "Part closed",
  CLOSED = "Closed",
  OTHER = "Other",
}

export interface LineStatus {
  state: State;
  reason: string | null;
}