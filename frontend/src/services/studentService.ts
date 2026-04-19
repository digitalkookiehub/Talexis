import api from './api';
import type { StudentProfile } from '../types';

export interface ResumeScreening {
  overall_score?: number;
  category_scores?: {
    completeness: number;
    clarity: number;
    skills_relevance: number;
    experience_quality: number;
    overall_polish: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: Array<{
    section: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  missing_sections?: string[];
  summary?: string;
  error?: string;
  details?: string;
}

export const studentService = {
  getProfile: () => api.get<StudentProfile>('/students/profile').then((r) => r.data),

  createProfile: (data: Partial<StudentProfile>) =>
    api.post<StudentProfile>('/students/profile', data).then((r) => r.data),

  updateProfile: (data: Partial<StudentProfile>) =>
    api.put<StudentProfile>('/students/profile', data).then((r) => r.data),

  uploadProfilePicture: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ message: string; path: string }>('/students/profile/picture', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ message: string; path: string }>('/students/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  parseResume: () =>
    api.post<{ message: string; data: Record<string, unknown> }>('/students/resume/parse').then((r) => r.data),

  screenResume: () =>
    api.post<ResumeScreening>('/students/resume/screen').then((r) => r.data),

  getParsedResume: () =>
    api.get<{ parsed_resume: Record<string, unknown> | null }>('/students/resume/parsed').then((r) => r.data),

  getSkills: () => api.get('/students/skills').then((r) => r.data),

  getDashboard: () =>
    api.get<{ profile_complete: boolean; resume_uploaded: boolean; total_interviews: number; baseline_score: number | null }>(
      '/students/dashboard'
    ).then((r) => r.data),

  getInterviewSuggestions: () =>
    api.get<{ roles: string[]; industries: string[]; has_profile_data: boolean }>(
      '/students/interview-suggestions'
    ).then((r) => r.data),
};
