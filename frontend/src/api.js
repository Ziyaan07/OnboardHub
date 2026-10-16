const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Common API helper maintaining exact backend contract.
 * @param {string} path Endpoint path (e.g. '/hr/employees')
 * @param {object} options Request configuration
 */
export async function apiCall(path, { method = "GET", body, hrKey, form } = {}) {
  const headers = {};
  if (hrKey) headers["X-HR-Key"] = hrKey;
  
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(API + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = typeof data.detail === "string" 
      ? data.detail 
      : (Array.isArray(data.detail) && data.detail[0]?.msg)
        ? data.detail[0].msg
        : "An unexpected error occurred. Please try again.";
    throw new Error(errorMsg);
  }
  return data;
}

export default apiCall;
