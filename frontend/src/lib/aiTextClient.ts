import type { BackendStatusResponse, ZenTextApiRequest, ZenTextApiResponse } from "../types/weather";

export async function fetchBackendStatus(url: string): Promise<BackendStatusResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Backend status failed with ${response.status}`);
  }

  return (await response.json()) as BackendStatusResponse;
}

export async function fetchZenText(url: string, request: ZenTextApiRequest): Promise<ZenTextApiResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Zen text failed with ${response.status}`);
  }

  return (await response.json()) as ZenTextApiResponse;
}
