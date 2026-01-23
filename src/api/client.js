const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4001";

export function notify(message, type = "info") {
  try {
    window.dispatchEvent(new CustomEvent("pos:notify", { detail: { message, type } }));
  } catch (_) {
    // Fallback
    console.log(`[${type}]`, message);
  }
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    notify(msg, "error");
    throw new Error(msg);
  }

  // Optional success hook for POST/PUT/DELETE
  if ((options.method || "GET").toUpperCase() !== "GET") {
    notify("Action completed successfully", "success");
  }
  return data;
}

