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
  fileId: string;
  fileName?: string;
  expiresAt: string;
  maxDownloads: number;
  downloadCount: number;
  remainingDownloads?: number;
  isRevoked: boolean;
  isExpired: boolean;
  isValid: boolean;
  createdAt: string;
  downloadUrl: string;
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
    totalSizeMB: number;
  };
  tokens: {
    total: number;
    active: number;
    totalDownloads: number;
  };
  access: {
    totalRequests: number;
    downloads: number;
    uploads: number;
    uniqueIPs: number;
  };
  recentActivity: RecentActivity[];
  topFiles: TopFile[];
}

export interface RecentActivity {
  id: string;
  action: string;
  fileName: string;
  ipAddress: string;
  statusCode: number;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  token_id: string | null;
  file_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
  file_name?: string;
  file?: CDNFile;
}

export interface TopFile {
  id: string;
  original_name: string;
  access_count: number;
  unique_visitors: number;
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
