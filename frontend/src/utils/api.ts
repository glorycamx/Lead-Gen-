import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Leads API
export const leadsApi = {
  getAll: async (params: Record<string, any> = {}) => {
    const response = await api.get('/leads', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.patch(`/leads/${id}/status`, { status, notes })
    return response.data
  },

  bulkUpdateStatus: async (ids: string[], status: string, notes?: string) => {
    const response = await api.post('/leads/bulk-status', { ids, status, notes })
    return response.data
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/leads/${id}/history`)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  }
}

// Imports API
export const importsApi = {
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  preview: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  process: async (filePath: string, columnMapping?: Record<string, string>) => {
    const response = await api.post('/imports/process', { filePath, columnMapping })
    return response.data
  },

  getBatches: async (params: Record<string, any> = {}) => {
    const response = await api.get('/imports/batches', { params })
    return response.data
  },

  getBatch: async (id: string) => {
    const response = await api.get(`/imports/batches/${id}`)
    return response.data
  }
}

// Exports API
export const exportsApi = {
  getFiles: async () => {
    const response = await api.get('/exports/files')
    return response.data
  },

  download: (filename: string) => {
    window.open(`/api/exports/download/${filename}`, '_blank')
  },

  createManual: async (options: Record<string, any> = {}) => {
    const response = await api.post('/exports/manual', options)
    return response.data
  },

  getRuns: async (params: Record<string, any> = {}) => {
    const response = await api.get('/exports/runs', { params })
    return response.data
  },

  preview: async () => {
    const response = await api.get('/exports/preview')
    return response.data
  },

  quickExport: async () => {
    const response = await api.post('/exports/quick')
    return response.data
  }
}

// Stats API
export const statsApi = {
  getDashboard: async () => {
    const response = await api.get('/stats/dashboard')
    return response.data
  },

  getScoring: async () => {
    const response = await api.get('/stats/scoring')
    return response.data
  },

  getSources: async () => {
    const response = await api.get('/stats/sources')
    return response.data
  },

  getActions: async () => {
    const response = await api.get('/stats/actions')
    return response.data
  },

  getPropertyTypes: async () => {
    const response = await api.get('/stats/property-types')
    return response.data
  }
}

// Config API
export const configApi = {
  get: async () => {
    const response = await api.get('/config')
    return response.data
  },

  update: async (config: Record<string, any>) => {
    const response = await api.put('/config', config)
    return response.data
  },

  updateTargeting: async (targeting: Record<string, any>) => {
    const response = await api.patch('/config/targeting', targeting)
    return response.data
  },

  updateFilters: async (filters: Record<string, any>) => {
    const response = await api.patch('/config/filters', filters)
    return response.data
  },

  updateScoring: async (scoring: Record<string, any>) => {
    const response = await api.patch('/config/scoring', scoring)
    return response.data
  },

  getCounties: async () => {
    const response = await api.get('/config/counties')
    return response.data
  }
}

// Pipeline API
export const pipelineApi = {
  getStatus: async () => {
    const response = await api.get('/pipeline/status')
    return response.data
  },

  run: async () => {
    const response = await api.post('/pipeline/run')
    return response.data
  },

  ingest: async () => {
    const response = await api.post('/pipeline/ingest')
    return response.data
  },

  score: async () => {
    const response = await api.post('/pipeline/score')
    return response.data
  },

  generateNotes: async () => {
    const response = await api.post('/pipeline/generate-notes')
    return response.data
  }
}

export default api
