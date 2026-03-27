import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
let unauthorizedDispatched = false;

export const resolveAssetUrl = (url = '') => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return backendUrl ? `${backendUrl}${url}` : url;
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
