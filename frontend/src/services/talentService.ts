import api from './api';
import type { TalentProfile, CompanyShortlist, ShortlistStatus } from '../types';

export interface TalentListResponse {
  talents: TalentProfile[];
  total: number;
}

export const talentService = {
  browse: (skip = 0, limit = 20) =>
    api.get<TalentListResponse>(`/talents?skip=${skip}&limit=${limit}`).then((r) => r.data),

  getByCode: (code: string) =>
    api.get<TalentProfile>(`/talents/${code}`).then((r) => r.data),

  shortlist: (code: string, notes?: string) =>
    api.post<CompanyShortlist>(`/talents/${code}/shortlist`, { notes }).then((r) => r.data),

  removeFromShortlist: (code: string) =>
    api.delete(`/talents/${code}/shortlist`),

  getShortlist: () =>
    api.get<CompanyShortlist[]>('/talents/shortlist').then((r) => r.data),

  updateShortlistStatus: (id: number, status: ShortlistStatus) =>
    api.put<CompanyShortlist>(`/talents/shortlist/${id}/status`, { status }).then((r) => r.data),

  updateConsent: (consent: boolean) =>
    api.post<{ message: string; visible: boolean }>('/talents/consent', { consent }).then((r) => r.data),
};
