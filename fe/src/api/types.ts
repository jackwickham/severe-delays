export interface LineApiResponse {
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
  status: LineStatusEnum;
  reason?: string;
}

export type LineStatusEnum =
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

export interface StationApiResponse {
  [stationId: string]: {
    history: StationStatusEntry[];
  };
}

export interface StationDetailsApiResponse {
  [stationId: string]: StationDetail;
}

export interface StationDetail {
  name: string;
}

export interface StationStatusEntry {
  entries: StationStatusDetails[];
  from: string; // datetime
  to?: string; // datetime
}

export interface StationStatusDetails {
  status: StationStatusType;
  description: string;
}

export type StationStatusType =
  | "Closure"
  | "PartClosure"
  | "InterchangeMessage"
  | "Information"
  | "Other"
  | string;
