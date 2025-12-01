import axios, { AxiosError, AxiosInstance } from 'axios';

// API Base URL - in production, this proxies to the CDN API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Clear zustand persist storage too
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  }

  loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token');
    }
    return this.token;
  }

  getToken() {
    return this.token;
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    if (response.data.success) {
      this.setToken(response.data.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_user', JSON.stringify(response.data.data.user));
        localStorage.setItem('refresh_token', response.data.data.refreshToken);
      }
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    this.clearToken();
  }

  async checkSetup() {
    const response = await this.client.get('/auth/check-setup');
    return response.data;
  }

  async setup(data: { username: string; email: string; password: string; setupKey: string }) {
    const response = await this.client.post('/auth/setup', data);
    return response.data;
  }

  async refreshToken() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await this.client.post('/auth/refresh', { refreshToken });
    if (response.data.success) {
      this.setToken(response.data.data.accessToken);
    }
    return response.data;
  }

  // Dashboard
  async getDashboard() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  // Files
  async getFiles(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/admin/files', { params });
    return response.data;
  }

  async getFile(id: string) {
    const response = await this.client.get(`/admin/files/${id}`);
    return response.data;
  }

  async deleteFile(id: string) {
    const response = await this.client.delete(`/admin/files/${id}`);
    return response.data;
  }

  async uploadFile(file: File, expiresInHours?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (expiresInHours) {
      formData.append('expiresInHours', expiresInHours.toString());
    }

    // Use admin upload endpoint with Bearer auth (already in interceptor)
    const response = await this.client.post('/admin/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Tokens
  async getTokens(params?: { page?: number; limit?: number; fileId?: string }) {
    const response = await this.client.get('/admin/tokens', { params });
    return response.data;
  }

  async createToken(data: { fileId: string; expiresInHours: number; maxDownloads?: number }) {
    const response = await this.client.post('/admin/tokens', data);
    return response.data;
  }

  async revokeToken(id: string) {
    const response = await this.client.delete(`/admin/tokens/${id}`);
    return response.data;
  }

  // Users (superadmin only)
  async getUsers() {
    const response = await this.client.get('/admin/users');
    return response.data;
  }

  async createUser(data: { username: string; email: string; password: string; role: string }) {
    const response = await this.client.post('/admin/users', data);
    return response.data;
  }

  async updateUser(id: string, data: { role?: string; isActive?: boolean }) {
    const response = await this.client.put(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/admin/users/${id}`);
    return response.data;
  }

  // API Keys
  async getAPIKeys() {
    const response = await this.client.get('/admin/api-keys');
    return response.data;
  }

  async createAPIKey(data: { name: string; permissions: string[]; expiresInDays?: number }) {
    const response = await this.client.post('/admin/api-keys', data);
    return response.data;
  }

  async revokeAPIKey(id: string) {
    const response = await this.client.delete(`/admin/api-keys/${id}`);
    return response.data;
  }

  // Logs
  async getAccessLogs(params?: { page?: number; limit?: number; fileId?: string }) {
    const response = await this.client.get('/admin/logs', { params });
    return response.data;
  }

  async getActivityLogs(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/admin/activity', { params });
    return response.data;
  }
}

// Singleton instance
export const api = new APIClient();
