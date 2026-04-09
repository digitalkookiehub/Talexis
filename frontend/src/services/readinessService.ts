import api from './api';
import type { PlacementReadiness } from '../types';

export interface ReadinessHistoryItem {
  readiness_percent: number;
  calculated_at: string;
}

export const readinessService = {
  get: () => api.get<PlacementReadiness>('/readiness/me').then((r) => r.data),

  calculate: () => api.post<PlacementReadiness>('/readiness/calculate').then((r) => r.data),

  history: () => api.get<ReadinessHistoryItem[]>('/readiness/history').then((r) => r.data),
};
