// Decides which data source the frontend utils use.
// Backend-first: VITE_API_BASE_URL at build time, else localhost:4000.
// Change the constant below (or the env var) to point elsewhere.

const HARDCODED_DATA_SOURCE = "backend";
const HARDCODED_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const getDataSource = () => HARDCODED_DATA_SOURCE;

export const isBackendMode = () => getDataSource() === "backend";

export const getApiBaseUrl = () => HARDCODED_API_BASE_URL;

export const backendFetch = async (path, options = {}) => {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Backend request failed: ${res.status} ${res.statusText}`);
  }
  // 204 No Content guard
  if (res.status === 204) return null;
  return res.json();
};
