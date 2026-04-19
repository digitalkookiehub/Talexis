import api from './api';
import type { TalentProfile, CompanyShortlist, ShortlistStatus } from '../types';

export interface TalentDetail {
  id: number;
  candidate_code: string;
  recommendation: string | null;
  skill_scores: Record<string, number>;
  risk_indicators: string[];
  last_updated: string | null;
  total_interviews: number;
  types_completed: string[];
  interview_summaries: Array<{
    type: string;
    difficulty: string;
    score: number | null;
    target_role: string | null;
    target_industry: string | null;
    date: string | null;
    summary: string | null;
  }>;
  score_trend: Array<{ score: number; type: string; date: string }>;
  resume_skills: string[];
  resume_education: Array<{ degree: string | null; institution: string | null; year: string | null }>;
  resume_experience_roles: string[];
  readiness: { overall_percent: number; weak_areas: string[]; strong_areas: string[] } | null;
  profile: {
    college_name: string | null;
    branch: string | null;
    department: string | null;
    graduation_year: number | null;
    skills: string[];
    interests: string[];
  };
}

export interface TalentListResponse {
  talents: TalentProfile[];
  total: number;
}

export const talentService = {
  browse: (skip = 0, limit = 20) =>
    api.get<TalentListResponse>(`/talents?skip=${skip}&limit=${limit}`).then((r) => r.data),

  getByCode: (code: string) =>
    api.get<TalentProfile>(`/talents/${code}`).then((r) => r.data),

  getDetail: (code: string) =>
    api.get<TalentDetail>(`/talents/${code}/detail`).then((r) => r.data),

  shortlist: (code: string, notes?: string) =>
    api.post<CompanyShortlist>(`/talents/${code}/shortlist`, { notes }).then((r) => r.data),

  removeFromShortlist: (code: string) =>
    api.delete(`/talents/${code}/shortlist`),

  getShortlist: () =>
    api.get<CompanyShortlist[]>('/talents/shortlist').then((r) => r.data),

  updateShortlistStatus: (id: number, status: ShortlistStatus) =>
    api.put<CompanyShortlist>(`/talents/shortlist/${id}/status`, { status }).then((r) => r.data),

  updateShortlistNotes: (id: number, notes: string) =>
    api.put<CompanyShortlist>(`/talents/shortlist/${id}/notes?notes=${encodeURIComponent(notes)}`).then((r) => r.data),

  getConsentStatus: () =>
    api.get<{ consent_given: boolean; is_visible: boolean; candidate_code: string | null }>('/talents/consent/status').then((r) => r.data),

  getReadinessRequirements: () =>
    api.get<{ requirements: Array<{ key: string; label: string; met: boolean; detail: string }>; all_met: boolean }>('/talents/readiness-requirements').then((r) => r.data),

  updateConsent: (consent: boolean) =>
    api.post<{ message: string; visible: boolean }>('/talents/consent', { consent }).then((r) => r.data),
};
