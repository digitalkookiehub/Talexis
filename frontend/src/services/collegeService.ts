import api from './api';

export interface CollegeProfile {
  college_name: string | null;
  admin_name: string | null;
  admin_email: string;
  student_count: number;
}

export interface CollegeStudent {
  id: number;
  name: string | null;
  email: string | null;
  branch: string | null;
  department: string | null;
  graduation_year: number | null;
  skills: string[];
  total_interviews: number;
  evaluated_interviews: number;
  readiness_percent: number | null;
  recommendation: string | null;
  talent_visible: boolean;
  resume_uploaded: boolean;
}

export interface CollegeAnalytics {
  college_name: string;
  total_students: number;
  total_interviews: number;
  evaluated_interviews: number;
  avg_score: number;
  readiness_summary: { ready: number; maybe: number; not_ready: number };
  placement_rate: number;
  visible_to_companies: number;
  resume_uploaded: number;
  interviews_by_type: Record<string, number>;
  branch_breakdown: Record<string, number>;
}

export interface PlacementStudent {
  id: number;
  name: string | null;
  branch: string | null;
  graduation_year: number | null;
  interviews_completed: number;
  readiness_percent: number | null;
  recommendation: string | null;
  weak_areas: string[];
  strong_areas: string[];
  visible_to_companies: boolean;
  resume_uploaded: boolean;
}

export interface PlacementData {
  students: PlacementStudent[];
  summary: { ready: number; maybe: number; not_ready: number; no_data: number };
}

export const collegeService = {
  getProfile: () =>
    api.get<CollegeProfile>('/college/profile').then((r) => r.data),

  updateProfile: (college_name: string) =>
    api.put<{ message: string; college_name: string }>(`/college/profile?college_name=${encodeURIComponent(college_name)}`).then((r) => r.data),

  getStudents: (skip = 0, limit = 50) =>
    api.get<{ students: CollegeStudent[]; total: number; college_name: string }>(
      `/college/students?skip=${skip}&limit=${limit}`
    ).then((r) => r.data),

  getAnalytics: () =>
    api.get<CollegeAnalytics>('/college/analytics').then((r) => r.data),

  getPlacements: () =>
    api.get<PlacementData>('/college/placements').then((r) => r.data),

  getCompanies: () =>
    api.get<Array<{ id: number; company_name: string }>>('/jobs').then(() => []).catch(() => []),

  recommend: (studentId: number, companyId: number, message?: string) =>
    api.post(`/college/recommend?student_id=${studentId}&company_id=${companyId}&message=${encodeURIComponent(message ?? '')}`).then((r) => r.data),

  getRecommendations: () =>
    api.get<Array<{ id: number; student_name: string; student_branch: string; company_name: string; message: string; created_at: string }>>('/college/recommendations').then((r) => r.data),

  getActivity: () =>
    api.get<Array<{ id: number; event_type: string; actor_role: string; actor_name: string; description: string; created_at: string }>>('/college/activity').then((r) => r.data),

  getSchedules: () =>
    api.get<CollegeSchedule[]>('/college/schedules').then((r) => r.data),
};

export interface CollegeSchedule {
  id: number;
  student_name: string | null;
  candidate_name: string;
  company_name: string;
  scheduled_at: string | null;
  duration_minutes: number;
  interview_type: string | null;
  status: string;
  college_approval: string;
  interviewer_name: string | null;
  feedback_rating: number | null;
  feedback_notes: string | null;
  feedback_outcome: string | null;
}

export const collegeScheduleActions = {
  approve: (scheduleId: number) =>
    api.post(`/college/schedules/${scheduleId}/approve`).then((r) => r.data),
  decline: (scheduleId: number, reason?: string) =>
    api.post(`/college/schedules/${scheduleId}/decline?reason=${encodeURIComponent(reason ?? '')}`).then((r) => r.data),
};
