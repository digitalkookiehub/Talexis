import api from './api';
import type { User, UserRole } from '../types';

export interface PlatformStats {
  total_users: number;
  students: number;
  companies: number;
  total_interviews: number;
}

export interface PlatformAnalytics {
  total_users: number;
  total_interviews: number;
  evaluated_interviews: number;
  platform_avg_score: number;
  users_by_role: Record<string, number>;
}

export const adminService = {
  listUsers: (role?: UserRole, skip = 0, limit = 50) => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    params.set('skip', String(skip));
    params.set('limit', String(limit));
    return api.get<User[]>(`/admin/users?${params}`).then((r) => r.data);
  },

  updateUser: (userId: number, data: { is_active?: boolean; role?: UserRole }) =>
    api.put<User>(`/admin/users/${userId}`, null, { params: data }).then((r) => r.data),

  deactivateUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),

  getStats: () =>
    api.get<PlatformStats>('/admin/stats').then((r) => r.data),

  getAnalytics: () =>
    api.get<PlatformAnalytics>('/analytics/platform').then((r) => r.data),
};
