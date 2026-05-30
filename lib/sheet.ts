let cachedCSV: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function getFAQ(): Promise<string> {
  const now = Date.now();
  if (cachedCSV && now - cacheTime < CACHE_TTL) {
    return cachedCSV;
  }

  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error("SHEET_CSV_URL is not set");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    if (cachedCSV) return cachedCSV; // fallback to stale cache
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }

  const text = await res.text();
  cachedCSV = text;
  cacheTime = now;
  return text;
}
