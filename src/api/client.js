import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('crprs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || 'Network error';
    if (error.response?.status === 401) {
      localStorage.removeItem('crprs_token');
      localStorage.removeItem('crprs_user');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;