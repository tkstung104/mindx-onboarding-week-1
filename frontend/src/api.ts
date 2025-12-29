import axios from 'axios';

// Initialize an Axios instance
const api = axios.create({
  // Use relative path to work with Ingress on AKS
  // Frontend will call API through the same domain, Ingress will route /api to API service
  baseURL: '/api',
});

// Use Interceptor to intercept before request is sent
api.interceptors.request.use((config) => {
  // Get the "passport" (Token) from browser storage
  const token = localStorage.getItem('token'); 
  
  if (token) {
    // Automatically attach Token to Authorization Header in Bearer format
    // This is the step you did manually in Headers earlier!
    config.headers.Authorization = `Bearer ${token}`; 
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;