import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ACCESS_KEY = 'nexusflow_access';
const REFRESH_KEY = 'nexusflow_refresh';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: if several requests 401 at once, only refresh once.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    if (response?.status === 401 && !config._retry && !isAuthEndpoint && tokenStore.getRefresh()) {
      config._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh/`, { refresh: tokenStore.getRefresh() })
            .then((res) => {
              tokenStore.set(res.data.access, res.data.refresh);
              return res.data.access;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newAccess = await refreshPromise;
        config.headers.Authorization = `Bearer ${newAccess}`;
        return api(config);
      } catch (refreshError) {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** Pull the first useful message out of a DRF error response. */
export function extractApiError(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    const text = Array.isArray(value) ? value[0] : value;
    return firstKey === 'non_field_errors' ? text : `${firstKey}: ${text}`;
  }
  return 'Something went wrong. Please try again.';
}

export default api;
