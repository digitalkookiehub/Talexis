import api from './api';
import type { AnswerEvaluation } from '../types';

export interface ScorecardResponse {
  interview_id: number;
  interview_type: string;
  difficulty: string;
  total_score: number | null;
  evaluations: AnswerEvaluation[];
  avg_communication: number;
  avg_technical: number;
  avg_confidence: number;
  avg_structure: number;
}

export const evaluationService = {
  evaluate: (interviewId: number) =>
    api.post<AnswerEvaluation[]>(`/evaluations/evaluate/${interviewId}`).then((r) => r.data),

  getResults: (interviewId: number) =>
    api.get<AnswerEvaluation[]>(`/evaluations/${interviewId}`).then((r) => r.data),

  getScorecard: (interviewId: number) =>
    api.get<ScorecardResponse>(`/evaluations/${interviewId}/scorecard`).then((r) => r.data),
};
