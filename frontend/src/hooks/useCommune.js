import { useQuery } from "@tanstack/react-query";

// Fetches commune detail + AI risk narrative from the serverless API.
// Returns null narrative gracefully if the endpoint is unavailable (e.g. local
// dev without the API, or Gemini failure) so the UI never crashes.
async function fetchCommune(code) {
  const res = await fetch(`/api/commune/${code}`);
  if (!res.ok) throw new Error(`commune ${code}: ${res.status}`);
  return res.json();
}

export function useCommune(code) {
  return useQuery({
    queryKey: ["commune", code],
    queryFn: () => fetchCommune(code),
    enabled: Boolean(code),
    staleTime: 5 * 60 * 1000,
  });
}
