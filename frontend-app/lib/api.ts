import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to set or remove auth header
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common["x-auth-token"] = token;
  } else {
    delete api.defaults.headers.common["x-auth-token"];
  }
}

// Response interceptor to handle global 401 could be added here later

export default api;
