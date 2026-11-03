import { api } from './client';

export async function register({ name, rollNumber, password }) {
  const data = await api.request('/api/auth/register', {
    method: 'POST',
    body: { name, rollNumber, password },
  });
  api.setAuth(data.token, data);
  return data;
}

export async function login({ rollNumber, password }) {
  const data = await api.request('/api/auth/login', {
    method: 'POST',
    body: { rollNumber, password },
  });
  api.setAuth(data.token, data);
  return data;
}

export async function getMe() {
  return api.request('/api/auth/me');
}
