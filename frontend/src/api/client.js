import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min for large uploads
});

// Request interceptor — attach JWT Bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fraudlens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const detail = err?.response?.data?.detail || err?.message || 'Unexpected error';
    return Promise.reject(new Error(detail));
  }
);

// ── Auth APIs (Neon DB) ───────────────────────────────────────────────────

/** POST /auth/register */
export const registerApi = (data) => api.post('/auth/register', data);

/** POST /auth/login */
export const loginApi = (data) => api.post('/auth/login', data);

/** GET /auth/me */
export const getMeApi = () => api.get('/auth/me');

/** GET /auth/status (Database & Neon connection status) */
export const getDbStatusApi = () => api.get('/auth/status');

/** GET /auth/history */
export const getAnalysisHistoryApi = () => api.get('/auth/history');

// ── Fraud Detection APIs ──────────────────────────────────────────────────

/**
 * POST /analyze — upload ZIP file, returns dashboard summary
 * @param {File} file
 * @param {Function} onProgress - (pct: number) => void
 */
export const analyzeZip = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total) onProgress?.(Math.round((evt.loaded / evt.total) * 100));
    },
  });
};

/** GET /dashboard */
export const getDashboard = () => api.get('/dashboard');

/** GET /providers */
export const getProviders = () => api.get('/providers');

/** GET /providers/{id} */
export const getProvider = (id) => api.get(`/providers/${encodeURIComponent(id)}`);

/** GET / — health check */
export const healthCheck = () => api.get('/');

export default api;
