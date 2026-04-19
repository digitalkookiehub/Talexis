import api from './api';
import type { Company, JobRole } from '../types';

export const companyService = {
  getProfile: () => api.get<Company>('/companies/profile').then((r) => r.data),

  createProfile: (data: Partial<Company>) =>
    api.post<Company>('/companies/profile', data).then((r) => r.data),

  updateProfile: (data: Partial<Company>) =>
    api.put<Company>('/companies/profile', data).then((r) => r.data),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ message: string; path: string }>('/companies/profile/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  createJob: (data: Partial<JobRole>) =>
    api.post<JobRole>('/jobs', data).then((r) => r.data),

  listJobs: () => api.get<JobRole[]>('/jobs').then((r) => r.data),

  getJob: (id: number) => api.get<JobRole>(`/jobs/${id}`).then((r) => r.data),

  updateJob: (id: number, data: Partial<JobRole>) =>
    api.put<JobRole>(`/jobs/${id}`, data).then((r) => r.data),

  deleteJob: (id: number) => api.delete(`/jobs/${id}`),

  runMatching: (jobId: number) =>
    api.post(`/matching/run/${jobId}`).then((r) => r.data),

  getMatchResults: (jobId: number) =>
    api.get(`/matching/${jobId}/results`).then((r) => r.data),
};
