import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('interakt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('interakt_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/refresh`,
              { refreshToken },
            );
            if (refreshRes.data?.success && refreshRes.data?.data) {
              const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
              localStorage.setItem('interakt_token', accessToken);
              localStorage.setItem('interakt_refresh_token', newRefresh);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          } catch {
            localStorage.removeItem('interakt_token');
            localStorage.removeItem('interakt_refresh_token');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } else {
          // No token available on a protected endpoint
          localStorage.removeItem('interakt_token');
          localStorage.removeItem('interakt_refresh_token');
          if (
            window.location.pathname !== '/login' &&
            window.location.pathname !== '/register'
          ) {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  },
);
