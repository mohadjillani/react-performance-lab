/** Minimal JSON fetch for client components; throws so callers can show an error state. */
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`);
  }
  return (await response.json()) as T;
}
