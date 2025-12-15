import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Projects API
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Services API
export const getServices = (projectId) => {
  const params = projectId ? { projectId } : {};
  return api.get('/services', { params });
};
export const getService = (id) => api.get(`/services/${id}`);
export const createService = (data) => api.post('/services', data);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);
export const cleanupDuplicateServices = () => api.post('/services/cleanup-duplicates');

// Health API
export const getLatestHealth = () => api.get('/health/latest');
export const getHealthHistory = (serviceId, hours = 24) => 
  api.get(`/health/${serviceId}/history`, { params: { hours } });
export const triggerHealthCheck = () => api.post('/health/trigger');

// Incidents API
export const getIncidents = (params = {}) => api.get('/incidents', { params });
export const closeIncident = (id) => api.patch(`/incidents/${id}/close`);

// Alerts API
export const getAlerts = (params = {}) => api.get('/alerts', { params });
export const testAlert = (data) => api.post('/alerts/test', data);

// Reliability API
export const getReliabilityScores = () => api.get('/reliability');
export const getReliabilityScore = (serviceId) => api.get(`/reliability/${serviceId}`);
export const recalculateReliability = (serviceId = null) => 
  api.post('/reliability/recalculate', serviceId ? { serviceId } : {});

// Fetch health/metrics via backend proxy (avoids CORS issues)
export const fetchServiceHealth = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}`);
    if (res.data.error) {
      throw new Error(res.data.error);
    }
    return res.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch health data');
  }
};

export const fetchServiceMetrics = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}/metrics`);
    // Check if metrics are available (new format returns 200 even on error)
    if (res.data.data && res.data.data.available === false) {
      throw new Error(res.data.data.error || 'Metrics not available');
    }
    if (res.data.error) {
      throw new Error(res.data.error);
    }
    return res.data.data;
  } catch (error) {
    // Don't throw for metrics - it's optional
    console.warn('Metrics fetch failed:', error.message);
    return null;
  }
};

export const fetchServiceSelftest = async (serviceId) => {
  try {
    const res = await api.get(`/health/proxy/${serviceId}/selftest`);
    if (res.data.error) {
      throw new Error(res.data.error);
    }
    return res.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch selftest data');
  }
};

// Alert Rules API
export const getAlertRules = (params = {}) => api.get('/alert-rules', { params });
export const getAlertRule = (id) => api.get(`/alert-rules/${id}`);
export const createAlertRule = (data) => api.post('/alert-rules', data);
export const updateAlertRule = (id, data) => api.put(`/alert-rules/${id}`, data);
export const deleteAlertRule = (id) => api.delete(`/alert-rules/${id}`);

// Reports API
export const getMonthlyReport = (serviceId, month, year, period = null) => {
  const params = { month, year };
  if (period) params.period = period;
  return api.get(`/reports/monthly/${serviceId}`, { params });
};
export const getAllMonthlyReports = (serviceId) => 
  api.get(`/reports/monthly/${serviceId}/all`);

// Debug API
export const testEmail = (email, serviceName) => 
  api.post('/debug/test-email', { email, serviceName });

