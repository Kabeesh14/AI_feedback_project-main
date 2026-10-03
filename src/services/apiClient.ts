/**
 * Central API Client for FeedbackIQ
 * Automatically attaches JWT Bearer token, resolves base URL via VITE_API_URL,
 * handles status codes (401, 403, 404, 500), and provides typed response wrappers.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://ai-feedback-project-main.onrender.com/api' : 'http://localhost:5000/api')).replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

export const TOKEN_STORAGE_KEY = 'feedbackiq_token';

/**
 * Get current JWT Bearer token
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Set current JWT Bearer token
 */
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.warn('[apiClient] Failed to store token:', err);
  }
}

/**
 * Clear JWT Bearer token
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn('[apiClient] Failed to clear token:', err);
  }
}

/**
 * Event listener helper to notify app when token expires / unauthorized
 */
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

function notifyUnauthorized() {
  clearToken();
  unauthorizedHandlers.forEach(h => {
    try {
      h();
    } catch (err) {
      console.error('[apiClient] Error in unauthorized handler:', err);
    }
  });
}

/**
 * Core request execution
 */
export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, ...customConfig } = options;

  // Build full URL with query parameters
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${BASE_URL}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Attach JWT Bearer token if available
  const token = getToken();
  if (token && !reqHeaders['Authorization']) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...customConfig,
      headers: reqHeaders,
    });
  } catch (netErr: any) {
    console.error('[apiClient Network Error]:', netErr);
    throw new ApiError(
      'Network connection failure. Please verify the backend server is running and reachable.',
      0,
      netErr
    );
  }

  // Handle Unauthorized (401)
  if (response.status === 401) {
    notifyUnauthorized();
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // non-JSON
    }
    const message = errorData?.message || errorData?.error || 'Your session has expired. Please sign in again.';
    throw new ApiError(message, 401, errorData);
  }

  // Parse response payload
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseErr) {
      console.warn('[apiClient] Failed to parse JSON response:', parseErr);
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    if (typeof data === 'object' && data !== null) {
      message = data.message || data.error || `Request failed with status ${response.status}`;
    } else if (typeof data === 'string' && data.length > 0) {
      message = data;
    } else {
      message = response.statusText || `Request failed with status ${response.status}`;
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  getBaseUrl: () => BASE_URL,
  getToken,
  setToken,
  clearToken,
  onUnauthorized,
};

export default apiClient;
