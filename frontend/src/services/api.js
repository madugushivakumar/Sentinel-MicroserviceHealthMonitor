import axios from 'axios';
let rateLimitHandler = null;

// ==============================
// Request Cache & Deduplication
// ==============================
const requestCache = new Map();
const pendingRequests = new Map();
const CACHE_DURATION = 3000; // 3 seconds cache

const getCacheKey = (config) => {
  return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}`;
};

// ==============================
// Base Axios Instance
// ==============================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==============================
// ENV SAFETY CHECK
// ==============================
if (!import.meta.env.VITE_API_BASE_URL) {
  console.error(
    '❌ VITE_API_BASE_URL is not defined. ' +
    'Please set it in Vercel or .env file.'
  );
}

// ==============================
// Request Interceptor - Add Auth Token
// ==============================
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================
// Response Interceptor - Handle 429 Errors
// ==============================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 429 Rate Limit Errors - Show wait timer
    if (error.response?.status === 429) {
      console.warn('Rate limited: skipping retry');
      // Trigger rate limit wait component
      if (rateLimitHandler) {
        rateLimitHandler();
      }
      return Promise.reject(error);
    }
    
    // For network errors, don't retry automatically
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.warn('Network error: skipping retry');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// ==============================
// AUTH API
// ==============================
export const signup = (data) => api.post('/auth/signup', data);
export const login = (data) => api.post('/auth/login', data);
export const getCurrentUser = () => api.get('/auth/me');

// ==============================
// PROJECTS API
// ==============================
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// ==============================
// SERVICES API
// ==============================
export const getServices = (projectId) => {
  const params = projectId ? { projectId } : {};
  return api.get('/services', { params });
};

export const getService = (id) => api.get(`/services/${id}`);
export const createService = (data) => api.post('/services', data);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);

export const cleanupDuplicateServices = () =>
  api.post('/services/cleanup-duplicates');

// ==============================
// HEALTH API
// ==============================
export const getLatestHealth = () => api.get('/health/latest');

export const getHealthHistory = (serviceId, hours = 24) =>
  api.get(`/health/${serviceId}/history`, { params: { hours } });

export const triggerHealthCheck = () => api.post('/health/trigger');

// ==============================
// INCIDENTS API
// ==============================
export const getIncidents = (params = {}) =>
  api.get('/incidents', { params });

export const closeIncident = (id) =>
  api.patch(`/incidents/${id}/close`);

// ==============================
// ALERTS API
// ==============================
export const getAlerts = (params = {}) =>
  api.get('/alerts', { params });

export const testAlert = (data) =>
  api.post('/alerts/test', data);

// ==============================
// RELIABILITY API
// ==============================
export const getReliabilityScores = () =>
  api.get('/reliability');

export const getReliabilityScore = (serviceId) =>
  api.get(`/reliability/${serviceId}`);

export const recalculateReliability = (serviceId = null) =>
  api.post('/reliability/recalculate', serviceId ? { serviceId } : {});

// ==============================
// HEALTH & METRICS PROXY
// ==============================
export const fetchServiceHealth = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}`);

    if (res.data?.error) {
      throw new Error(res.data.error);
    }

    return res.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch health data'
    );
  }
};

export const fetchServiceMetrics = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}/metrics`);

    if (res.data?.data?.available === false) {
      throw new Error(res.data.data.error || 'Metrics not available');
    }

    if (res.data?.error) {
      throw new Error(res.data.error);
    }

    return res.data.data;
  } catch (error) {
    console.warn('⚠️ Metrics fetch failed:', error.message);
    return null;
  }
};

export const fetchServiceSelftest = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}/selftest`);

    if (res.data?.error) {
      throw new Error(res.data.error);
    }

    return res.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch selftest data'
    );
  }
};

// ==============================
// ALERT RULES API
// ==============================
export const getAlertRules = (params = {}) =>
  api.get('/alert-rules', { params });

export const getAlertRule = (id) =>
  api.get(`/alert-rules/${id}`);

export const createAlertRule = (data) =>
  api.post('/alert-rules', data);

export const updateAlertRule = (id, data) =>
  api.put(`/alert-rules/${id}`, data);

export const deleteAlertRule = (id) =>
  api.delete(`/alert-rules/${id}`);

// ==============================
// REPORTS API
// ==============================
export const getMonthlyReport = (
  serviceId,
  month,
  year,
  period = null
) => {
  const params = { month, year };
  if (period) params.period = period;

  return api.get(`/reports/monthly/${serviceId}`, { params });
};

export const getAllMonthlyReports = (serviceId) =>
  api.get(`/reports/monthly/${serviceId}/all`);

// ==============================
// DEBUG API
// ==============================
export const testEmail = (email, serviceName) =>
  api.post('/debug/test-email', { email, serviceName });

export const setRateLimitHandler = (handler) => {
  rateLimitHandler = handler;
};

export default api;
