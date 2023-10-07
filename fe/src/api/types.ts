export interface ApiResponse {
  [lineId: string]: LineStatusEntry[];
}

export interface LineStatusEntry {
  status: Status;
  reason?: string;
  from: string; // datetime
  to?: string; // datetime
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
