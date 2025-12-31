export async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err: unknown) {
    clearTimeout(id);
    // Normalize AbortError to have a clear message
    if ((err as unknown as { name?: string })?.name === 'AbortError') {
      const e = new Error('Request timed out or was aborted') as Error & { name?: string };
      e.name = 'AbortError';
      throw e;
    }
    throw err;
  }
}
