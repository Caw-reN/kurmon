

const AUTH_API_BASE = "/api/auth";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const requestJson = async (path, options = {}, retries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${AUTH_API_BASE}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        ...options,
      });
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
      if (!response.ok) {
        const error = new Error(data?.error || "Autentikasi server gagal.");
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch (err) {
      lastError = err;
      // Only retry on network errors (Failed to fetch), not on HTTP errors
      const isNetworkError = err instanceof TypeError && err.message === "Failed to fetch";
      if (!isNetworkError || attempt >= retries) break;
      // Wait before retry: 600ms, 1200ms, ...
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastError;
};

export const pingAuthServer = async () => requestJson("/ping", {}, 0);
const authHeaders = (authToken) => authToken ? { Authorization: `Bearer ${authToken}` } : {};

export const loginViaServer = async ({ username, password }) => requestJson("/login", {
  method: "POST",
  body: JSON.stringify({ username, password }),
}, 2);

export const syncAuthSnapshot = async ({ adminUser, teachers, staffs, authToken }) => requestJson("/sync", {
  method: "POST",
  headers: authHeaders(authToken),
  body: JSON.stringify({ adminUser, teachers, staffs }),
}, 1);
