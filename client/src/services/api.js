import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
let unauthorizedDispatched = false;

export const resolveAssetUrl = (url = '') => {
  if (!url) return '';

  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  if (/^https?:\/\//i.test(url)) {
    try {
      const assetUrl = new URL(url);

      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && assetUrl.protocol === 'http:') {
        assetUrl.protocol = 'https:';
      }

      return assetUrl.toString();
    } catch {
      return url;
    }
  }

  if (url.startsWith('/')) {
    return normalizedBackendUrl ? `${normalizedBackendUrl}${url}` : url;
  }

  return normalizedBackendUrl ? `${normalizedBackendUrl}/${url}` : url;
};

const api = axios.create({
  baseURL: `${backendUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!unauthorizedDispatched) {
        unauthorizedDispatched = true;
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
        window.setTimeout(() => {
          unauthorizedDispatched = false;
        }, 1000);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
