import api from './api';
import type { AnswerEvaluation } from '../types';

export interface ScorecardResponse {
  interview_id: number;
  interview_type: string;
  difficulty: string;
  total_score: number | null;
  target_role: string | null;
  target_industry: string | null;
  duration_seconds: number | null;
  questions_answered: number | null;
  overall_summary: string | null;
  overall_feedback: string | null;
  evaluations: AnswerEvaluation[];
  avg_communication: number;
  avg_technical: number;
  avg_confidence: number;
  avg_structure: number;
}

export interface DetailedFeedback {
  question_text: string;
  question_topics: string[];
  answer_text: string;
  word_count: number | null;
  response_time_seconds: number | null;
  evaluation: AnswerEvaluation | null;
}

export const evaluationService = {
  evaluate: (interviewId: number) =>
    api.post<AnswerEvaluation[]>(`/evaluations/evaluate/${interviewId}`).then((r) => r.data),

  getResults: (interviewId: number) =>
    api.get<AnswerEvaluation[]>(`/evaluations/${interviewId}`).then((r) => r.data),

  getScorecard: (interviewId: number) =>
    api.get<ScorecardResponse>(`/evaluations/${interviewId}/scorecard`).then((r) => r.data),

  getDetailedFeedback: (interviewId: number) =>
    api.get<DetailedFeedback[]>(`/evaluations/${interviewId}/feedback`).then((r) => r.data),
};
