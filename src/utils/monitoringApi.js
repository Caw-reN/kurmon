import axios from 'axios';

/**
 * monitoringApi.js
 * Axios instance for monitoring features — uses the unified backend (port 4174).
 */


const SESSION_KEY = 'school_schedule_session_v1';

const getToken = () => {
  try {
    let raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      raw = localStorage.getItem(SESSION_KEY);
      if (raw) sessionStorage.setItem(SESSION_KEY, raw);
    }
    const session = raw ? JSON.parse(raw) : null;
    return session?.authToken || null;
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: '/api/monitoring',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// REQUEST INTERCEPTOR — attach auth token from unified session
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Siswa
export const siswaAPI = {
  getAll: (params) => api.get('/siswa', { params }),
  getById: (id) => api.get(`/siswa/${id}`),
  importExcel: (formData) =>
    api.post('/siswa/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Absensi
export const absensiAPI = {
  checkIn: (data) => api.post('/absensi/checkin', data),
  checkOut: (data) => api.post('/absensi/checkout', data),
  getRekapSiswa: (siswaId, params) => api.get(`/absensi/rekap/${siswaId}`, { params }),
  getSetting: () => api.get('/absensi/setting'),
  updateSetting: (data) => api.put('/absensi/setting', data),
};

// Jurnal
export const jurnalAPI = {
  create: (data) =>
    api.post('/jurnal', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBySiswa: (siswaId) => api.get(`/jurnal/siswa/${siswaId}`),
  getPending: () => api.get('/jurnal/pending'),
  approve: (id) => api.put(`/jurnal/${id}/approve`),
  reject: (id, catatan) => api.put(`/jurnal/${id}/reject`, { catatan }),
};

// Perusahaan / Tempat PKL
export const perusahaanAPI = {
  getAll: (params) => api.get('/perusahaan', { params }),
  getById: (id) => api.get(`/perusahaan/${id}`),
};

// Lokasi PKL (public)
export const lokasiPublicAPI = {
  getAll: () => axios.get('/api/monitoring/lokasi-pkl/public'),
};

export default api;
