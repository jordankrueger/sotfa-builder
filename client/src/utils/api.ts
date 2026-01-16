import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sotfa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sotfa_token');
      localStorage.removeItem('sotfa_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
    role: string;
    shipAssignment?: string;
    taskforceAssignment?: string;
    wikiUsername?: string;
  }) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updatePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// SOTFA API
export const sotfaApi = {
  getCurrent: () => api.get('/sotfa/current'),
  createYear: (year: number, deadline?: string) =>
    api.post('/sotfa/year', { year, deadline }),
  addShip: (data: {
    shipName: string;
    coName?: string;
    coCharacter?: string;
    xoName?: string;
    xoCharacter?: string;
    imageUrl?: string;
    assignedTo?: number;
    deadline?: string;
  }) => api.post('/sotfa/ship', data),
  getSection: (id: number) => api.get(`/sotfa/section/${id}`),
  updateSection: (id: number, data: {
    content?: string;
    status?: string;
    shipReport?: any;
  }) => api.put(`/sotfa/section/${id}`, data),
  submitSection: (id: number) => api.post(`/sotfa/section/${id}/submit`),
  approveSection: (id: number) => api.post(`/sotfa/section/${id}/approve`),
  addComment: (sectionId: number, comment: string) =>
    api.post(`/sotfa/section/${sectionId}/comment`, { comment }),
  generateWikiCode: () => api.get('/sotfa/generate'),
  preview: (sectionType: string, content: any) =>
    api.post('/sotfa/preview', { sectionType, content }),
  getActivity: (limit?: number) =>
    api.get('/sotfa/activity', { params: { limit } }),
};

// AI API
export const aiApi = {
  checkUsage: () => api.get('/ai/usage'),
  generateShipSummary: (data: {
    shipName: string;
    monthlySummaries: string[];
    existingContent?: string;
  }) => api.post('/ai/ship-summary', data),
  generateTaskforceSummary: (data: {
    taskforceName: string;
    activities: string;
    memberCount: number;
  }) => api.post('/ai/taskforce-summary', data),
  improveContent: (content: string, instructions: string) =>
    api.post('/ai/improve', { content, instructions }),
};

// Data API
export const dataApi = {
  getRoster: () => api.get('/data/roster'),
  getShipRoster: (ship: string) => api.get(`/data/roster/${encodeURIComponent(ship)}`),
  getCommandStaff: () => api.get('/data/command-staff'),
  getShips: () => api.get('/data/ships'),
  getStats: (year: number) => api.get(`/data/stats/${year}`),
  getTaskforces: () => api.get('/data/taskforces'),
  getPreviousSOTFA: (year: number) => api.get(`/data/previous-sotfa/${year}`),
  searchWiki: (query: string, limit?: number) =>
    api.get('/data/wiki/search', { params: { q: query, limit } }),
  getWikiPage: (title: string) =>
    api.get(`/data/wiki/page/${encodeURIComponent(title)}`),
};

// Admin API
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  updateUserRole: (id: number, data: {
    role: string;
    shipAssignment?: string;
    taskforceAssignment?: string;
  }) => api.put(`/admin/users/${id}/role`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  getDashboard: () => api.get('/admin/dashboard'),
  updateDeadlines: (sectionDeadlines: { sectionId: number; deadline: string }[]) =>
    api.put('/admin/deadlines', { sectionDeadlines }),
  updateAssignments: (assignments: { sectionId: number; userId: number | null }[]) =>
    api.put('/admin/assignments', { assignments }),
  publish: () => api.post('/admin/publish'),
  exportGDoc: () => api.get('/admin/export/gdoc'),
};
