import api from './axios';

export const checkProtectionStatus = (documentId) =>
  api.get(`/api/documents/${documentId}/protection-status`);

export const verifyDocumentPassword = (documentId, password) =>
  api.post(`/api/documents/${documentId}/verify-password`, { password });

export const setDocumentPassword = (documentId, password) =>
  api.post(`/api/documents/${documentId}/set-password`, { password });

export const removeDocumentPassword = (documentId, password) =>
  api.delete(`/api/documents/${documentId}/remove-password`, { data: { password } });

export const forgotDocumentPassword = (documentId) =>
  api.post(`/api/documents/${documentId}/forgot-password`);

export const resetDocumentPassword = (documentId, otp, newPassword, confirmPassword) =>
  api.post(`/api/documents/${documentId}/reset-password`, {
    otp,
    newPassword,
    confirmPassword,
  });

export const fetchProtectedDocument = (documentId, accessToken) =>
  api.get(`/api/documents/${documentId}`, {
    headers: accessToken ? { 'x-doc-access-token': accessToken } : {},
  });
