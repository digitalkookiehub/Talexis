import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1`,
});

// Global API error event — picked up by ToastContext to show error toasts
type ApiErrorHandler = (message: string) => void;
let _onApiError: ApiErrorHandler | null = null;
export function setApiErrorHandler(handler: ApiErrorHandler) {
  _onApiError = handler;
}
export function clearApiErrorHandler() {
  _onApiError = null;
}

api.interceptors.request.use((config) => {
  // Don't attach token for auth endpoints (login, register, refresh)
  const isAuthEndpoint = config.url?.startsWith('/auth/login') ||
    config.url?.startsWith('/auth/register') ||
    config.url?.startsWith('/auth/refresh') ||
    config.url?.startsWith('/auth/forgot-password') ||
    config.url?.startsWith('/auth/demo-request');

  if (!isAuthEndpoint) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Don't retry auth endpoints
    const isAuthEndpoint = originalRequest.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    // Show toast for non-401 errors (401 is handled above via refresh)
    if (error.response?.status !== 401 && _onApiError) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : error.response?.status === 500 ? 'Server error. Please try again.'
        : error.response?.status === 403 ? 'Access denied.'
        : error.response?.status === 404 ? 'Resource not found.'
        : error.response?.status === 429 ? 'Too many requests. Please wait.'
        : error.message === 'Network Error' ? 'Cannot connect to server. Check your connection.'
        : '';
      if (msg) _onApiError(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
