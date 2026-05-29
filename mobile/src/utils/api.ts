import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const leadsApi = {
  getAll: async (params: Record<string, any> = {}) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.patch(`/leads/${id}/status`, { status, notes });
    return response.data;
  },

  bulkUpdateStatus: async (ids: string[], status: string, notes?: string) => {
    const response = await api.post('/leads/bulk-status', { ids, status, notes });
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/leads/${id}/history`);
    return response.data;
  },
};

export const importsApi = {
  upload: async (uri: string, fileName: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: 'text/csv' } as any);
    const response = await api.post('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getBatches: async (params: Record<string, any> = {}) => {
    const response = await api.get('/imports/batches', { params });
    return response.data;
  },
};

export const exportsApi = {
  getFiles: async () => {
    const response = await api.get('/exports/files');
    return response.data;
  },

  getRuns: async (params: Record<string, any> = {}) => {
    const response = await api.get('/exports/runs', { params });
    return response.data;
  },

  quickExport: async () => {
    const response = await api.post('/exports/quick');
    return response.data;
  },

  getDownloadUrl: (filename: string) => `${API_BASE_URL}/exports/download/${filename}`,
};

export const statsApi = {
  getDashboard: async () => {
    const response = await api.get('/stats/dashboard');
    return response.data;
  },
};

export const configApi = {
  get: async () => {
    const response = await api.get('/config');
    return response.data;
  },

  update: async (config: Record<string, any>) => {
    const response = await api.put('/config', config);
    return response.data;
  },
};

export const pipelineApi = {
  getStatus: async () => {
    const response = await api.get('/pipeline/status');
    return response.data;
  },

  run: async () => {
    const response = await api.post('/pipeline/run');
    return response.data;
  },

  ingest: async () => {
    const response = await api.post('/pipeline/ingest');
    return response.data;
  },

  score: async () => {
    const response = await api.post('/pipeline/score');
    return response.data;
  },

  generateNotes: async () => {
    const response = await api.post('/pipeline/generate-notes');
    return response.data;
  },
};

export default api;
