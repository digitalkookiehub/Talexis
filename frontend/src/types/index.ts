// Auth & User types
export type UserRole = 'student' | 'college_admin' | 'company' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

// Student types
export interface StudentProfile {
  id: number;
  user_id: number;
  branch: string;
  department: string;
  college_name: string;
  graduation_year: number;
  skills: string[];
  interests: string[];
  bio: string;
  profile_picture_url: string | null;
  resume_url: string | null;
  parsed_resume: Record<string, unknown> | null;
  baseline_score: number | null;
}

// Interview types
export type InterviewType = 'hr' | 'technical' | 'sales' | 'behavioral';
export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced';
export type InterviewStatus = 'pending' | 'in_progress' | 'completed' | 'evaluated';

export interface Interview {
  id: number;
  student_id: number;
  interview_type: InterviewType;
  difficulty_level: DifficultyLevel;
  status: InterviewStatus;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  created_at: string;
}

export interface InterviewQuestion {
  id: number;
  interview_id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  order_index: number;
}

export interface InterviewAnswer {
  id: number;
  question_id: number;
  interview_id: number;
  answer_text: string;
  submitted_at: string;
}

// Evaluation types
export interface AnswerEvaluation {
  id: number;
  answer_id: number;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  structure_score: number;
  overall_score: number;
  feedback_text: string;
  strengths: string[];
  weaknesses: string[];
  improved_answer_suggestion: string;
  risk_flags: string[];
}

// Readiness types
export type RecommendationType = 'YES' | 'MAYBE' | 'NO';

export interface PlacementReadiness {
  id: number;
  student_id: number;
  overall_readiness_percent: number;
  communication_avg: number;
  technical_avg: number;
  confidence_avg: number;
  structure_avg: number;
  weak_areas: string[];
  strong_areas: string[];
  recommendation: RecommendationType;
}

// Talent & Company types
export interface TalentProfile {
  id: number;
  candidate_code: string;
  is_visible: boolean;
  skill_scores: Record<string, number>;
  role_fit_scores: Record<string, number>;
  recommendation: RecommendationType;
  risk_indicators: string[];
}

export type ShortlistStatus = 'shortlisted' | 'contacted' | 'rejected' | 'hired';

export interface CompanyShortlist {
  id: number;
  company_id: number;
  talent_profile_id: number;
  shortlisted_at: string;
  notes: string | null;
  status: ShortlistStatus;
}

export interface Company {
  id: number;
  company_name: string;
  industry: string;
  size: string;
  website: string;
  description: string;
}

export interface JobRole {
  id: number;
  company_id: number;
  title: string;
  description: string;
  required_skills: string[];
  min_readiness_score: number;
  status: string;
}

// Learning types
export interface LearningModule {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  content_text: string;
  duration_minutes: number;
  tags: string[];
}

// Dashboard types
export interface DashboardStats {
  total_interviews: number;
  avg_score: number;
  readiness_percent: number;
  weak_areas: string[];
}
