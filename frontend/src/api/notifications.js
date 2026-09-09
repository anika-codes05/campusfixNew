import { api } from './client';

export async function getNotifications() {
  return api.request('/api/notifications');
}

export async function markRead(id) {
  return api.request(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead() {
  return api.request('/api/notifications/read-all', { method: 'POST' });
}
