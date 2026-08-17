import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
    let usrStr = localStorage.getItem('user');
    const u = JSON.parse(usrStr || 'null');

    if (u && u.token) {
        config.headers.Authorization = `Bearer ${u.token}`;
    }
    return config;
});

api.interceptors.response.use(
    (resp) => resp,
    (err) => {
        if (err.response && err.response.status === 401) {
            // unauthorized
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;
