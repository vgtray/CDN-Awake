// ========================================
// CDN Dashboard Types
// ========================================

// User & Auth
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'superadmin';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AdminUser;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Files
export interface CDNFile {
  id: string;
  original_name: string;
  filename: string;
  mime_type: string;
  size: number;
  checksum: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  download_count?: number;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    checksum: string;
  };
}

// Tokens
export interface AccessToken {
  id: string;
  token: string;
  file_id: string;
  expires_at: string;
  max_downloads: number;
  download_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  file?: CDNFile;
}

export interface CreateTokenRequest {
  fileId: string;
  expiresInHours: number;
  maxDownloads?: number;
}

// API Keys
export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  files: {
    total: number;
    totalSize: number;
    avgSize: number;
    byType: Record<string, number>;
  };
  tokens: {
    total: number;
    active: number;
    expired: number;
  };
  logs: {
    total: number;
    today: number;
    thisWeek: number;
  };
  recentLogs: AccessLog[];
  topFiles: TopFile[];
}

export interface AccessLog {
  id: string;
  token_id: string;
  file_id: string;
  ip_address: string;
  user_agent: string;
  accessed_at: string;
  file?: CDNFile;
}

export interface TopFile {
  file_id: string;
  download_count: number;
  file?: CDNFile;
}

// Activity Logs
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  admin_user?: AdminUser;
}

// API Response wrapper
export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
