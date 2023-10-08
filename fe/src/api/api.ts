import {ApiResponse} from "./types";

export const loadStatuses = async (from: Date, to: Date): Promise<ApiResponse> => {
  const base = localStorage.getItem("apiBaseUri") || "";
  const response = await fetch(`${base}/api/v1/history?from=${from.toISOString()}&to=${to.toISOString()}`);
  const data = await response.json();
  return data;
};
