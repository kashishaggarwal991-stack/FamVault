import api from './axios';

export const getPins = () => api.get('/api/pins');

export const pinDocument = (documentId) => api.post('/api/pins', { documentId });

export const unpinDocument = (documentId) => api.delete(`/api/pins/${documentId}`);

export const checkPin = (documentId) => api.get(`/api/pins/check/${documentId}`);
