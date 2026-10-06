import api from './client';

const unwrap = (p) => p.then((r) => r.data);

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).catch(() => {}),
  me: () => unwrap(api.get('/auth/me')),
};
export const usersApi = {
  list: (params) => unwrap(api.get('/users', { params })),
  create: (body) => unwrap(api.post('/users', body)),
  update: (id, body) => unwrap(api.put(`/users/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
};
export const coursesApi = {
  list: (params) => unwrap(api.get('/courses', { params })),
  mine: (params) => unwrap(api.get('/courses/mine', { params })),
  get: (id) => unwrap(api.get(`/courses/${id}`)),
  create: (body) => unwrap(api.post('/courses', body)),
  update: (id, body) => unwrap(api.put(`/courses/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/courses/${id}`)),
  enroll: (id) => unwrap(api.post(`/courses/${id}/enroll`)),
  enrollments: (id) => unwrap(api.get(`/courses/${id}/enrollments`)),
};
export const assignmentsApi = {
  list: (params) => unwrap(api.get('/assignments', { params })),
  byCourse: (courseId) => unwrap(api.get(`/courses/${courseId}/assignments`)),
  create: (courseId, body) => unwrap(api.post(`/courses/${courseId}/assignments`, body)),
  remove: (id) => unwrap(api.delete(`/assignments/${id}`)),
  submit: (id, body) => unwrap(api.post(`/assignments/${id}/submit`, body)),
};
export const submissionsApi = {
  list: (params) => unwrap(api.get('/submissions', { params })),
  evaluate: (id, body) => unwrap(api.put(`/submissions/${id}/evaluate`, body)),
};
export const auditApi = { list: (params) => unwrap(api.get('/audit', { params })) };
