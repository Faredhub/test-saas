// Shared types used across the application

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
};

// Session user type augmented with tenant info
export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
};
