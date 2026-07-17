import axios from "axios";

/**
 * HTTP client for the Duna application.
 * Mirrors Kinship's httpClient configuration:
 * - baseURL from NEXT_PUBLIC_BACKEND_URL
 * - 20s timeout
 * - JSON content type
 * - Bearer token from localStorage on every request
 */
const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL!,
  timeout: 20000,
  headers: {
    "content-type": "application/json",
  },
});

// Request interceptor — attaches auth token from localStorage (same as Kinship)
client.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    console.error(error);
    return Promise.reject(error);
  }
);

export default client;
