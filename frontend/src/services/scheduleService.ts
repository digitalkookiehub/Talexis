import api from './api';

export interface ScheduledInterview {
  id: number;
  company_id: number;
  candidate_type: 'platform' | 'external';
  talent_profile_id: number | null;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  job_role_id: number | null;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: string | null;
  interviewer_name: string | null;
  meeting_link: string | null;
  status: 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
  notes: string | null;
  reschedule_reason: string | null;
  college_approval: 'pending' | 'approved' | 'declined' | 'not_required';
  feedback_rating: number | null;
  feedback_notes: string | null;
  feedback_outcome: 'hire' | 'next_round' | 'reject' | null;
  created_at: string | null;
}

export interface ScheduleCreateRequest {
  candidate_type: string;
  talent_profile_id?: number;
  candidate_name: string;
  candidate_email?: string;
  candidate_phone?: string;
  job_role_id?: number;
  scheduled_at: string;
  duration_minutes?: number;
  interview_type?: string;
  interviewer_name?: string;
  meeting_link?: string;
  notes?: string;
}

export const scheduleService = {
  create: (data: ScheduleCreateRequest) =>
    api.post<ScheduledInterview>('/schedules', data).then((r) => r.data),

  list: (status?: string, candidateType?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (candidateType) params.set('candidate_type', candidateType);
    return api.get<{ schedules: ScheduledInterview[]; total: number }>(`/schedules?${params}`).then((r) => r.data);
  },

  update: (id: number, data: Partial<ScheduleCreateRequest> & { reschedule_reason?: string }) =>
    api.put<ScheduledInterview>(`/schedules/${id}`, data).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    api.post<ScheduledInterview>(`/schedules/${id}/cancel?reason=${encodeURIComponent(reason ?? '')}`).then((r) => r.data),

  complete: (id: number) =>
    api.post<ScheduledInterview>(`/schedules/${id}/complete`).then((r) => r.data),

  submitFeedback: (id: number, data: { rating: number; notes?: string; outcome: string }) =>
    api.post<ScheduledInterview>(`/schedules/${id}/feedback`, data).then((r) => r.data),
};
