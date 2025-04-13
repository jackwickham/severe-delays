import type {LineApiResponse, StationApiResponse, StationDetailsApiResponse} from "./types";

export const loadLineStatuses = async (from: Date, to: Date): Promise<LineApiResponse> => {
  const base = localStorage.getItem("apiBaseUri") || "";
  const response = await fetch(
    `${base}/api/v1/history?from=${from.toISOString()}&to=${to.toISOString()}`
  );
  const data = await response.json();
  return data;
};

export const loadStationStatuses = async (from: Date, to: Date): Promise<StationApiResponse> => {
  const base = localStorage.getItem("apiBaseUri") || "";
  const response = await fetch(
    `${base}/api/v1/station-history?from=${from.toISOString()}&to=${to.toISOString()}`
  );
  const data = await response.json();
  return data;
};

export const loadStationDetails = async (): Promise<StationDetailsApiResponse> => {
  try {
    const base = localStorage.getItem("apiBaseUri") || "";
    const response = await fetch(`${base}/api/v1/station-details`);
    if (!response.ok) {
      console.error("Failed to load station details:", response.status);
      return {};
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading station details:", error);
    return {};
  }
};
