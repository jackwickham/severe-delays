export interface ApiResponse {
  [lineId: string]: LineHistory;
}

export interface LineHistory {
  history: LineStatus[];
  metadata: LineMetadata;
}

export interface LineStatus {
  entries: LineStatusEntry[];
  from: string; // datetime
  to?: string; // datetime
}

export interface LineStatusEntry {
  status: Status;
  reason?: string;
}

export type Status =
  | "Suspended"
  | "PartSuspended"
  | "PlannedClosure"
  | "PartClosure"
  | "ServiceClosed"
  | "SevereDelays"
  | "ReducedService"
  | "MinorDelays"
  | "GoodService"
  | "Other"
  | string;

export interface LineMetadata {
  mode?: string;
}
