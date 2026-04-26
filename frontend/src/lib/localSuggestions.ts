import type { LocalSuggestionsApiRequest, LocalSuggestionsApiResponse } from "../types/weather";

export async function fetchLocalSuggestions(url: string, request: LocalSuggestionsApiRequest): Promise<LocalSuggestionsApiResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Local suggestions failed with ${response.status}`);
  }

  return (await response.json()) as LocalSuggestionsApiResponse;
}
