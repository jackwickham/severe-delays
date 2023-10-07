import {ApiResponse} from "./types";

export const loadStatuses = async (): Promise<ApiResponse> => {
  const response = await fetch("http://localhost:8000/api");
  const data = await response.json();
  return data;
};
