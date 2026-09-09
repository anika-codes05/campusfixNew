import { api } from './client';

export async function register({ name, email, password }) {
  const data = await api.request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  api.setAuth(data.token, data);
  return data;
}

export async function login({ email, password }) {
  const data = await api.request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  api.setAuth(data.token, data);
  return data;
}

export async function getMe() {
  return api.request('/api/auth/me');
}
