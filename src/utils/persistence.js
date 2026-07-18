

let saveTimeout = null;

const readResponsePayload = async (res) => {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const createServerError = (fallbackMessage, res, result = {}) => {
  const message = result?.error || fallbackMessage;
  const error = new Error(message);
  error.status = res.status;
  error.serverMessage = result?.error || "";
  error.data = result;
  return error;
};

/**
 * Saves the full application state payload to PostgreSQL via the /api/data/save API endpoint.
 * This is debounced by 1 second to avoid database write overload during rapid state modifications.
 */
export const saveToServer = (payload, authToken = "", options = {}) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const res = await fetch("/api/data/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ payload }),
      });
      const result = await readResponsePayload(res);
      if (!res.ok) {
        const error = createServerError(`Gagal menyimpan data ke database server: ${res.statusText || res.status}`, res, result);
        console.warn(error.message);
        options.onError?.(error);
      } else {
        console.log("Data berhasil disimpan ke database PostgreSQL");
        options.onSuccess?.();
      }
    } catch (err) {
      console.error("Error saat menyimpan data ke database server:", err);
      options.onError?.(err);
    }
  }, 1000);
};

export const saveToServerNow = async (payload, authToken = "") => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const res = await fetch("/api/data/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ payload }),
  });
  const result = await readResponsePayload(res);
  if (!res.ok) {
    throw createServerError(`Gagal menyimpan data ke database server: ${res.statusText || res.status}`, res, result);
  }
  return result;
};

export const loadFromServer = async (authToken = "") => {
  const endpoint = authToken ? "/api/data/load" : "/api/data/public";
  const res = await fetch(endpoint, {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  const result = await readResponsePayload(res);
  if (!res.ok) {
    const error = createServerError(`Gagal memuat snapshot database lengkap (HTTP ${res.status})`, res, result);
    throw error;
  }
  return result?.payload || null;
};
