import { api } from './client';

export async function getStats() {
  return api.request('/api/admin/stats');
}

export async function getTrends(days = 14) {
  return api.request(`/api/admin/trends?days=${days}`);
}

export async function getOverdue(days = 3) {
  return api.request(`/api/admin/overdue?days=${days}`);
}

export async function adminGetIssues(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return api.request(`/api/admin/issues${s ? `?${s}` : ''}`);
}

export async function getUsers() {
  return api.request('/api/admin/users');
}

export async function setUserRole(id, role) {
  return api.request(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
  });
}

export async function setUserTeam(id, team) {
  return api.request(`/api/admin/users/${id}/team`, {
    method: 'PATCH',
    body: { team },
  });
}

export async function exportCsv() {
  return api.request('/api/admin/export');
}
