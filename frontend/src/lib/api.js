const API_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'API Request failed');
    }

    return data;
};

export const apiGet = (endpoint, options) => apiFetch(endpoint, { method: 'GET', ...options });
export const apiPost = (endpoint, body, options) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body), ...options });
export const apiPut = (endpoint, body, options) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options });
export const apiDelete = (endpoint, options) => apiFetch(endpoint, { method: 'DELETE', ...options });
