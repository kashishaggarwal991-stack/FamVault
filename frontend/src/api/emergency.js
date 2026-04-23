import api from './axios';

export const getEmergencyDocs = () => api.get('/api/emergency');

export const addToEmergency = (documentId) =>
  api.post('/api/emergency/add', { documentId });

export const removeFromEmergency = (documentId) =>
  api.delete(`/api/emergency/${documentId}`);

export const checkEmergency = (documentId) =>
  api.get(`/api/emergency/check/${documentId}`);