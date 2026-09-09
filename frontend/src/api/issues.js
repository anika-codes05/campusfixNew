import { api } from './client';

export async function getIssues(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return api.request(`/api/issues${s ? `?${s}` : ''}`);
}

export async function getIssue(id) {
  return api.request(`/api/issues/${id}`);
}

export async function getMyReports() {
  return api.request('/api/issues/my-reports');
}

export async function createIssue(formData) {
  return api.request('/api/issues', {
    method: 'POST',
    body: formData,
    isForm: true,
  });
}

export async function checkDuplicate({ lat, lng, category }) {
  return api.request('/api/issues/check-duplicate', {
    method: 'POST',
    body: { lat, lng, category },
  });
}

export async function toggleUpvote(id) {
  return api.request(`/api/issues/${id}/upvote`, { method: 'POST' });
}

export async function updateStatus(id, status) {
  return api.request(`/api/issues/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function updatePriority(id, priority) {
  return api.request(`/api/issues/${id}/priority`, {
    method: 'PATCH',
    body: { priority },
  });
}

export async function assignIssue(id, assignedTo) {
  return api.request(`/api/issues/${id}/assign`, {
    method: 'PATCH',
    body: { assignedTo },
  });
}

export async function addComment(id, text) {
  return api.request(`/api/issues/${id}/comments`, {
    method: 'POST',
    body: { text },
  });
}

export async function addNote(id, note) {
  return api.request(`/api/issues/${id}/notes`, {
    method: 'POST',
    body: { note },
  });
}

export async function confirmResolved(id) {
  return api.request(`/api/issues/${id}/confirm-resolved`, { method: 'POST' });
}

export async function reopenIssue(id) {
  return api.request(`/api/issues/${id}/reopen`, { method: 'POST' });
}

export async function subscribe(id) {
  return api.request(`/api/issues/${id}/subscribe`, { method: 'POST' });
}

export async function deleteIssue(id) {
  return api.request(`/api/issues/${id}`, { method: 'DELETE' });
}
