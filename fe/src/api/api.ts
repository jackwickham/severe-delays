import {ApiResponse} from "./types";

export const loadStatuses = async (from: Date, to: Date): Promise<ApiResponse> => {
  const response = await fetch(`http://localhost:8000/api/v1/history?from=${from.toISOString()}&to=${to.toISOString()}`);
  const data = await response.json();
  return data;
};
