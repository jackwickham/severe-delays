export interface ApiResponse {
  [lineId: string]: LineStatus[];
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
  | "GoodService"
  | "MinorDelays"
  | "SevereDelays"
  | "PartClosure"
  | "Closed"
  | "PartSuspended"
  | "Suspended"
  | string;
