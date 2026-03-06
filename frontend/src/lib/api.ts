import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('[API INTERCEPTOR 401] Redirecting to login! URL:', error.config?.url);
            // Token expired or invalid - clear auth and redirect to login
            // localStorage.removeItem('auth_token');
            // localStorage.removeItem('user');
            // window.location.href = '/login'; // Temporarily disabled for debugging
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: async (email: string, password: string) => {
        const response = await api.post('/auth/register', { email, password });
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success && response.data.data.token) {
            localStorage.setItem('auth_token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        return response.data;
    },

    verifyEmail: async (token: string) => {
        const response = await api.get(`/auth/verify-email/${token}`);
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    logout: async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    },

    requestPasswordReset: async (email: string) => {
        const response = await api.post('/auth/request-password-reset', { email });
        return response.data;
    },

    resetPassword: async (token: string, newPassword: string) => {
        const response = await api.post('/auth/reset-password', { token, newPassword });
        return response.data;
    },
};

// Leads API
export const leadsAPI = {
    getColumns: () =>
        api.get('/leads/columns').then(res => res.data),

    ingestLead: (data: any) =>
        api.post('/leads/ingest', data).then(res => res.data),

    moveLead: (id: string, to_column_id: string, notes?: string) =>
        api.post(`/leads/${id}/move`, { to_column_id, notes }).then(res => res.data),

    getLeadDetails: (id: string) =>
        api.get(`/leads/${id}`).then(res => res.data),

    batchCreateLeads: (leads: any[]) =>
        api.post('/leads/batch', { leads }).then(res => res.data),

    getSegments: (type: string, value: string) =>
        api.get('/leads/segments', { params: { type, value } }).then(res => res.data),

    deleteLead: (id: string) =>
        api.delete(`/leads/${id}`).then(res => res.data),

    assignLead: (id: string, sdr_id: string, cadence_name: string) =>
        api.post(`/leads/${id}/assign`, { sdr_id, cadence_name }).then(res => res.data),

    getCadenceStats: () =>
        api.get('/leads/cadence/stats').then(res => res.data),

    resetLeadsToPending: () =>
        api.post('/leads/cadence/reset').then(res => res.data),

    applyCadenceBulk: (cadence_name: string, filter_type: string, filter_value?: string) =>
        api.post('/leads/cadence/apply', { cadence_name, filter_type, filter_value }).then(res => res.data),

    getTags: () =>
        api.get('/leads/tags').then(res => res.data),

    getLeadsPreview: (filter_type: string, filter_value?: string, limit = 20) =>
        api.get('/leads/preview', { params: { filter_type, filter_value, limit } }).then(res => res.data),

    getAllSDRs: () =>
        api.get('/leads/sdrs').then(res => res.data),

    bulkAssignWithCadence: (cadence_name: string, filter_type: string, filter_value: string | undefined, sdr_assignments: Array<{ sdr_id: string; percentage: number }>, scheduling_rule: string) =>
        api.post('/leads/cadence/bulk-assign', { cadence_name, filter_type, filter_value, sdr_assignments, scheduling_rule }).then(res => res.data),

    updateLead: (id: string, data: Partial<any>) =>
        api.patch(`/leads/${id}`, data).then(res => res.data),

    getActiveLeads: (sdr_id?: string, tags?: string, status?: string) =>
        api.get('/leads/active', { params: { sdr_id, tags, status } }).then(res => res.data),

    bulkUpdateLeads: (action: 'pause' | 'resume' | 'unassign', lead_ids: string[]) =>
        api.post('/leads/bulk-action', { action, lead_ids }).then(res => res.data),

    scheduleNextContact: (id: string, data: { scheduled_at: string; sdr_id?: string; type?: string; notes?: string }) =>
        api.post(`/leads/${id}/schedule`, data).then(res => res.data),
};

// Notifications API
export const notificationsAPI = {
    getNotifications: () =>
        api.get('/notifications').then(res => res.data),

    markAsRead: (id: string) =>
        api.post(`/notifications/${id}/read`).then(res => res.data),
};

// Templates API
export const templatesAPI = {
    getChatbotTemplates: () =>
        api.get('/templates/chatbot').then(res => res.data),

    getEmailTemplates: () =>
        api.get('/templates/email').then(res => res.data),

    getTemplateById: (type: 'chatbot' | 'email', id: string) =>
        api.get(`/templates/${type}/${id}`).then(res => res.data),
};

// Stats API
export const statsAPI = {
    getStats: () =>
        api.get('/stats').then(res => res.data),

    updateActivity: (type: 'call' | 'email' | 'whatsapp') => {
        const userStr = localStorage.getItem('user');
        const sdr_id = userStr ? JSON.parse(userStr).id : undefined;
        return api.post('/stats/activity', { type, sdr_id }).then(res => res.data);
    },

    incrementCompleted: () =>
        api.post('/stats/complete').then(res => res.data),

    resetStats: () =>
        api.post('/stats/reset').then(res => res.data),

    getGlobalStats: () =>
        api.get('/stats/global').then(res => res.data),

    getReportConfig: () =>
        api.get('/stats/config').then(res => res.data),

    updateReportConfig: (data: any) =>
        api.put('/stats/config', data).then(res => res.data),
};

// Aurora Chat API
export const auroraAPI = {
    getTemplates: (limit = 10) =>
        api.get('/aurora/templates', { params: { limit } }).then(res => res.data),

    getTemplateById: (id: string) =>
        api.get(`/aurora/templates/${id}`).then(res => res.data),

    sendCampaign: (campaignId: string, phoneNumber: string, auroraUserId: string, clientData?: any) =>
        api.post('/aurora/send', { campaignId, phoneNumber, auroraUserId, clientData }).then(res => res.data),
};

// AI API
export const aiAPI = {
    structureLeads: (leads: any[]) =>
        api.post('/ai/structure-leads', { leads }).then(res => res.data),

    analyzeSales: (data: any, query: string) =>
        api.post('/ai/analyze', { data, query }).then(res => res.data),

    exportToMattermost: (content: string) =>
        api.post('/ai/export/mattermost', { content }).then(res => res.data),

    exportOpportunity: (lead: any, notes: string) =>
        api.post('/ai/export/opportunity', { lead, notes }).then(res => res.data),

    normalizePhone: (phone: string) =>
        api.post('/ai/normalize-phone', { phone }).then(res => res.data),
};

// Users & Invites API
export const usersAPI = {
    getUsers: () => api.get('/users').then(res => res.data),
    createInvite: (data: { email: string; name: string; role: string }) =>
        api.post('/users/invites', data).then(res => res.data),
    listInvites: () => api.get('/users/invites').then(res => res.data),
    revokeInvite: (id: string) => api.delete(`/users/invites/${id}`).then(res => res.data),
    deleteUser: (id: string) => api.delete(`/users/${id}`).then(res => res.data),
    updateUserRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }).then(res => res.data),
    saveIntegrations: (id: string, integrations: any) => api.post(`/users/${id}/integrations`, integrations).then(res => res.data),
};

export default api;

