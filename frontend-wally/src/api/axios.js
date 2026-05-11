import axios from 'axios';

const api = axios.create({
    baseURL: 'http://35.226.123.121:8000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- NUEVA PIEZA: El "Buscador" para el Caché de SWR ---
export const fetcher = async (url) => {
    if (!url) return null; // Pausa SWR si no hay ruta

    const response = await api.get(url);
    // Si tu backend manda { datos: [...] }, sacamos solo esa parte. 
    // Si no, devolvemos todo normal.
    return response.data.datos ? response.data.datos : response.data;
};

export default api;