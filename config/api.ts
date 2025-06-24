// config/api.ts

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Mobile API client for PropertPro backend.
 * Mirrors the web API endpoints but uses token-based auth via AsyncStorage.
 */

const API_BASE_URL = 'https://api.propertpro.com/api'; 
// Ensure this matches your backend production URL + '/api' prefix if used.
// If your endpoints live directly under the host (without '/api'), adjust accordingly.

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token from AsyncStorage if present.
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        if (config.headers) {
          // Mutate existing headers object
          (config.headers as any).Authorization = `Bearer ${token}`;
        } else {
          // Initialize headers if missing
          config.headers = { Authorization: `Bearer ${token}` } as any;
        }
      }
    } catch (e) {
      console.warn('Error reading token from storage', e);
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor: log errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

/**
 * Helper to ensure endpoint strings have a leading slash and trailing slash if the backend expects it.
 * Adjust or remove trailing slash logic if your backend does not require trailing slashes.
 */
const formatEndpoint = (ep: string): string => {
  let clean = ep.replace(/^\/+/, ''); // remove leading slashes
  if (clean.includes('?')) {
    const [path, query] = clean.split('?');
    const p = path.endsWith('/') ? path : path + '/';
    return `/${p}?${query}`;
  }
  return '/' + (clean.endsWith('/') ? clean : clean + '/');
};

/**
 * Wrapper functions for API calls
 */
export const apiGet = <T = any>(endpoint: string, config?: AxiosRequestConfig) =>
  apiClient.get<T>(formatEndpoint(endpoint), config);

export const apiPost = <T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
  apiClient.post<T>(formatEndpoint(endpoint), data, config);

export const apiPut = <T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
  apiClient.put<T>(formatEndpoint(endpoint), data, config);

export const apiDelete = <T = any>(endpoint: string, config?: AxiosRequestConfig) =>
  apiClient.delete<T>(formatEndpoint(endpoint), config);

export const apiFormPost = <T = any>(
  endpoint: string,
  formData: FormData,
  config?: AxiosRequestConfig
) =>
  apiClient.post<T>(formatEndpoint(endpoint), formData, {
    ...config,
    headers: {
      ...(config?.headers as any),
      'Content-Type': 'multipart/form-data',
    },
  });

export const apiFormPut = <T = any>(
  endpoint: string,
  formData: FormData,
  config?: AxiosRequestConfig
) =>
  apiClient.put<T>(formatEndpoint(endpoint), formData, {
    ...config,
    headers: {
      ...(config?.headers as any),
      'Content-Type': 'multipart/form-data',
    },
  });

/**
 * API methods grouping, mirroring web api.ts structure
 */
export const api = {
  // Generic get/post if needed
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  formPost: apiFormPost,
  formPut: apiFormPut,

  // Authentication endpoints
  auth: {
    /**
     * Login: expects credentials, returns JSON with tokens/ user data.
     * Example: { access_token: "...", refresh_token: "...", user: { ... } }
     * After calling, mobile should store access_token in AsyncStorage under 'access_token'.
     */
    login: (credentials: Record<string, any>) =>
      apiPost('users/login', credentials).then(res => res.data),

    /**
     * Register: similar to login flow, adjust as backend returns.
     */
    register: (data: Record<string, any>) =>
      apiPost('users/register', data).then(res => res.data),

    /**
     * Logout: if backend invalidates token or session.
     * May require sending token; adjust depending on backend behavior.
     */
    logout: () =>
      apiPost('users/logout').then(res => res.data),

    /**
     * Refresh token: if backend issues refresh tokens.
     * Mobile can call to get a new access token; then store it again.
     */
    refreshToken: () =>
      apiPost('users/refresh').then(res => res.data),

    /**
     * Get current user profile (protected).
     */
    getUser: () =>
      apiGet('users/get_user').then(res => res.data),

    /**
     * Update profile: expects data object or FormData depending on backend.
     */
    updateProfile: (data: any) =>
      apiPut('users/profile', data).then(res => res.data),

    /**
     * Get public profile by username (if applicable).
     */
    getPublicProfile: (username: string) =>
      apiGet(`users/profiles/${username}`).then(res => res.data),
  },

  // Property-related endpoints
  properties: {
    /**
     * List all properties or with filters.
     * Example: api.properties.list({ page:1, page_size:12, someFilter: 'value' })
     */
    list: (params?: Record<string, any>) =>
      apiGet<{ results?: any[] }>('properties', { params })
        .then(res => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray((d as any).results)) return (d as any).results;
          return [];
        }),

    /**
     * Get property by ID
     */
    getById: (id: number | string) =>
      apiGet(`properties/${id}`).then(res => res.data),

    /**
     * Create new property: expects FormData if uploading images; else JSON.
     */
    create: (fd: FormData) =>
      apiFormPost('properties/create_property', fd).then(res => res.data),

    /**
     * Update existing property: expects FormData or JSON.
     */
    update: (id: number | string, fd: FormData) =>
      apiFormPut(`properties/${id}`, fd).then(res => res.data),

    /**
     * Delete property by ID
     */
    delete: (id: number | string) =>
      apiDelete(`properties/${id}`).then(res => res.data),

    /**
     * Get properties belonging to current (authenticated) user
     */
    myProperties: () =>
      apiGet('properties/my-properties')
        .then(res => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray((d as any).results)) return (d as any).results;
          return [];
        }),

    /**
     * Buy endpoint with pagination metadata
     */
    buy: (params?: Record<string, any>) =>
      apiGet<{ count: number; next: string | null; previous: string | null; results: any[] }>(
        'properties/buy',
        { params }
      ).then(res => {
        const d = res.data;
        return {
          results: Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : [],
          count: d.count || (Array.isArray(d) ? d.length : 0),
          next: d.next,
          previous: d.previous,
        };
      }),

    /**
     * Rent endpoint with pagination metadata
     */
    rent: (params?: Record<string, any>) =>
      apiGet<{ count: number; next: string | null; previous: string | null; results: any[] }>(
        'properties/rent',
        { params }
      ).then(res => {
        const d = res.data;
        return {
          results: Array.isArray(d.results) ? d.results : [],
          count: d.count || 0,
          next: d.next,
          previous: d.previous,
        };
      }),

    /**
     * Featured properties endpoint with pagination metadata
     */
    featured: (params?: { page?: number; page_size?: number }) =>
      apiGet<{ count: number; next: string | null; previous: string | null; results: any[] }>(
        'properties/featured',
        { params }
      ).then(res => {
        const d = res.data;
        return {
          results: Array.isArray(d.results) ? d.results : [],
          count: d.count || 0,
          next: d.next,
          previous: d.previous,
        };
      }),

    /**
     * Get a specific property of a specific user: adjust path if needed
     */
    getUserProp: (username: string, pid: number | string) =>
      apiGet(`properties/${username}/property/${pid}`).then(res => res.data),

    getUserProperty: (username: string, pid: number | string) =>
      apiGet(`properties/${username}/property/${pid}`).then(res => res.data),

    /**
     * Get all properties of a specific user
     */
    getUserProps: (username: string) =>
      apiGet(`properties/${username}/properties`).then(res => res.data),

    /**
     * Get favorites of current user
     */
    myFavorites: () =>
      apiGet('properties/my-favourites')
        .then(res => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray((d as any).results)) return (d as any).results;
          return [];
        }),

    /**
     * Toggle favorite status for a property ID
     */
    toggleFavorite: (pid: number | string) =>
      apiPost(`properties/${pid}/favourite`).then(res => res.data),
  },

  // Admin-related endpoints (if needed in mobile; include only if mobile admin users exist)
  admin: {
    getProperties: () =>
      apiGet('properties/api_admin/dashboard/properties').then(res => res.data),
    createProperty: (fd: FormData) =>
      apiFormPost('properties/api_admin/create-property', fd).then(res => res.data),
    getUserProps: () =>
      apiGet('properties/api_admin/properties').then(res => res.data),
  },
};

export default api;
